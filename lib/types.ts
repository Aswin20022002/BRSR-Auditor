export type Status = "disclosed" | "partial" | "not_found" | "not_applicable" | "not_analysed";
export type Evidence = "verified" | "partial" | "unverified" | "none";
export type Severity = "high" | "medium" | "low";

export interface KpiResult {
  id: string;
  status: Status;
  value: string | null;
  numeric: number | null;
  unit: string | null;
  year: string | null;
  page: number | null;
  quote: string | null;
  note: string | null;
  evidence: Evidence;
  prev_value?: string | null;
  prev_numeric?: number | null;
  /** Second model re-read of the same number: agree, differ, or not checked */
  xcheck?: "agree" | "differ" | "unchecked";
  xvalue?: string | null;
}

export interface Meta {
  company: string | null;
  cin: string | null;
  fy: string | null;
  sector: string | null;
  turnover_cr: number | null;
  employees_total: number | null;
  female_employees_pct: number | null;
  scope: string | null;
}

export interface Assurance {
  status: "reasonable" | "limited" | "none" | "unclear";
  provider: string | null;
  standard: string | null;
  scope: string | null;
  page: number | null;
  quote: string | null;
  evidence: Evidence;
}

export interface Claim {
  claim: string;
  type: string;
  has_number: boolean;
  has_baseline: boolean;
  has_deadline: boolean;
  page: number | null;
  quote: string | null;
  evidence: Evidence;
  rating?: "backed" | "partly_backed" | "unsupported" | "vague";
  reason?: string;
}

export interface Flag {
  id: string;
  severity: Severity;
  category: string;
  title: string;
  explanation: string;
  quote: string | null;
  page: number | null;
  evidence: Evidence;
  kpi_ids: string[];
  suggestion: string;
}

export interface Fix {
  action: string;
  why: string;
  kpi_ids: string[];
  effort: "low" | "medium" | "high";
  impact: "low" | "medium" | "high";
}

export interface RuleResult {
  id: string;
  title: string;
  status: "pass" | "warn" | "fail" | "skip";
  detail: string;
  kpis: string[];
}

export interface Scores {
  overall: number;
  band: "Strong" | "Solid" | "Patchy" | "Weak";
  completeness: number;
  evidence: number | null;
  consistency: number | null;
  credibility: number | null;
  assurance: number | null;
  attrs: Record<string, number>;
  counts: { disclosed: number; partial: number; missing: number; na: number; notAnalysed: number; verified: number; total: number };
}

export interface Audit {
  id: string;
  createdAt: string;
  fileName: string;
  numPages: number;
  usedPages: number;
  demo: boolean;
  models: { extract: string; review: string; cross?: string };
  meta: Meta;
  assurance: Assurance;
  kpis: KpiResult[];
  claims: Claim[];
  rules: RuleResult[];
  flags: Flag[];
  fixes: Fix[];
  verdict: string;
  strengths: string[];
  scores: Scores;
  warnings: string[];
  /** Whether the independent review and the company facts step produced results, and whether a BRSR section was located */
  reviewRan?: boolean;
  contextOk?: boolean;
  brsrFound?: boolean;
}
