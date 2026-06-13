# LexLens — PRD
**AI-Powered Legal Document Review & Analysis**
`v1.0 | Status: Draft | Author: Reesh`

---

## 1. Overview

**LexLens** is a web app where users upload legal documents and select their jurisdiction (country → state). The system parses, reviews, and delivers a structured AI analysis of the document — surfacing clauses, risks, obligations, and plain-language summaries — all through the Gemini API, scoped to the selected jurisdiction's legal context.

**Non-goals:** No login, no persistence, no lawyer-client relationship claims, no multi-doc comparison (v1).

---

## 2. Core User Flow

```
Land on homepage
  → Upload document (PDF / DOCX)
  → Select Country → Select State/Province
  → Click "Analyze"
  → View structured analysis output
  → (Optional) Download report
```

That's it. Single-session, stateless, no auth.

---

## 3. Functional Requirements

### 3.1 Document Upload
- Accepts: `.pdf`, `.docx`
- Max file size: **10 MB**
- Client-side validation before upload (type + size check)
- File is parsed server-side → raw text extracted → sent to Gemini

### 3.2 Jurisdiction Selector
- Country dropdown (curated list, not every country — start with IN, US, UK, CA, AU)
- State/Province dropdown — **dynamically populated** based on country selection
- Jurisdiction is passed as context into the Gemini prompt, not used for any routing logic
- Default: India → Madhya Pradesh (can be changed)

### 3.3 Analysis Output
The AI response is structured into these sections rendered on the frontend:

| Section | Description |
|---|---|
| **Document Type** | What kind of legal doc this is (NDA, rental agreement, employment contract, etc.) |
| **Plain Summary** | 3–5 sentence ELI5 summary of the doc |
| **Key Clauses** | Extracted named clauses with brief descriptions |
| **Risk Flags** | Clauses that could be unfavorable to the user — highlighted |
| **Obligations** | What the user is agreeing to do / not do |
| **Jurisdiction Note** | How the selected state/country law may affect specific clauses |
| **Verdict** | Overall score: Safe / Review Needed / High Risk (with reasoning) |

### 3.4 Rate Limiting
- **Per-IP rate limit:** 5 requests / hour
- Enforced at the API route level (Next.js middleware or route handler)
- Use in-memory store (simple `Map` with TTL) for v1 — no Redis needed
- On limit hit → return `429` with time-until-reset in response body
- Frontend shows a friendly cooldown message with countdown timer

### 3.5 Download Report
- "Download as PDF" button after analysis renders
- Client-side PDF generation using `jsPDF` or `html2canvas` + `jsPDF`
- No server involvement needed

---

## 4. Frontend Behavior

### 4.1 Rendering Strategy
**Next.js App Router. All analysis UI is client-side rendered (CSR).**

- Homepage (`/`) → Server Component (static, fast load, SEO metadata)
- Upload + Analysis UI → `"use client"` component
- No SSR needed for analysis output — it's dynamic per session
- No need for ISR or SSG beyond the landing page

### 4.2 State Management
Keep it flat. No Redux, no Zustand for v1.

Use **React `useState` + `useReducer`** for the upload/analysis flow:

```ts
type AppState = {
  step: 'idle' | 'uploading' | 'analyzing' | 'done' | 'error'
  file: File | null
  country: string
  state: string
  analysis: AnalysisResult | null
  error: string | null
  rateLimitReset: number | null  // unix timestamp
}
```

Single `useReducer` with an `AppState` object — clean, predictable, no prop drilling since it's one page flow.

### 4.3 Upload Behavior
- Drag-and-drop zone + click-to-browse
- Instant client-side validation feedback (wrong type / too large)
- Show file name + size after selection
- No chunked upload — single `FormData` POST to `/api/analyze`

### 4.4 Analysis Loading State
- Stream the Gemini response (see backend section)
- Render sections **progressively** as they come in — don't wait for full response
- Each section card fades in as it's received
- Show a "Analyzing with jurisdiction context..." status line while streaming

### 4.5 Error Handling (Frontend)
| Error | User-facing message |
|---|---|
| File too large | "File exceeds 10MB limit" |
| Wrong file type | "Only PDF and DOCX files supported" |
| Rate limit hit | "You've hit the limit. Try again in X minutes." + countdown |
| Gemini API failure | "Analysis failed. Please try again." |
| Parsing failure | "Couldn't read your document. Try re-exporting it." |

---

## 5. Backend Architecture

### 5.1 Stack
```
Next.js App Router
  /api/analyze   → POST route handler
  /api/health    → GET, simple uptime check

PDF parsing   → pdf-parse
DOCX parsing  → mammoth
Gemini API    → @google/generative-ai (gemini-1.5-flash, free tier)
Rate limiting → In-memory Map (no external dep)
```

### 5.2 `/api/analyze` Flow

```
1. Parse multipart FormData → extract file + country + state
2. Validate file (type, size)
3. Check rate limit (by IP)
4. Extract text from file (pdf-parse or mammoth)
5. Truncate text if > 8000 tokens (Gemini free tier safe zone)
6. Build prompt (see 5.3)
7. Call Gemini with streaming enabled
8. Stream structured response back to client as SSE / ReadableStream
9. Client parses and renders progressively
```

