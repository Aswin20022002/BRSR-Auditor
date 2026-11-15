import { ATTRS, KPIS, KPI_BY_ID } from "./kpis";
import type { Assurance, Audit, Flag, KpiResult, RuleResult, Scores } from "./types";

export const PART_KEYS = ["completeness", "evidence", "consistency", "credibility", "assurance"] as const;
export type PartKey = (typeof PART_KEYS)[number];
export type Weights = Record<PartKey, number>;
export type KpiMode = "equal" | "importance";

export interface ScoreConfig {
  weights: Weights;
  kpiMode: KpiMode;
}

const mk = (c: number, e: number, s: number, r: number, a: number, kpiMode: KpiMode = "equal"): ScoreConfig => ({
  weights: { completeness: c, evidence: e, consistency: s, credibility: r, assurance: a },
  kpiMode,
});

export const DEFAULT_CONFIG: ScoreConfig = mk(40, 20, 15, 15, 10);
export const DEFAULT_WEIGHTS = DEFAULT_CONFIG.weights;

export const PRESETS: { id: string; label: string; note: string; config: ScoreConfig }[] = [
  { id: "default", label: "Default", note: "Coverage 40, evidence 20, consistency 15, credibility 15, assurance 10.", config: DEFAULT_CONFIG },
  { id: "equal", label: "Equal parts", note: "Every part counts 20%. Assumes no part matters more than another.", config: mk(20, 20, 20, 20, 20) },
  { id: "evidence", label: "Evidence first", note: "Traceability counts most: coverage 25, evidence 35, consistency 20, credibility 10, assurance 10.", config: mk(25, 35, 20, 10, 10) },
  { id: "importance", label: "Anchor KPIs weigh more", note: "Default part weights, but anchor KPIs count 3, optional ratios count 1 and the rest count 2.", config: mk(40, 20, 15, 15, 10, "importance") },
];

export const sameConfig = (a: ScoreConfig, b: ScoreConfig) =>
  a.kpiMode === b.kpiMode && PART_KEYS.every((k) => a.weights[k] === b.weights[k]);

/**
 * Importance tiers. The criterion is logical, not a matter of taste:
 * anchor KPIs are absolute totals that other KPIs are derived from or checked against,
 * so intensity ratios and breakdowns cannot be verified without them.
 * Optional KPIs are ratios per unit of physical output, which do not exist for every business.
 */
export const ANCHOR_IDS = ["ghg_s1", "ghg_s2", "water_withdrawal", "water_consumption", "energy_total", "waste_total", "injuries_recordable", "fatalities", "posh_total"];
export const OPTIONAL_IDS = ["ghg_int_out", "water_int_out", "energy_int_out", "waste_int_out"];

export const kpiWeight = (id: string, mode: KpiMode): number => (mode === "equal" ? 1 : ANCHOR_IDS.includes(id) ? 3 : OPTIONAL_IDS.includes(id) ? 1 : 2);

export function bandFor(score: number): Scores["band"] {
  if (score >= 80) return "Strong";
  if (score >= 65) return "Solid";
  if (score >= 45) return "Patchy";
  return "Weak";
}

export function computeScores(
  input: {
    kpis: KpiResult[];
    rules: RuleResult[];
    flags: Flag[] | null; // null when the independent review did not run
    assurance: Assurance | null;
  },
  config: ScoreConfig = DEFAULT_CONFIG,
): Scores {
  const { kpis, rules, flags, assurance } = input;
  const W = config.weights;
  const w = (id: string) => kpiWeight(id, config.kpiMode);
  const analysed = kpis.filter((k) => k.status !== "not_analysed" && k.status !== "not_applicable");

  const credit = (k: KpiResult) => (k.status === "disclosed" ? 1 : k.status === "partial" ? 0.5 : 0);
  const wTotal = analysed.reduce((s, k) => s + w(k.id), 0);
  const completeness = wTotal ? (100 * analysed.reduce((s, k) => s + w(k.id) * credit(k), 0)) / wTotal : 0;

  const present = kpis.filter((k) => k.status === "disclosed" || k.status === "partial");
  const evCredit = (k: KpiResult) => (k.evidence === "verified" ? 1 : k.evidence === "partial" ? 0.5 : 0) * (k.xcheck === "differ" ? 0.5 : 1);
  const evTotal = present.reduce((s, k) => s + w(k.id), 0);
  const evidence = evTotal ? (100 * present.reduce((s, k) => s + w(k.id) * evCredit(k), 0)) / evTotal : null;

  const tested = rules.filter((r) => r.status !== "skip");
  const fails = tested.filter((r) => r.status === "fail").length;
  const warns = tested.filter((r) => r.status === "warn").length;
  const consistency = tested.length ? Math.max(0, 100 - 18 * fails - 6 * warns) : null;

  let credibility: number | null = null;
  if (flags) {
    const h = flags.filter((f) => f.severity === "high").length;
    const m = flags.filter((f) => f.severity === "medium").length;
    const l = flags.filter((f) => f.severity === "low").length;
    credibility = Math.max(0, 100 - 15 * h - 7 * m - 2 * l);
  }

  let assuranceScore: number | null = null;
  if (assurance) {
    assuranceScore = { reasonable: 100, limited: 60, unclear: 30, none: 0 }[assurance.status];
  }

  const parts: [number | null, number][] = [
    [completeness, W.completeness],
    [evidence, W.evidence],
    [consistency, W.consistency],
    [credibility, W.credibility],
    [assuranceScore, W.assurance],
  ];
  const live = parts.filter(([v]) => v !== null) as [number, number][];
  const wsum = live.reduce((s, [, x]) => s + x, 0);
  const overall = wsum > 0 ? Math.round(live.reduce((s, [v, x]) => s + v * x, 0) / wsum) : 0;

  const attrs: Record<string, number> = {};
  for (const a of ATTRS) {
    const ks = analysed.filter((k) => KPI_BY_ID[k.id]?.attr === a.id);
    const t = ks.reduce((s, k) => s + w(k.id), 0);
    attrs[a.id] = t ? Math.round((100 * ks.reduce((s, k) => s + w(k.id) * credit(k), 0)) / t) : 0;
  }

  return {
    overall,
    band: bandFor(overall),
    completeness: Math.round(completeness),
    evidence: evidence === null ? null : Math.round(evidence),
    consistency,
    credibility,
    assurance: assuranceScore,
    attrs,
    counts: {
      disclosed: kpis.filter((k) => k.status === "disclosed").length,
      partial: kpis.filter((k) => k.status === "partial").length,
      missing: kpis.filter((k) => k.status === "not_found").length,
      na: kpis.filter((k) => k.status === "not_applicable").length,
      notAnalysed: kpis.filter((k) => k.status === "not_analysed").length,
      verified: kpis.filter((k) => (k.status === "disclosed" || k.status === "partial") && k.evidence === "verified").length,
      total: kpis.length,
    },
  };
}

/** Recomputes an audit's scores under any weighting without touching its findings. */
export function rescore(a: Audit, cfg: ScoreConfig): Scores {
  return computeScores(
    { kpis: a.kpis, rules: a.rules, flags: a.reviewRan === false ? null : a.flags, assurance: a.contextOk === false ? null : a.assurance },
    cfg,
  );
}
