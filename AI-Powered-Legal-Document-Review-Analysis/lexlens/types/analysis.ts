export interface AnalysisResult {
  documentType?: string;
  plainSummary?: string;
  keyClauses?: Array<{ name: string; description: string }>;
  riskFlags?: Array<{ clause: string; risk: string; severity: "low" | "medium" | "high" }>;
  obligations?: string[];
  jurisdictionNote?: string;
  verdict?: "Safe" | "Review Needed" | "High Risk";
  verdictReason?: string;
  ragSources?: Array<{
    id?: string;
    source: string;
    page: number;
    content: string;
    similarity_score: number;
  }>;
}
