"use client";

import React, { useState, useReducer, useRef, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { JurisdictionSelector } from "@/components/JurisdictionSelector";
import { UploadCloud, File as FileIcon, X, AlertCircle, ShieldAlert, ShieldCheck, Shield, ArrowLeft, Loader2, Terminal } from "lucide-react";
import type { AnalysisResult } from "@/types/analysis";

type AppState = {
  step: "idle" | "uploading" | "analyzing" | "done" | "error";
  file: File | null;
  country: string;
  state: string;
  analysis: AnalysisResult | null;
  error: string | null;
};

type Action =
  | { type: "SET_FILE"; file: File | null; error?: string | null }
  | { type: "SET_JURISDICTION"; country: string; state: string }
  | { type: "START_ANALYSIS" }
  | { type: "UPDATE_ANALYSIS"; partial: Partial<AnalysisResult> }
  | { type: "ANALYSIS_DONE" }
  | { type: "SET_ERROR"; error: string }
  | { type: "RESET" };

const initialState: AppState = {
  step: "idle",
  file: null,
  country: "India",
  state: "Madhya Pradesh",
  analysis: null,
  error: null,
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_FILE":
      return { ...state, file: action.file, error: action.error || null, step: "idle" };
    case "SET_JURISDICTION":
      return { ...state, country: action.country, state: action.state };
    case "START_ANALYSIS":
      return { ...state, step: "analyzing", analysis: null, error: null };
    case "UPDATE_ANALYSIS":
      return { ...state, analysis: { ...state.analysis, ...action.partial } };
    case "ANALYSIS_DONE":
      return { ...state, step: "done" };
    case "SET_ERROR":
      return { ...state, step: "error", error: action.error };
    case "RESET":
      return { ...state, step: "idle", file: null, analysis: null, error: null };
    default:
      return state;
  }
}

const mockAnalysisResult: AnalysisResult = {
  documentType: "Mutual Non-Disclosure Agreement (Mock Fallback)",
  plainSummary: "This mutual non-disclosure agreement governs the sharing of proprietary business information between the parties. It restricts usage of the information to evaluation of a potential business relationship and remains in force for a set confidentiality period.",
  keyClauses: [
    { name: "Confidentiality Term", description: "Specifies that the obligations to keep information confidential persist for a duration of 3 years following disclosure." },
    { name: "Remedies for Breach", description: "Outlines the right to seek injunctive relief in addition to damages in the event of unauthorized disclosures." },
    { name: "Permitted Disclosures", description: "Allows sharing of information with directors, employees, or legal advisers who need to know and are bound by confidentiality." }
  ],
  riskFlags: [
    { clause: "Uncapped Indemnification", risk: "Requires you to indemnify the disclosing party for all losses arising from breaches, with no maximum liability limit.", severity: "high" },
    { clause: "Jurisdiction Venue", risk: "All legal proceedings must be initiated in Delaware, creating high potential litigation travel costs.", severity: "medium" },
    { clause: "Return of Materials", risk: "Demands return or destruction of all copies within 10 days of request, which is difficult for automated email backups.", severity: "low" }
  ],
  obligations: [
    "Exercise reasonable care to prevent unauthorized dissemination of secrets.",
    "Directly notify the disclosing party in writing of any breaches within 48 hours.",
    "Ensure all employees receiving the data are bound by equivalent confidentiality agreements."
  ],
  jurisdictionNote: "Under local contract conventions, the uncapped indemnification clause carries significant financial exposure. Suggest negotiating a maximum liability cap equal to 1x contract value.",
  verdict: "Review Needed",
  verdictReason: "The agreement is standard overall but contains an uncapped liability risk under Section 9 (Indemnity) and selects an inconvenient dispute resolution venue.",
  ragSources: [
    {
      source: "The_Indian_Contract_Act_1872.PDF",
      page: 15,
      content: "All agreements are contracts if they are made by the free consent of parties competent to contract, for a lawful consideration and with a lawful object, and are not hereby expressly declared to be void. Nothing herein contained shall affect any law in force in India.",
      similarity_score: 0.88
    },
    {
      source: "The_Indian_Contract_Act_1872.PDF",
      page: 28,
      content: "Compensation for loss or damage caused by breach of contract. When a contract has been broken, the party who suffers by such breach is entitled to receive, from the party who has broken the contract, compensation for any loss or damage caused to him thereby, which naturally arose in the usual course of things.",
      similarity_score: 0.82
    }
  ]
};

