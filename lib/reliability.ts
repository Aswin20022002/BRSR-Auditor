import type { Audit } from "./types";

export interface ReliabilityItem {
  ok: boolean;
  label: string;
  detail: string;
}

export interface Reliability {
  level: "High" | "Medium" | "Low";
  items: ReliabilityItem[];
}

/**
 * How much to trust OUR reading of the report. This is separate from the disclosure score,
 * which says how good the company's report is. Four plain tests, level = how many pass.
 */
export function reliabilityOf(a: Audit): Reliability {
  const found = a.kpis.filter((k) => k.status === "disclosed" || k.status === "partial");
  const verified = found.filter((k) => k.evidence === "verified").length;
  const quoteOk = found.length > 0 && verified / found.length >= 0.85;

  const checked = a.kpis.filter((k) => k.xcheck === "agree" || k.xcheck === "differ");
  const agree = checked.filter((k) => k.xcheck === "agree").length;
  const crossOk = checked.length >= 3 && agree / checked.length >= 0.9;

  const brsrOk = a.brsrFound !== false;
  const nWarn = a.warnings.length;
  const completeOk = nWarn === 0;

  const items: ReliabilityItem[] = [
    { ok: quoteOk, label: "Quotes match the PDF", detail: found.length ? `${verified} of ${found.length} quoted values were found in the PDF text. Passes at 85% or more.` : "No values were found, so nothing could be checked." },
    { ok: crossOk, label: "Two models agree on the headline numbers", detail: checked.length ? `${agree} of ${checked.length} headline numbers read the same by both models. Passes at 90% or more.` : "The second model did not run. It needs both the Gemini and Grok keys." },
    { ok: brsrOk, label: "BRSR section located", detail: brsrOk ? "The report contains a clearly marked BRSR section, so the right pages were analysed." : "No clear BRSR section was found, so some KPIs may be missing only because the right pages were not read." },
    { ok: completeOk, label: "Every part of the audit completed", detail: completeOk ? "All AI steps ran without errors." : `${nWarn} part${nWarn > 1 ? "s" : ""} did not complete. See the warning above.` },
  ];
  const n = items.filter((i) => i.ok).length;
  return { level: n === 4 ? "High" : n === 3 ? "Medium" : "Low", items };
}
