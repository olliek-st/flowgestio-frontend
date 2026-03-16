export type Severity = "Low" | "Medium" | "High" | "Critical";
export type FindingLevel = "BLOCK" | "WARN";
export type SectionCode = "S2" | "S3" | "S4" | "S5" | "S6" | "S7" | "S8" | "S9";

export type FindingEvidence = {
  fields?: string[];
  refs?: string[];
  metrics?: Record<string, number | string | boolean>;
};

export type Finding = {
  id: string;
  level: FindingLevel;
  severity?: Severity;
  section: SectionCode;
  decision: string;
  phase: "MVP" | "Phase2Plus";
  title: string;
  message: string;
  evidence?: FindingEvidence;
  suggestedFix?: string;
};

export type EngineResult = {
  status: "OK" | "WARN" | "BLOCKED";
  findings: Finding[];
  summary: {
    blocks: number;
    warns: number;
    criticalWarns: number;
    sectionsBlocked: SectionCode[];
    topFindingsToAddress: string[];
  };
  sectionScores: Record<SectionCode, "OK" | "WARN" | "BLOCKED">;
  executedAt: string;
  engineVersion: string;
};