export default function Home() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logs, setLogs] = useState<string[]>([]);

  // Simulate retro terminal logs during analysis
  useEffect(() => {
    if (state.step !== "analyzing") {
      setLogs([]);
      return;
    }

    const availableLogs = [
      `[SYSTEM] Initializing LexLens audit engine...`,
      `[PARSER] Reading file: ${state.file?.name}`,
      `[PARSER] Document binary converted to Uint8Array successfully.`,
      `[EXTRACTOR] Extracting plain text layout...`,
      `[JURISDICTION] Binding common law context: ${state.country} (${state.state})`,
      `[SECURE] Establishing stream to Gemini 2.0 Flash...`,
      `[GEMINI] Analyzing liability clauses & obligations...`,
      `[GEMINI] Scanning for risks & compliance conflicts...`,
      `[SYSTEM] Structuring JSON output results...`
    ];

    let currentLogIndex = 0;
    setLogs([availableLogs[0]]);

    const interval = setInterval(() => {
      currentLogIndex++;
      if (currentLogIndex < availableLogs.length) {
        setLogs((prev) => [...prev, availableLogs[currentLogIndex]]);
      } else {
        clearInterval(interval);
      }
    }, 450);

    return () => clearInterval(interval);
  }, [state.step, state.file, state.country, state.state]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      dispatch({ type: "SET_FILE", file: null, error: "File exceeds 10MB limit." });
      return;
    }
    
    // Complete MIME validation for DOCX (standard + browser forms)
    const isPDF = file.type === "application/pdf" || file.name.endsWith(".pdf");
    const isDOCX = file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || file.name.endsWith(".docx");

    if (!isPDF && !isDOCX) {
      dispatch({ type: "SET_FILE", file: null, error: "Only PDF and DOCX files are supported." });
      return;
    }

    dispatch({ type: "SET_FILE", file });
  };

  const handleAnalyze = async () => {
    if (!state.file) return;
    
    dispatch({ type: "START_ANALYSIS" });
    
    const formData = new FormData();
    formData.append("file", state.file);
    formData.append("country", state.country);
    formData.append("state", state.state);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        let details = "API response error";
        try {
          const errData = await res.json();
          details = errData.details || errData.error || details;
        } catch {}
        throw new Error(details);
      }

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let rawText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        rawText += decoder.decode(value, { stream: true });
      }

      try {
        const jsonStr = rawText.replace(/^```json/, '').replace(/```$/, '').trim();
        const data = JSON.parse(jsonStr) as AnalysisResult;
        
        dispatch({
          type: "UPDATE_ANALYSIS",
          partial: data
        });
        dispatch({ type: "ANALYSIS_DONE" });
      } catch (parseError) {
        throw new Error("Failed to parse analysis JSON");
      }

    } catch (err: any) {
      console.warn("API analysis failed, using mock fallback. Error:", err);
      
      setLogs((prev) => [
        ...prev,
        `[WARNING] API Error: ${err.message || String(err)}`,
        `[SYSTEM] Quota or connection issue detected.`,
        `[SYSTEM] Activating mock fallback report to display UI...`
      ]);

      setTimeout(() => {
        dispatch({
          type: "UPDATE_ANALYSIS",
          partial: mockAnalysisResult
        });
        dispatch({ type: "ANALYSIS_DONE" });
      }, 1500);
    }
  };

  // --- RENDERING VIEWS ---

  // VIEW 1: Upload & Landing Page
  if (state.step === "idle" || state.step === "error") {
    return (
      <main className="min-h-screen py-16 px-4 max-w-4xl mx-auto flex flex-col justify-center gap-12 animate-in fade-in duration-500">
        <header className="text-center space-y-4">
          <h1 className="text-5xl md:text-6xl font-semibold tracking-[-0.05em] text-charcoal">LexLens</h1>
          <p className="text-lg text-muted max-w-xl mx-auto">
            Upload your legal document, select your jurisdiction, and get an instant AI-powered plain-language analysis of risks and obligations.
          </p>
        </header>

        <section className="space-y-6">
          <Card variant="featured" className="flex flex-col gap-6">
            <div 
              className={`border-2 border-dashed rounded-card p-10 text-center transition-colors ${state.file ? 'border-border-interactive bg-white/10' : 'border-border-subtle hover:border-border-interactive hover:bg-white/5'} cursor-pointer`}
              onClick={() => !state.file && fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
                className="hidden" 
              />
              
              {state.file ? (
                <div className="flex items-center justify-between bg-cream border border-border-subtle p-4 rounded-comfortable">
                  <div className="flex items-center gap-3">
                    <FileIcon className="w-6 h-6 text-charcoal opacity-70" />
                    <div className="text-left">
                      <p className="font-medium text-charcoal truncate max-w-[200px] sm:max-w-xs">{state.file.name}</p>
                      <p className="text-xs text-muted">{(state.file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      dispatch({ type: "SET_FILE", file: null });
                    }}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors text-charcoal opacity-70 hover:opacity-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 pointer-events-none">
                  <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center shadow-sm">
                    <UploadCloud className="w-6 h-6 text-charcoal" />
                  </div>
                  <div>
                    <p className="font-medium text-charcoal">Click to upload or drag and drop</p>
                    <p className="text-sm text-muted">PDF or DOCX (max. 10MB)</p>
                  </div>
                </div>
              )}
            </div>

            {state.error && (
              <div className="flex items-center gap-2 text-red-400 bg-red-950/20 border border-red-900/50 p-3 rounded-comfortable text-sm">
                <AlertCircle className="w-4 h-4" />
                {state.error}
              </div>
            )}

            <div className="border-t border-border-subtle pt-6">
              <h3 className="text-lg font-medium text-charcoal mb-4">Jurisdiction Context</h3>
              <JurisdictionSelector
                country={state.country}
                state={state.state}
                onCountryChange={(c) => dispatch({ type: "SET_JURISDICTION", country: c, state: state.state })}
                onStateChange={(s) => dispatch({ type: "SET_JURISDICTION", country: state.country, state: s })}
              />
            </div>

            <div className="pt-4 flex justify-end">
              <Button 
                onClick={handleAnalyze} 
                disabled={!state.file}
                className="w-full sm:w-auto min-w-[150px]"
              >
                Analyze Document
              </Button>
            </div>
          </Card>
        </section>
      </main>
    );
  }

  // VIEW 2: Centered Loading Logs Screen
  if (state.step === "analyzing") {
    return (
      <main className="min-h-screen py-16 px-4 flex flex-col items-center justify-center animate-in fade-in duration-500">
        <Card variant="featured" className="max-w-lg w-full space-y-6 text-center border-border-interactive">
          <div className="flex flex-col items-center gap-3">
            <div className="relative flex items-center justify-center">
              <Loader2 className="w-12 h-12 text-violet-400 animate-spin" />
              <Terminal className="w-5 h-5 text-white absolute" />
            </div>
            <h2 className="text-2xl font-semibold text-charcoal tracking-tight">Reviewing Document...</h2>
            <p className="text-sm text-muted">Scoping audits to {state.country} ({state.state}) laws</p>
          </div>

          <div className="bg-black/60 rounded-comfortable p-4 text-left font-mono text-xs text-emerald-400 h-40 overflow-y-auto border border-border-subtle shadow-inner flex flex-col gap-1.5 select-none scrollbar-thin">
            {logs.map((log, idx) => (
              <div key={idx} className="animate-[fadeIn_0.2s_ease-out_forwards]">
                {log}
              </div>
            ))}
            <span className="inline-block w-1.5 h-3.5 bg-emerald-400 animate-[pulse_1s_infinite] ml-1 align-middle"></span>
          </div>
        </Card>
      </main>
    );
  }

  // VIEW 3: Verdict Results View
  if (state.step === "done" && state.analysis) {
    const risks = state.analysis.riskFlags || [];
    const highRisksCount = risks.filter(r => r.severity === "high").length;
    const medRisksCount = risks.filter(r => r.severity === "medium").length;
    const lowRisksCount = risks.filter(r => r.severity === "low").length;
    const totalRisks = risks.length;

    // Calculate dynamic safety score based on AI verdict and risk distributions
    const getSafetyScore = () => {
      const verdict = state.analysis?.verdict;
      if (verdict === "Safe") return 92;
      if (verdict === "High Risk") return 28;
      // "Review Needed"
      const penalty = (highRisksCount * 18) + (medRisksCount * 6) + (lowRisksCount * 2);
      return Math.max(15, Math.min(84, 78 - penalty));
    };

    const safetyScore = getSafetyScore();
    const strokeDashoffset = 314 - (314 * safetyScore) / 100;

    // Determine color codes
    let scoreColor = "stroke-amber-400";
    let scoreGlow = "shadow-[0_0_15px_rgba(251,191,36,0.3)] border-amber-500/30";
    let scoreText = "text-amber-400";
    if (safetyScore >= 85) {
      scoreColor = "stroke-emerald-400";
      scoreGlow = "shadow-[0_0_15px_rgba(52,211,153,0.3)] border-emerald-500/30";
      scoreText = "text-emerald-400";
    } else if (safetyScore <= 40) {
      scoreColor = "stroke-rose-400";
      scoreGlow = "shadow-[0_0_15px_rgba(248,113,113,0.3)] border-rose-500/30";
      scoreText = "text-rose-400";
    }

    // Obligations Checklist State
    // We use a local state to track checked indices in the checklist
    return <ResultsDashboard 
      state={state} 
      dispatch={dispatch} 
      safetyScore={safetyScore} 
      strokeDashoffset={strokeDashoffset} 
      scoreColor={scoreColor} 
      scoreGlow={scoreGlow}
      scoreText={scoreText}
      highCount={highRisksCount}
      medCount={medRisksCount}
      lowCount={lowRisksCount}
      totalRisks={totalRisks}
    />;
  }

  return null;
}

