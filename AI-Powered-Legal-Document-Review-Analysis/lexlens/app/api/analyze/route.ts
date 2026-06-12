import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { checkRateLimit } from "@/lib/rateLimit";
import { extractTextFromFile } from "@/lib/extractText";
import { spawn } from "child_process";
import path from "path";

async function queryRagStore(queryText: string, topK: number = 3): Promise<any[]> {
  return new Promise((resolve) => {
    // Resolve relative path to python interpreter from process.cwd()
    // process.cwd() is c:\Users\rohit\RAG\AI-Powered-Legal-Document-Review-Analysis\lexlens
    const pythonExe = path.join(process.cwd(), "..", "..", ".venv", "Scripts", "python.exe");
    const scriptPath = path.join(process.cwd(), "lib", "query_rag.py");

    console.log(`Executing RAG query with python: ${pythonExe}`);
    console.log(`Script path: ${scriptPath}`);

    const processSpawn = spawn(pythonExe, [scriptPath, queryText, String(topK)]);
    let stdoutData = "";
    let stderrData = "";

    processSpawn.stdout.on("data", (data) => {
      stdoutData += data.toString();
    });

    processSpawn.stderr.on("data", (data) => {
      stderrData += data.toString();
    });

    processSpawn.on("close", (code) => {
      if (code !== 0) {
        console.warn(`RAG process exited with code ${code}. Stderr: ${stderrData}`);
        resolve([]);
        return;
      }
      try {
        const jsonMatch = stdoutData.match(/\{"sources":.*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          resolve(parsed.sources || []);
        } else {
          console.warn("RAG output did not match expected JSON format:", stdoutData);
          resolve([]);
        }
      } catch (err) {
        console.warn("Failed to parse RAG stdout:", err, stdoutData);
        resolve([]);
      }
    });

    processSpawn.on("error", (err) => {
      console.warn("Failed to spawn RAG process:", err);
      resolve([]);
    });
  });
}


export async function POST(req: NextRequest) {
  try {
    // 1. Validate API Key Presence
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("Configuration Error: GEMINI_API_KEY is not defined.");
      return NextResponse.json(
        { error: "Configuration Error", details: "Gemini API key is not configured on the server." },
        { status: 500 }
      );
    }

    // Initialize GenAI client at request time to ensure key is available
    const genAI = new GoogleGenerativeAI(apiKey);

    // 2. Parse IP with multiple proxies fallback
    const ipHeader = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");
    const ip = ipHeader ? ipHeader.split(',')[0].trim() : "unknown";
    
    const limit = checkRateLimit(ip);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "rate_limit_exceeded", resetAt: limit.resetAt },
        { status: 429 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const country = formData.get("country") as string;
    const state = formData.get("state") as string;

    // 3. Validate Jurisdiction parameters
    if (!country || !state || typeof country !== "string" || typeof state !== "string" || country.trim() === "" || state.trim() === "") {
      return NextResponse.json(
        { error: "Invalid parameters", details: "Valid Country and State/Province context must be specified." },
        { status: 400 }
      );
    }

    if (!file) {
      return NextResponse.json({ error: "No file provided", details: "Please select a document to upload." }, { status: 400 });
    }

    // 4. Extract text from the document
    let text = "";
    try {
      text = await extractTextFromFile(file);
    } catch (e: any) {
      console.error("Text extraction failed:", e);
      return NextResponse.json({ error: "Failed to parse document", details: e.message || String(e) }, { status: 400 });
    }

    // 5. Validate that extracted text is not empty
    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { 
          error: "Empty document text", 
          details: "The uploaded document contains no readable text. Scanned or image-only PDFs are not supported." 
        }, 
        { status: 400 }
      );
    }

    // Truncate to roughly 8000 tokens (approx 24000 characters)
    if (text.length > 24000) {
      text = text.slice(0, 24000) + "... [Truncated for limits]";
    }

    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    // Query RAG store for relevant statutes
    let ragSources: any[] = [];
    try {
      // Use the first ~2000 chars of the text to represent the document
      const querySnippet = text.slice(0, 2000);
      ragSources = await queryRagStore(querySnippet, 3);
    } catch (ragError) {
      console.warn("RAG query failed:", ragError);
    }

    let ragContextString = "";
    if (ragSources && ragSources.length > 0) {
      ragContextString = ragSources.map((src, i) => `
      Reference Snippet #${i + 1}
      - Source Document: ${src.source} (Page ${src.page + 1})
      - Database Match Score: ${Math.round(src.similarity_score * 100)}%
      - Excerpt: "${src.content.replace(/"/g, '\\"')}"
      `).join("\n");
    }

    const prompt = `
      You are a legal document analyst. The user is in ${country}, ${state}.
      Analyze the document according to the laws and common legal practices of this jurisdiction. 
      
      ${ragContextString ? `
      We queried our database of legal statutes for your jurisdiction and found the following relevant laws.
      Use this context to inform your analysis (especially for risks, obligations, and jurisdiction notes) and cite specific acts where relevant:
      ${ragContextString}
      ` : ""}
      
      Return your response in JSON format only.

      Return a JSON object with these exact keys:
      - documentType (string)
      - plainSummary (string)
      - keyClauses (array of objects with 'name' and 'description' strings)
      - riskFlags (array of objects with 'clause', 'risk', and 'severity' strings, severity must be "low", "medium", or "high")
      - obligations (array of strings)
      - jurisdictionNote (string)
      - verdict (string, exactly one of: "Safe", "Review Needed", "High Risk")
      - verdictReason (string)
      - ragSources (array of objects, list the most relevant grounding sources that you referred to. Each object must have: 'source' (string), 'page' (number), 'content' (string), and 'similarity_score' (number). If no database snippets were found or relevant, return an empty array)

      Document Text:
      ${text}
    `;


    // Stream the response
    const result = await model.generateContentStream(prompt);
    
    // Convert the Gemini stream to a ReadableStream
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            controller.enqueue(new TextEncoder().encode(chunkText));
          }
          controller.close();
        } catch (e) {
          controller.error(e);
        }
      }
    });

    // Use text/plain since we are streaming raw JSON text chunks
    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
      }
    });

  } catch (error: any) {
    console.error("Analysis Error:", error);
    
    // Check if it's a quota/rate limit error from Gemini
    if (
      error.status === 429 || 
      (error.message && error.message.includes("429")) || 
      (error.message && error.message.toLowerCase().includes("quota"))
    ) {
      return NextResponse.json(
        { 
          error: "gemini_quota_exceeded", 
          details: "Gemini API free tier quota exceeded. Please wait a minute and try again." 
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) }, 
      { status: 500 }
    );
  }
}
