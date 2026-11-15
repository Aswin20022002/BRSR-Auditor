import { KPIS, kpisForGroup } from "./kpis";
import { postJson } from "./api";
import type { PdfDoc } from "./pdf";
import { findBrsrZone, selectPages, type SelectGroup } from "./select";
import { makeVerifier, type Verifier } from "./verify";
import { runRules } from "./rules";
import { computeScores } from "./score";
import type { Assurance, Audit, Claim, Fix, Flag, KpiResult, Meta } from "./types";

export type StepId = "select" | "env" | "social" | "gov" | "context" | "crosscheck" | "verify" | "review" | "score";
export interface StepState {
  id: StepId;
  label: string;
  state: "wait" | "run" | "done" | "error";
  detail?: string;
}

export const STEP_LABELS: Record<StepId, string> = {
  select: "Finding the BRSR pages",
  env: "Reading environment KPIs",
  social: "Reading social KPIs",
  gov: "Reading governance KPIs",
  context: "Reading company facts, assurance and claims",
  crosscheck: "Second model re-reads the headline numbers",
  verify: "Checking every quote against the PDF",
  review: "Independent review for greenwashing",
  score: "Running consistency checks and scoring",
};

interface Hooks {
  onStep(s: StepState): void;
  onKpis(k: KpiResult[]): void;
}

const emptyMeta: Meta = { company: null, cin: null, fy: null, sector: null, turnover_cr: null, employees_total: null, female_employees_pct: null, scope: null };
const emptyAssurance: Assurance = { status: "unclear", provider: null, standard: null, scope: null, page: null, quote: null, evidence: "none" };

type RawKpi = Omit<KpiResult, "evidence">;

const HEADLINE = ["ghg_s1", "ghg_s2", "energy_total", "energy_renewable_pct", "water_withdrawal", "water_consumption", "waste_total", "ltifr", "injuries_recordable", "fatalities", "wages_female_pct", "payable_days", "posh_total", "msme_pct"];
const same = (a: number, b: number) => a === b || Math.abs(a - b) <= 0.005 * Math.max(Math.abs(a), Math.abs(b));

const placeholder = (id: string, note: string | null = null): KpiResult => ({
  id, status: "not_analysed", value: null, numeric: null, unit: null, year: null, page: null, quote: null, note, evidence: "none",
});

function pretty(models: Set<string>): string {
  return models.size ? [...models].join(" + ") : "none";
}