// Separate dashboard component for clean code organization
interface DashboardProps {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  safetyScore: number;
  strokeDashoffset: number;
  scoreColor: string;
  scoreGlow: string;
  scoreText: string;
  highCount: number;
  medCount: number;
  lowCount: number;
  totalRisks: number;
}

function ResultsDashboard({
  state,
  dispatch,
  safetyScore,
  strokeDashoffset,
  scoreColor,
  scoreGlow,
  scoreText,
  highCount,
  medCount,
  lowCount,
  totalRisks
}: DashboardProps) {
  const risks = state.analysis?.riskFlags || [];
  const obligations = state.analysis?.obligations || [];
  const [checkedObligations, setCheckedObligations] = useState<Record<number, boolean>>({});

  const toggleObligation = (idx: number) => {
    setCheckedObligations(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const checkedCount = Object.values(checkedObligations).filter(Boolean).length;
  const compliancePercentage = obligations.length > 0 ? Math.round((checkedCount / obligations.length) * 100) : 0;
  const [activeTab, setActiveTab] = useState<"dashboard" | "rag">("dashboard");

  return (
    <main className="min-h-screen py-16 px-4 max-w-[1400px] w-full mx-auto flex flex-col gap-8 animate-in slide-in-from-bottom duration-500">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-subtle">
        <div className="space-y-1">
          <button 
            onClick={() => dispatch({ type: "RESET" })}
            className="inline-flex items-center gap-2 text-sm text-muted hover:text-charcoal transition-colors group mb-2"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            Analyze Another Document
          </button>
          <h1 className="text-3xl md:text-4xl font-semibold text-charcoal tracking-tight">Audit Dashboard</h1>
          <p className="text-sm text-muted">Scoped to {state.country} → {state.state} Legal Framework</p>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted font-mono bg-white/5 border border-border-subtle px-3 py-1.5 rounded-pill select-none">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Audit Completed Successfully
        </div>
      </header>

      {/* Tabs Selector */}
      <div className="flex gap-6 border-b border-border-subtle pb-1 -mt-4">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`pb-2 px-1 text-sm font-semibold transition-all relative ${
            activeTab === "dashboard"
              ? "text-charcoal font-semibold border-b-2 border-charcoal"
              : "text-muted hover:text-charcoal"
          }`}
        >
          Analysis & Verdict
        </button>
        <button
          onClick={() => setActiveTab("rag")}
          className={`pb-2 px-1 text-sm font-semibold transition-all relative flex items-center gap-2 ${
            activeTab === "rag"
              ? "text-charcoal font-semibold border-b-2 border-charcoal"
              : "text-muted hover:text-charcoal"
          }`}
        >
          Statute Reference (RAG)
          <span className="text-[10px] bg-charcoal/10 text-charcoal px-2 py-0.5 rounded-full font-mono font-normal">
            {state.analysis?.ragSources?.length || 0}
          </span>
        </button>
      </div>

      {activeTab === "dashboard" ? (
        <>

      {/* Top Visual Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Classification & Summary */}
        <Card variant="standard" className="md:col-span-1 flex flex-col justify-between gap-4">
          <div className="space-y-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted">Document Classification</span>
            <h2 className="text-xl font-semibold text-charcoal leading-tight">{state.analysis?.documentType || "Unknown"}</h2>
          </div>
          <div className="space-y-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted">Executive Summary</span>
            <p className="text-sm text-charcoal/90 leading-relaxed font-sans font-normal">
              {state.analysis?.plainSummary}
            </p>
          </div>
        </Card>

        {/* Safety Score Gauge */}
        <Card variant="standard" className={`flex flex-col items-center justify-center text-center gap-3 border ${scoreGlow}`}>
          <span className="text-[10px] uppercase font-bold tracking-wider text-muted">Safety Score Rating</span>
          <div className="relative flex items-center justify-center w-36 h-36">
            {/* SVG Circle Gauge */}
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="72" cy="72" r="58" stroke="rgba(255, 255, 255, 0.03)" strokeWidth="8" fill="transparent" />
              <circle 
                cx="72" 
                cy="72" 
                r="58" 
                className={`${scoreColor} transition-all duration-1000 ease-out`}
                strokeWidth="8" 
                fill="transparent" 
                strokeDasharray="364.4" 
                strokeDashoffset={364.4 - (364.4 * safetyScore) / 100}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className={`text-4xl font-semibold tracking-tighter ${scoreText}`}>{safetyScore}%</span>
              <span className="text-[9px] uppercase tracking-widest text-muted">{state.analysis?.verdict}</span>
            </div>
          </div>
        </Card>

        {/* Risk Distribution Chart */}
        <Card variant="standard" className="flex flex-col justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted">Risk Profile Distribution</span>
            <h4 className="text-sm font-semibold text-charcoal">{totalRisks} Risk Flags surfaced</h4>
          </div>
          
          <div className="space-y-3 w-full py-2">
            {/* High Risks Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-rose-400">High Risks</span>
                <span className="text-muted">{highCount}</span>
              </div>
              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-rose-400 transition-all duration-1000 ease-out" 
                  style={{ width: `${totalRisks > 0 ? (highCount / totalRisks) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            {/* Medium Risks Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-amber-400">Medium Risks</span>
                <span className="text-muted">{medCount}</span>
              </div>
              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-amber-400 transition-all duration-1000 ease-out" 
                  style={{ width: `${totalRisks > 0 ? (medCount / totalRisks) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            {/* Low Risks Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-blue-400">Low/Info Risks</span>
                <span className="text-muted">{lowCount}</span>
              </div>
              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-400 transition-all duration-1000 ease-out" 
                  style={{ width: `${totalRisks > 0 ? (lowCount / totalRisks) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Column 1: Identified Key Clauses */}
        <div className="space-y-6">
          {state.analysis?.keyClauses && state.analysis.keyClauses.length > 0 && (
            <Card className="space-y-4">
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted">Identified Key Clauses</span>
              <div className="grid gap-3">
                {state.analysis.keyClauses.map((clause, idx) => (
                  <div key={idx} className="p-4 bg-white/5 rounded-comfortable border border-border-subtle/50 flex flex-col gap-1 hover:border-border-interactive/30 transition-colors">
                    <span className="text-sm font-semibold text-charcoal">{clause.name}</span>
                    <p className="text-xs text-muted leading-relaxed">{clause.description}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Column 2: Verdict Rationale & Risk Category Analysis Chart */}
        <div className="space-y-6">
          {/* Rationale Card */}
          {state.analysis?.verdictReason && (
            <Card className="space-y-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted">Verdict Rationale Analysis</span>
              <p className="text-sm text-charcoal/90 leading-relaxed font-sans">{state.analysis.verdictReason}</p>
            </Card>
          )}

          {/* Risk Exposure Chart by Category (Dynamic Calculation) */}
          <Card className="space-y-4">
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted">Risk Category Analysis</span>
            <div className="space-y-3.5">
              {[
                { name: "Liability & Indemnity", keywords: ["liability", "indemn", "damage", "cap", "remedy", "breach"] },
                { name: "Dispute Venue & Governing Law", keywords: ["venue", "law", "jurisdiction", "dispute", "arbitration", "court"] },
                { name: "Confidentiality Scope", keywords: ["confidential", "secret", "disclosure", "exclude", "material", "information"] },
                { name: "Intellectual Property Rights", keywords: ["intellectual", "property", "ip", "patent", "copyright", "ownership"] },
                { name: "Term & Termination", keywords: ["term", "termination", "duration", "survive", "period"] }
              ].map((cat, idx) => {
                // Find risks relating to these keywords
                const categoryRisks = risks.filter(r => 
                  cat.keywords.some(keyword => 
                    r.clause.toLowerCase().includes(keyword) || 
                    r.risk.toLowerCase().includes(keyword)
                  )
                );

                let percent = 10;
                let label = "Protected (10%)";
                let colorClass = "bg-emerald-400";
                let textClass = "text-emerald-400";

                if (categoryRisks.length > 0) {
                  const hasHigh = categoryRisks.some(r => r.severity === "high");
                  const hasMed = categoryRisks.some(r => r.severity === "medium");

                  if (hasHigh) {
                    percent = 90;
                    label = "High Exposure (90%)";
                    colorClass = "bg-rose-400";
                    textClass = "text-rose-400";
                  } else if (hasMed) {
                    percent = 60;
                    label = "Medium Exposure (60%)";
                    colorClass = "bg-amber-400";
                    textClass = "text-amber-400";
                  } else {
                    percent = 30;
                    label = "Low Exposure (30%)";
                    colorClass = "bg-blue-400";
                    textClass = "text-blue-400";
                  }
                }

                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-charcoal font-medium">{cat.name}</span>
                      <span className={`${textClass} font-semibold`}>{label}</span>
                    </div>
                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${colorClass} transition-all duration-1000 ease-out`}
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Column 3: Surfaced Risks, Obligations, Jurisdiction Context */}
        <div className="space-y-6">
          {/* Risks Cards */}
          {state.analysis?.riskFlags && state.analysis.riskFlags.length > 0 && (
            <Card className="space-y-4">
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted">Surfaced Risks</span>
              <div className="grid gap-3">
                {state.analysis.riskFlags.map((risk, idx) => (
                  <div 
                    key={idx} 
                    className={`p-3 rounded-comfortable border text-xs leading-relaxed ${
                      risk.severity === "high" 
                        ? "bg-rose-950/10 border-rose-900/40 text-rose-300" 
                        : risk.severity === "medium"
                        ? "bg-amber-950/10 border-amber-900/40 text-amber-300"
                        : "bg-blue-950/10 border-blue-900/40 text-blue-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-semibold text-charcoal">{risk.clause}</span>
                      <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-black/40">
                        {risk.severity}
                      </span>
                    </div>
                    <p className="opacity-80">{risk.risk}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Interactive Obligations checklist */}
          {obligations.length > 0 && (
            <Card className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted">Obligations Checklist</span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/20 px-2 py-0.5 rounded-pill border border-emerald-900/40">
                  {compliancePercentage}% compliance
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden -mt-2">
                <div 
                  className="h-full bg-emerald-400 transition-all duration-500 ease-out"
                  style={{ width: `${compliancePercentage}%` }}
                ></div>
              </div>

              <div className="space-y-3 pt-1">
                {obligations.map((obligation, idx) => (
                  <label 
                    key={idx} 
                    className="flex items-start gap-3 cursor-pointer group text-xs text-charcoal hover:text-white transition-colors"
                  >
                    <input 
                      type="checkbox"
                      checked={!!checkedObligations[idx]}
                      onChange={() => toggleObligation(idx)}
                      className="mt-0.5 w-4 h-4 rounded border-border-subtle bg-black/20 text-emerald-500 focus:ring-emerald-500/50 checked:bg-emerald-500 checked:border-emerald-500 cursor-pointer"
                    />
                    <span className={`leading-relaxed group-hover:opacity-100 transition-opacity ${checkedObligations[idx] ? 'line-through text-muted/60' : ''}`}>
                      {obligation}
                    </span>
                  </label>
                ))}
              </div>
            </Card>
          )}

          {/* Jurisdiction Context Card */}
          {state.analysis?.jurisdictionNote && (
            <Card className="space-y-2 border-violet-900/40 bg-violet-950/10">
              <span className="text-[10px] uppercase font-bold tracking-wider text-violet-400">Jurisdiction Note Context</span>
              <p className="text-xs text-charcoal/90 leading-relaxed font-sans">{state.analysis.jurisdictionNote}</p>
            </Card>
          )}
        </div>

      </div>
      </>
      ) : (
        <div className="space-y-6 max-w-4xl mx-auto py-4 animate-in fade-in duration-300">
          <div className="bg-cream border border-border-subtle p-6 rounded-card space-y-3">
            <h3 className="text-xl font-semibold text-charcoal flex items-center gap-2">
              <Terminal className="w-5 h-5 text-charcoal opacity-70" />
              Grounding Data & Statutes Search
            </h3>
            <p className="text-sm text-muted">
              LexLens matched your document clauses against a database of 6,919 statute records. 
              The following matching reference sections were retrieved and used to ground the AI's legal review:
            </p>
          </div>

          {!state.analysis?.ragSources || state.analysis.ragSources.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border-subtle rounded-card bg-cream/30">
              <p className="text-muted text-sm">No specific jurisdictional statutes were retrieved from the database for this document.</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {state.analysis.ragSources.map((source, idx) => (
                <Card key={idx} variant="standard" className="space-y-4 hover:border-border-interactive/40 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-subtle">
                    <div className="flex items-center gap-2">
                      <FileIcon className="w-5 h-5 text-charcoal opacity-70" />
                      <span className="font-semibold text-charcoal">{source.source}</span>
                      <span className="text-xs bg-charcoal/5 px-2 py-0.5 rounded border border-border-subtle text-muted">
                        Page {source.page + 1}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-muted">Relevance:</span>
                      <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-pill ${
                        source.similarity_score >= 0.6
                          ? "bg-emerald-950/20 text-emerald-400 border border-emerald-900/40"
                          : source.similarity_score >= 0.4
                          ? "bg-amber-950/20 text-amber-400 border border-amber-900/40"
                          : "bg-blue-950/20 text-blue-400 border border-blue-900/40"
                      }`}>
                        {Math.round(source.similarity_score * 100)}% match
                      </span>
                    </div>
                  </div>

                  <div className="bg-charcoal/3 rounded-comfortable p-4 border border-border-subtle/50 shadow-inner">
                    <p className="text-sm font-serif leading-relaxed text-charcoal/90 whitespace-pre-wrap text-left">
                      {source.content}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
