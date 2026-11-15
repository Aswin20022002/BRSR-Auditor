import { KPIS, KPI_BY_ID } from "./kpis";
import type { Assurance, KpiResult, Meta, RuleResult } from "./types";

const WASTE_PARTS = ["waste_plastic", "waste_ewaste", "waste_biomed", "waste_cnd", "waste_battery", "waste_radio", "waste_haz", "waste_nonhaz"];

const fmt = (n: number) => (Math.abs(n) >= 100 ? Math.round(n).toLocaleString("en-IN") : String(Math.round(n * 100) / 100));
const approx = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol * Math.max(Math.abs(a), Math.abs(b), 1e-9);

/**
 * Deterministic checks. No AI involved, so results are reproducible and can be
 * defended in a viva: every rule is a plain arithmetic or logic test.
 */
export function runRules(kpis: KpiResult[], meta: Meta, assurance: Assurance): RuleResult[] {
  const by = new Map(kpis.map((x) => [x.id, x]));
  const num = (id: string): number | null => {
    const r = by.get(id);
    if (!r || (r.status !== "disclosed" && r.status !== "partial")) return null;
    return r.numeric;
  };
  const has = (id: string) => {
    const r = by.get(id);
    return !!r && (r.status === "disclosed" || r.status === "partial");
  };
  const out: RuleResult[] = [];
  const add = (r: RuleResult) => out.push(r);

  // 1. Waste categories add up
  {
    const total = num("waste_total");
    const parts = WASTE_PARTS.map((p) => ({ id: p, v: num(p) })).filter((x) => x.v !== null) as { id: string; v: number }[];
    const title = "Waste categories add up to the stated total";
    if (total === null || parts.length < 2) {
      add({ id: "waste_sum", title, status: "skip", detail: "Needs the total and at least two categories.", kpis: ["waste_total"] });
    } else {
      const sum = parts.reduce((s, x) => s + x.v, 0);
      if (sum > total * 1.02) add({ id: "waste_sum", title, status: "fail", detail: `The categories listed add up to ${fmt(sum)}, which is more than the stated total of ${fmt(total)}.`, kpis: ["waste_total", ...parts.map((x) => x.id)] });
      else if (parts.length === WASTE_PARTS.length && !approx(sum, total, 0.02)) add({ id: "waste_sum", title, status: "warn", detail: `All eight categories add up to ${fmt(sum)} but the total says ${fmt(total)}.`, kpis: ["waste_total", ...parts.map((x) => x.id)] });
      else add({ id: "waste_sum", title, status: "pass", detail: `Categories sum to ${fmt(sum)} against a total of ${fmt(total)}.`, kpis: ["waste_total"] });
    }
  }

  // 2. Recovered + disposed = generated
  {
    const t = num("waste_total");
    const r = num("waste_recovered");
    const d = num("waste_disposed");
    const title = "Recovered plus disposed waste equals waste generated";
    if (t === null || r === null || d === null) {
      add({ id: "waste_split", title, status: "skip", detail: "Needs total, recovered and disposed waste.", kpis: ["waste_total", "waste_recovered", "waste_disposed"] });
    } else {
      const sum = r + d;
      if (approx(sum, t, 0.03)) add({ id: "waste_split", title, status: "pass", detail: `${fmt(r)} recovered plus ${fmt(d)} disposed is ${fmt(sum)} against ${fmt(t)} generated.`, kpis: ["waste_total", "waste_recovered", "waste_disposed"] });
      else add({ id: "waste_split", title, status: approx(sum, t, 0.1) ? "warn" : "fail", detail: `${fmt(r)} recovered plus ${fmt(d)} disposed is ${fmt(sum)}, but ${fmt(t)} was generated. Stock held on site may explain part of the gap.`, kpis: ["waste_total", "waste_recovered", "waste_disposed"] });
    }
  }

  // 3. Water balance
  {
    const w = num("water_withdrawal");
    const d = num("water_discharge");
    const c = num("water_consumption");
    const title = "Water balance: withdrawal minus discharge equals consumption";
    const ids = ["water_withdrawal", "water_discharge", "water_consumption"];
    if (w === null || c === null) {
      add({ id: "water_balance", title, status: "skip", detail: "Needs withdrawal and consumption.", kpis: ids });
    } else if (c > w * 1.02) {
      add({ id: "water_balance", title, status: "fail", detail: `Consumption of ${fmt(c)} is higher than withdrawal of ${fmt(w)}, which is not possible without another source.`, kpis: ids });
    } else if (d !== null && !approx(w - d, c, 0.05)) {
      add({ id: "water_balance", title, status: "warn", detail: `Withdrawal ${fmt(w)} minus discharge ${fmt(d)} is ${fmt(w - d)}, but consumption is reported as ${fmt(c)}.`, kpis: ids });
    } else {
      add({ id: "water_balance", title, status: "pass", detail: d !== null ? `${fmt(w)} minus ${fmt(d)} matches reported consumption of ${fmt(c)}.` : `Consumption of ${fmt(c)} does not exceed withdrawal of ${fmt(w)}.`, kpis: ids });
    }
  }

  // 4. Percent bounds
  {
    const title = "Every percentage sits between 0 and 100";
    const bad = KPIS.filter((d) => d.kind === "percent").filter((d) => {
      const v = num(d.id);
      return v !== null && (v < 0 || v > 100);
    });
    const tested = KPIS.filter((d) => d.kind === "percent" && num(d.id) !== null).length;
    if (tested === 0) add({ id: "pct_bounds", title, status: "skip", detail: "No percentage KPIs were found.", kpis: [] });
    else if (bad.length) add({ id: "pct_bounds", title, status: "fail", detail: `Out of range: ${bad.map((d) => `${d.label} (${fmt(num(d.id) as number)})`).join("; ")}.`, kpis: bad.map((d) => d.id) });
    else add({ id: "pct_bounds", title, status: "pass", detail: `${tested} percentage values checked.`, kpis: [] });
  }

  // 5. Safety logic
  {
    const title = "Safety numbers are logically consistent";
    const rec = num("injuries_recordable");
    const fat = num("fatalities");
    const hi = num("injuries_high");
    const ids = ["injuries_recordable", "fatalities", "injuries_high"];
    const problems: string[] = [];
    if (rec !== null && fat !== null && fat > 0 && rec === 0) problems.push("fatalities are reported but recordable injuries are zero");
    if (rec !== null && hi !== null && hi > rec) problems.push(`high consequence injuries (${fmt(hi)}) exceed total recordable injuries (${fmt(rec)})`);
    if (rec === null && fat === null && hi === null) add({ id: "safety_logic", title, status: "skip", detail: "No injury counts were found.", kpis: ids });
    else if (problems.length) add({ id: "safety_logic", title, status: "fail", detail: `Check: ${problems.join("; ")}.`, kpis: ids });
    else add({ id: "safety_logic", title, status: "pass", detail: "Fatalities and high consequence injuries do not exceed recordable injuries.", kpis: ids });
  }

  // 6. POSH
  {
    const title = "Upheld harassment complaints do not exceed complaints received";
    const t = num("posh_total");
    const u = num("posh_upheld");
    if (t === null || u === null) add({ id: "posh_logic", title, status: "skip", detail: "Needs both counts.", kpis: ["posh_total", "posh_upheld"] });
    else if (u > t) add({ id: "posh_logic", title, status: "fail", detail: `${fmt(u)} upheld is more than ${fmt(t)} received. Cases carried over from earlier years may explain this, so check the notes.`, kpis: ["posh_total", "posh_upheld"] });
    else add({ id: "posh_logic", title, status: "pass", detail: `${fmt(u)} upheld out of ${fmt(t)} received.`, kpis: ["posh_total", "posh_upheld"] });
  }

  // 7. Copy-paste scope values
  {
    const title = "Scope 1 and Scope 2 are not identical";
    const a = num("ghg_s1");
    const b = num("ghg_s2");
    if (a === null || b === null) add({ id: "scope_dup", title, status: "skip", detail: "Needs both scopes.", kpis: ["ghg_s1", "ghg_s2"] });
    else if (a === b && a > 0) add({ id: "scope_dup", title, status: "warn", detail: `Both are ${fmt(a)}. This is rare and often a copy-paste slip.`, kpis: ["ghg_s1", "ghg_s2"] });
    else add({ id: "scope_dup", title, status: "pass", detail: `Scope 1 is ${fmt(a)} and Scope 2 is ${fmt(b)}.`, kpis: ["ghg_s1", "ghg_s2"] });
  }

  // 8. Intensity traceable to a base number
  {
    const title = "Every intensity ratio can be traced to a base number";
    const pairs: [string, string[]][] = [
      ["ghg_int_ppp", ["ghg_s1", "ghg_s2"]],
      ["water_int_ppp", ["water_consumption"]],
      ["energy_int_ppp", ["energy_total"]],
      ["waste_int_ppp", ["waste_total"]],
    ];
    const tested = pairs.filter(([i]) => has(i));
    const broken = tested.filter(([, bases]) => bases.some((b) => !has(b)));
    if (tested.length === 0) add({ id: "intensity_trace", title, status: "skip", detail: "No intensity ratios were found.", kpis: [] });
    else if (broken.length) add({ id: "intensity_trace", title, status: "warn", detail: `Intensity is reported without its base number for: ${broken.map(([i]) => KPI_BY_ID[i].label).join("; ")}. A reader cannot reproduce these.`, kpis: broken.map(([i]) => i) });
    else add({ id: "intensity_trace", title, status: "pass", detail: `${tested.length} intensity ratios have their base numbers disclosed.`, kpis: tested.map(([i]) => i) });
  }

  // 9. Mixed reporting years
  {
    const title = "All KPIs refer to the same financial year";
    const withYear = kpis.filter((x) => (x.status === "disclosed" || x.status === "partial") && x.year);
    if (withYear.length < 4) add({ id: "year_mix", title, status: "skip", detail: "Too few KPIs carried a year label.", kpis: [] });
    else {
      const counts = new Map<string, number>();
      withYear.forEach((x) => counts.set(x.year as string, (counts.get(x.year as string) ?? 0) + 1));
      const [major] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
      const odd = withYear.filter((x) => x.year !== major);
      if (odd.length) add({ id: "year_mix", title, status: "warn", detail: `Most KPIs are for ${major}, but ${odd.length} use another year: ${odd.slice(0, 4).map((x) => `${KPI_BY_ID[x.id].label} (${x.year})`).join("; ")}.`, kpis: odd.map((x) => x.id) });
      else add({ id: "year_mix", title, status: "pass", detail: `All ${withYear.length} dated KPIs are for ${major}.`, kpis: [] });
    }
  }

  // 10. Assurance versus coverage
  {
    const title = "Assurance claim matches how complete the disclosure is";
    const analysed = kpis.filter((x) => x.status !== "not_analysed" && x.status !== "not_applicable");
    const missing = analysed.filter((x) => x.status === "not_found").length;
    const share = analysed.length ? missing / analysed.length : 0;
    if (assurance.status === "unclear" || analysed.length < 10) add({ id: "assurance_cov", title, status: "skip", detail: "Assurance status or coverage is not clear enough to test.", kpis: [] });
    else if (assurance.status === "reasonable" && share >= 0.3) add({ id: "assurance_cov", title, status: "warn", detail: `Reasonable assurance is stated, yet ${Math.round(share * 100)}% of BRSR Core KPIs were not found in the report. Check what the assurance scope really covers.`, kpis: [] });
    else add({ id: "assurance_cov", title, status: "pass", detail: `Assurance is ${assurance.status}. ${Math.round(share * 100)}% of KPIs not found.`, kpis: [] });
  }

  // 11. Year on year movement
  {
    const title = "No unexplained year-on-year jumps";
    const comp = kpis.filter((k) => {
      if ((k.status !== "disclosed" && k.status !== "partial") || k.numeric === null || k.prev_numeric == null || k.prev_numeric <= 0) return false;
      return !(KPI_BY_ID[k.id].kind === "count" && k.prev_numeric < 20);
    });
    if (comp.length < 3) {
      add({ id: "yoy", title, status: "skip", detail: "Too few KPIs carried a previous year figure.", kpis: [] });
    } else {
      const jumps = comp.filter((k) => Math.abs((k.numeric as number) - (k.prev_numeric as number)) / (k.prev_numeric as number) > 0.6);
      if (jumps.length) {
        const txt = jumps.slice(0, 4).map((k) => {
          const ch = Math.round((((k.numeric as number) - (k.prev_numeric as number)) / (k.prev_numeric as number)) * 100);
          return `${KPI_BY_ID[k.id].label} (${fmt(k.prev_numeric as number)} to ${fmt(k.numeric as number)}, ${ch > 0 ? "+" : ""}${ch}%)`;
        });
        add({ id: "yoy", title, status: "warn", detail: `Moves of more than 60%: ${txt.join("; ")}. Look for a restatement, a boundary change or a new site.`, kpis: jumps.map((k) => k.id) });
      } else {
        add({ id: "yoy", title, status: "pass", detail: `${comp.length} KPIs compared with last year and none moved by more than 60%.`, kpis: [] });
      }
    }
  }

  // 12. Two AI models read the same headline numbers
  {
    const title = "Two AI models read the same headline numbers";
    const checked = kpis.filter((k) => k.xcheck === "agree" || k.xcheck === "differ");
    const differ = checked.filter((k) => k.xcheck === "differ");
    if (checked.length === 0) {
      add({ id: "xcheck", title, status: "skip", detail: "The second model did not run, or it needs the Grok key to be independent.", kpis: [] });
    } else if (differ.length === 0) {
      add({ id: "xcheck", title, status: "pass", detail: `Gemini and Grok agree on all ${checked.length} headline numbers they both read.`, kpis: [] });
    } else {
      const txt = differ.slice(0, 4).map((k) => `${KPI_BY_ID[k.id].label} (first read ${k.value ?? "?"}, second read ${k.xvalue ?? "?"})`);
      add({ id: "xcheck", title, status: differ.length > 2 ? "fail" : "warn", detail: `The models disagree on ${differ.length} of ${checked.length}: ${txt.join("; ")}. Open the page and check the table.`, kpis: differ.map((k) => k.id) });
    }
  }

  // 13. Company turnover sanity (context for readers)
  {
    const title = "Basic company facts were captured";
    const miss = [!meta.company && "company name", !meta.fy && "financial year", meta.turnover_cr === null && "turnover"].filter(Boolean);
    if (miss.length) add({ id: "meta_ok", title, status: "warn", detail: `Could not read: ${miss.join(", ")}. The report may not include Section A in the pages provided.`, kpis: [] });
    else add({ id: "meta_ok", title, status: "pass", detail: `${meta.company}, ${meta.fy}, turnover Rs ${fmt(meta.turnover_cr as number)} crore.`, kpis: [] });
  }

  return out;
}