export async function runAudit(doc: PdfDoc, hooks: Hooks): Promise<Audit> {
  const verifier: Verifier = makeVerifier(doc.pages);
  const warnings: string[] = [];
  const step = (id: StepId, state: StepState["state"], detail?: string) => hooks.onStep({ id, label: STEP_LABELS[id], state, detail });

  (Object.keys(STEP_LABELS) as StepId[]).forEach((id) => step(id, "wait"));

  // 1. page selection
  step("select", "run");
  const groups: SelectGroup[] = ["env", "social", "gov", "context"];
  const picks = Object.fromEntries(groups.map((g) => [g, selectPages(doc.pages, g)])) as Record<SelectGroup, ReturnType<typeof selectPages>>;
  const used = new Set<number>();
  groups.forEach((g) => picks[g].pageNumbers.forEach((p) => used.add(p)));
  step("select", "done", `${used.size} of ${doc.numPages} pages chosen`);

  const kpiMap = new Map<string, KpiResult>(KPIS.map((d) => [d.id, placeholder(d.id)]));
  const push = () => hooks.onKpis(KPIS.map((d) => kpiMap.get(d.id) as KpiResult));
  push();

  const extractModels = new Set<string>();
  let meta: Meta = emptyMeta;
  let assurance: Assurance = emptyAssurance;
  let claims: Claim[] = [];
  let contextOk = false;
  const labelOf = (p: string, m: string) => `${p === "gemini" ? "Gemini" : "Grok"} ${m}`;

  const runKpiGroup = async (g: "env" | "social" | "gov") => {
    step(g, "run");
    if (picks[g].chars < 200) {
      // No page in the PDF touches this topic, so there is nothing for the AI to read.
      for (const d of kpisForGroup(g)) {
        kpiMap.set(d.id, { ...placeholder(d.id, "No page in the PDF mentions this topic."), status: "not_found" });
      }
      push();
      step(g, "done", "No matching pages, so these KPIs are marked not found");
      return;
    }
    try {
      const r = await postJson<{ kpis: RawKpi[]; provider: string; model: string }>("/api/extract", { group: g, text: picks[g].text });
      extractModels.add(labelOf(r.provider, r.model));
      for (const k of r.kpis) {
        let evidence: KpiResult["evidence"] = "none";
        let page = k.page;
        if (k.status === "disclosed" || k.status === "partial") {
          const v = verifier.check(k.quote, k.page, k.value);
          evidence = v.evidence;
          page = v.page ?? page;
        }
        kpiMap.set(k.id, { ...k, page, evidence });
      }
      push();
      step(g, "done", `${r.kpis.filter((k) => k.status === "disclosed" || k.status === "partial").length} of ${r.kpis.length} found`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "failed";
      warnings.push(`The ${g === "env" ? "environment" : g === "social" ? "social" : "governance"} part could not be read: ${msg}`);
      step(g, "error", msg);
    }
  };

  const runContext = async () => {
    step("context", "run");
    if (picks.context.chars < 200) {
      warnings.push("Company facts, assurance and claims were skipped because no matching pages were found in the PDF.");
      step("context", "error", "No matching pages");
      return;
    }
    try {
      const r = await postJson<{ meta: Meta; assurance: Omit<Assurance, "evidence">; claims: Omit<Claim, "evidence">[]; provider: string; model: string }>("/api/extract", { group: "context", text: picks.context.text });
      extractModels.add(labelOf(r.provider, r.model));
      meta = r.meta;
      const av = verifier.check(r.assurance.quote, r.assurance.page);
      assurance = { ...r.assurance, page: av.page ?? r.assurance.page, evidence: av.evidence };
      claims = r.claims.map((c) => {
        const v = verifier.check(c.quote, c.page);
        return { ...c, page: v.page ?? c.page, evidence: v.evidence };
      });
      contextOk = true;
      step("context", "done", `${claims.length} claims, assurance ${assurance.status}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "failed";
      warnings.push(`Company facts, assurance and claims could not be read: ${msg}`);
      step("context", "error", msg);
    }
  };

  await Promise.all([runKpiGroup("env"), runKpiGroup("social"), runKpiGroup("gov"), runContext()]);

  const kpisPre = KPIS.map((d) => kpiMap.get(d.id) as KpiResult);
  const analysedCount = kpisPre.filter((k) => k.status !== "not_analysed").length;
  if (analysedCount === 0) throw new Error("None of the AI calls succeeded. Open Settings to check the keys on the server, then try again.");

  // 1b. independent second read of the headline numbers
  step("crosscheck", "run");
  const crossModels = new Set<string>();
  try {
    const cand = HEADLINE.map((id) => kpiMap.get(id) as KpiResult).filter((k) => (k.status === "disclosed" || k.status === "partial") && k.numeric !== null && k.page);
    if (cand.length < 3) {
      step("crosscheck", "done", "Too few numbers to cross-check");
    } else {
      const pages = [...new Set(cand.map((k) => k.page as number))].sort((a, b) => a - b).slice(0, 12);
      const text = pages.map((p) => `=== PDF PAGE ${p} ===\n${doc.pages[p - 1] ?? ""}`).join("\n\n");
      const r = await postJson<{ kpis: { id: string; value: string | null; numeric: number | null }[]; provider: string; model: string }>("/api/crosscheck", { text, ids: cand.map((k) => k.id) });
      if (r.provider !== "grok") {
        step("crosscheck", "done", "Skipped: an independent second model needs the Grok key");
      } else {
        crossModels.add(labelOf(r.provider, r.model));
        let agree = 0;
        let differ = 0;
        for (const x of r.kpis) {
          const cur = kpiMap.get(x.id);
          if (!cur || cur.numeric === null) continue;
          if (x.numeric === null) {
            kpiMap.set(x.id, { ...cur, xcheck: "unchecked" });
          } else if (same(cur.numeric, x.numeric)) {
            agree++;
            kpiMap.set(x.id, { ...cur, xcheck: "agree", xvalue: x.value });
          } else {
            differ++;
            kpiMap.set(x.id, { ...cur, xcheck: "differ", xvalue: x.value });
          }
        }
        push();
        step("crosscheck", "done", `${agree} agree, ${differ} differ`);
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "failed";
    warnings.push(`The second model cross-check did not run: ${msg}`);
    step("crosscheck", "error", msg);
  }
  const kpisChecked = KPIS.map((d) => kpiMap.get(d.id) as KpiResult);

  // 2. verification summary
  step("verify", "run");
  const kpis = kpisChecked;
  const withEv = kpis.filter((k) => k.status === "disclosed" || k.status === "partial");
  const verified = withEv.filter((k) => k.evidence === "verified").length;
  step("verify", "done", `${verified} of ${withEv.length} quotes confirmed in the PDF`);

  // 3. deterministic rules
  step("score", "run");
  const rules = runRules(kpis, meta, assurance);

  // 4. independent review
  step("review", "run");
  const reviewModels = new Set<string>();
  let flags: Flag[] | null = null;
  let fixes: Fix[] = [];
  let verdict = "";
  let strengths: string[] = [];
  try {
    const narrative = selectPages(doc.pages, "context", 60_000).text;
    const r = await postJson<{
      verdict: string; strengths: string[];
      flags: Omit<Flag, "evidence">[];
      claimsAssessed: { index: number | null; rating: Claim["rating"]; reason: string }[];
      fixes: Fix[]; provider: string; model: string;
    }>("/api/review", {
      meta,
      assurance,
      kpis: kpis.map((k) => ({ id: k.id, status: k.status, value: k.value, unit: k.unit, year: k.year, page: k.page, prev_value: k.prev_value ?? null, xcheck: k.xcheck, xvalue: k.xvalue ?? null })),
      rules: rules.map((x) => ({ title: x.title, status: x.status, detail: x.detail })),
      claims,
      narrative,
    });
    reviewModels.add(labelOf(r.provider, r.model));
    flags = r.flags.map((f) => {
      const v = verifier.check(f.quote, f.page);
      return { ...f, page: v.page ?? f.page, evidence: f.quote ? v.evidence : "none" };
    });
    // A flag whose wording quote cannot be found in the PDF is downgraded, not hidden.
    flags = flags.map((f) => (f.quote && f.evidence === "unverified" ? { ...f, severity: f.severity === "high" ? "medium" : f.severity } : f));
    for (const a of r.claimsAssessed) {
      if (a.index !== null && claims[a.index]) claims[a.index] = { ...claims[a.index], rating: a.rating, reason: a.reason };
    }
    fixes = r.fixes;
    verdict = r.verdict;
    strengths = r.strengths;
    step("review", "done", `${flags.length} flags raised`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "failed";
    warnings.push(`The independent review did not run: ${msg}. Scores below leave out the credibility part.`);
    step("review", "error", msg);
  }

  // 5. scoring
  const scores = computeScores({ kpis, rules, flags, assurance: contextOk ? assurance : null });
  step("score", "done", `Score ${scores.overall}`);

  return {
    id: `a-${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
    fileName: doc.fileName,
    numPages: doc.numPages,
    usedPages: used.size,
    demo: false,
    models: { extract: pretty(extractModels), review: pretty(reviewModels), cross: crossModels.size ? pretty(crossModels) : undefined },
    meta,
    assurance,
    kpis,
    claims,
    rules,
    flags: flags ?? [],
    fixes,
    verdict,
    strengths,
    scores,
    warnings,
    reviewRan: flags !== null,
    contextOk,
    brsrFound: findBrsrZone(doc.pages) !== null,
  };
}