### 5.3 Gemini Prompt Design

```
System context:
  You are a legal document analyst. The user is in [COUNTRY], [STATE].
  Analyze the document according to the laws and common legal practices
  of this jurisdiction. Return your response in JSON format only.

User message:
  [EXTRACTED_DOCUMENT_TEXT]

  Return a JSON object with these exact keys:
  documentType, plainSummary, keyClauses (array), riskFlags (array),
  obligations (array), jurisdictionNote, verdict (Safe | Review Needed | High Risk),
  verdictReason
```

- Model: `gemini-1.5-flash` (free tier, 15 RPM, 1M TPM)
- JSON mode via response schema or prompt enforcement
- Parse JSON on client after stream completes, then render sections

### 5.4 Rate Limiting Implementation

```ts
// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): { allowed: boolean; resetAt?: number } {
  const now = Date.now()
  const window = 60 * 60 * 1000  // 1 hour in ms
  const limit = 5

  const entry = rateLimitMap.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + window })
    return { allowed: true }
  }

  if (entry.count >= limit) {
    return { allowed: false, resetAt: entry.resetAt }
  }

  entry.count++
  return { allowed: true }
}
```

> Note: This resets on server restart. Fine for v1. Upgrade to Redis/Upstash for production.

### 5.5 Text Extraction

```ts
// PDF
import pdfParse from 'pdf-parse'
const text = (await pdfParse(buffer)).text

// DOCX
import mammoth from 'mammoth'
const text = (await mammoth.extractRawText({ buffer })).value
```

Truncate at ~6000 words before sending to Gemini to stay within token limits.

---

## 6. API Contract

### `POST /api/analyze`

**Request:** `multipart/form-data`
```
file     : File (PDF or DOCX, max 10MB)
country  : string ("India", "United States", ...)
state    : string ("Madhya Pradesh", "California", ...)
```

**Response (success):** `text/event-stream` or `application/json`
```json
{
  "documentType": "Non-Disclosure Agreement",
  "plainSummary": "...",
  "keyClauses": [
    { "name": "Confidentiality Period", "description": "..." }
  ],
  "riskFlags": [
    { "clause": "Indemnification", "risk": "Broad liability placed on you", "severity": "high" }
  ],
  "obligations": ["Cannot share info for 2 years", "Must notify of breaches within 48hrs"],
  "jurisdictionNote": "Under MP contract law, clause 7 may not be enforceable without...",
  "verdict": "Review Needed",
  "verdictReason": "Two high-risk clauses require attention before signing."
}
```

**Response (rate limited):** `429`
```json
{
  "error": "rate_limit_exceeded",
  "resetAt": 1718000000000
}
```

---

## 7. Project Structure

```
lexlens/
├── app/
│   ├── page.tsx                 # Landing + upload UI (client component)
│   ├── layout.tsx
│   └── api/
│       ├── analyze/route.ts     # Core analysis endpoint
│       └── health/route.ts
├── components/
│   ├── UploadZone.tsx
│   ├── JurisdictionSelector.tsx
│   ├── AnalysisResult.tsx       # Renders all sections
│   ├── RiskBadge.tsx
│   └── VerdictCard.tsx
├── lib/
│   ├── rateLimit.ts
│   ├── extractText.ts           # pdf + docx parsing
│   ├── buildPrompt.ts
│   └── jurisdictions.ts         # Country → state data
├── types/
│   └── analysis.ts              # AnalysisResult type
└── .env.local
    GEMINI_API_KEY=...
```

---

## 8. Env & Config

```env
GEMINI_API_KEY=your_key_here
RATE_LIMIT_MAX=5
RATE_LIMIT_WINDOW_MS=3600000
MAX_FILE_SIZE_MB=10
```

---

## 9. Constraints & Limits

| Constraint | Limit | Reason |
|---|---|---|
| File size | 10 MB | Gemini token limits + free tier |
| Text sent to Gemini | ~6000 words | ~8K token safe zone |
| Requests per IP | 5 / hour | Gemini free tier (15 RPM globally) |
| Supported file types | PDF, DOCX only | Clean text extraction |
| Supported countries | 5 (v1) | Curated jurisdiction accuracy |

---

## 10. Out of Scope (v1)

- User auth / saved history
- Multi-document comparison
- Clause editing or redlining
- Legal advice disclaimer enforcement (just add a static banner)
- Mobile app
- Any non-English documents

---

## 11. Tech Stack Summary

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 14 App Router | File-based routing, API routes, easy deploy |
| LLM | Gemini 1.5 Flash | Free tier, fast, long context |
| PDF parsing | `pdf-parse` | Lightweight, no native deps |
| DOCX parsing | `mammoth` | Best raw text extraction for DOCX |
| PDF export | `jsPDF` + `html2canvas` | Client-side, no server cost |
| State | `useReducer` | Simple flow, one page |
| Styling | Tailwind CSS | Fast, no overhead |
| Deployment | Vercel | Zero-config Next.js |

---

## 12. Success Metrics (v1 Launch)

- Analysis completes in < 15 seconds end-to-end
- Correct document type identified in > 90% of test cases
- Zero cost overruns on Gemini free tier under normal usage
- Rate limiter prevents abuse without false positives

---

*LexLens — Read the fine print so you don't have to.*
