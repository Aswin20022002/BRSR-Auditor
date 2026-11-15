import { KPIS, KPI_BY_ID } from "./kpis";
import { runRules } from "./rules";
import { computeScores } from "./score";
import type { Assurance, Audit, Claim, Fix, Flag, KpiResult, Meta } from "./types";

/**
 * Illustrative demo data for fictional companies. It exists so the app can be
 * shown and the Compare page tried without an API key. Nothing here describes a real company.
 */

// id, value, unit, page, mode ("" disclosed and verified, p partial, n not found, u disclosed but unverified)
type Row = [string, string, string, number, ("" | "p" | "n" | "u")?];

const A: Row[] = [
  ["ghg_s1", "48,250", "tCO2e", 112], ["ghg_s2", "1,12,430", "tCO2e", 112], ["ghg_int_ppp", "7.9", "tCO2e per Rs crore (PPP)", 112], ["ghg_int_out", "", "", 0, "n"],
  ["water_withdrawal", "18,40,000", "kL", 113], ["water_consumption", "15,90,000", "kL", 113], ["water_discharge", "4,10,000", "kL", 113], ["water_int_ppp", "36.8", "kL per Rs crore (PPP)", 113], ["water_int_out", "", "", 0, "n"],
  ["energy_total", "21,60,000", "GJ", 113], ["energy_renewable_pct", "27.4", "%", 113], ["energy_int_ppp", "50.0", "GJ per Rs crore (PPP)", 113], ["energy_int_out", "", "", 0, "n"],
  ["waste_plastic", "120", "MT", 114], ["waste_ewaste", "6", "MT", 114], ["waste_biomed", "0", "MT", 114], ["waste_cnd", "", "", 0, "n"], ["waste_battery", "4", "MT", 114], ["waste_radio", "0", "MT", 114], ["waste_haz", "310", "MT", 114], ["waste_nonhaz", "8,900", "MT", 114],
  ["waste_total", "9,100", "MT", 114], ["waste_int_ppp", "21.0", "kg per Rs crore (PPP)", 114], ["waste_int_out", "", "", 0, "n"], ["waste_recovered", "7,200", "MT", 114], ["waste_disposed", "1,900", "MT", 114],
  ["wellbeing_spend_pct", "1.8", "%", 121], ["ltifr", "0.42", "per million person-hours", 122], ["injuries_recordable", "31", "count", 122], ["fatalities", "0", "count", 122], ["injuries_high", "2", "count", 122],
  ["wages_female_pct", "38.5", "%", 123], ["posh_total", "4", "count", 124], ["posh_pct_female", "0.07", "%", 124, "p"], ["posh_upheld", "2", "count", 124],
  ["msme_pct", "", "", 0, "n"], ["india_pct", "78.0", "%", 126, "p"], ["smalltown_pct", "44.0", "%", 126, "u"],
  ["data_breach_pct", "0", "%", 128], ["payable_days", "62", "days", 129],
  ["conc_purchases_th", "12.5", "%", 130], ["conc_sales_dealers", "34.0", "%", 130], ["rpt_purchases", "6.1", "%", 131], ["rpt_sales", "3.2", "%", 131], ["rpt_loans", "", "", 0, "n"], ["rpt_investments", "", "", 0, "n"],
];

const B_OVERRIDES: Record<string, Row> = {
  ghg_s1: ["ghg_s1", "38,40,000", "tCO2e", 99], ghg_s2: ["ghg_s2", "2,10,000", "tCO2e", 99], ghg_int_ppp: ["ghg_int_ppp", "9.2", "tCO2e per Rs crore (PPP)", 99],
  ghg_int_out: ["ghg_int_out", "0.52", "tCO2e per tonne of cement", 99], water_withdrawal: ["water_withdrawal", "9,50,000", "kL", 100], water_consumption: ["water_consumption", "8,90,000", "kL", 100],
  water_discharge: ["water_discharge", "60,000", "kL", 100], water_int_ppp: ["water_int_ppp", "21.4", "kL per Rs crore (PPP)", 100], water_int_out: ["water_int_out", "0.19", "kL per tonne of cement", 100],
  energy_total: ["energy_total", "1,05,00,000", "GJ", 100], energy_renewable_pct: ["energy_renewable_pct", "18.2", "%", 100], energy_int_ppp: ["energy_int_ppp", "251.0", "GJ per Rs crore (PPP)", 100], energy_int_out: ["energy_int_out", "2.6", "GJ per tonne of cement", 100],
  waste_plastic: ["waste_plastic", "40", "MT", 101], waste_ewaste: ["waste_ewaste", "3", "MT", 101], waste_biomed: ["waste_biomed", "0", "MT", 101], waste_cnd: ["waste_cnd", "0", "MT", 101], waste_battery: ["waste_battery", "12", "MT", 101], waste_radio: ["waste_radio", "0", "MT", 101],
  waste_haz: ["waste_haz", "1,100", "MT", 101], waste_nonhaz: ["waste_nonhaz", "50,845", "MT", 101], waste_total: ["waste_total", "52,000", "MT", 101], waste_int_ppp: ["waste_int_ppp", "12.4", "kg per Rs crore (PPP)", 101], waste_int_out: ["waste_int_out", "1.3", "kg per tonne of cement", 101],
  waste_recovered: ["waste_recovered", "47,000", "MT", 101], waste_disposed: ["waste_disposed", "5,000", "MT", 101],
  wellbeing_spend_pct: ["wellbeing_spend_pct", "0.9", "%", 108], ltifr: ["ltifr", "0.21", "per million person-hours", 109], injuries_recordable: ["injuries_recordable", "14", "count", 109], fatalities: ["fatalities", "1", "count", 109], injuries_high: ["injuries_high", "1", "count", 109],
  wages_female_pct: ["wages_female_pct", "5.2", "%", 110], posh_total: ["posh_total", "1", "count", 111], posh_pct_female: ["posh_pct_female", "0.12", "%", 111], posh_upheld: ["posh_upheld", "0", "count", 111],
  msme_pct: ["msme_pct", "41.0", "%", 113], india_pct: ["india_pct", "92.0", "%", 113], smalltown_pct: ["smalltown_pct", "31.0", "%", 113],
  data_breach_pct: ["data_breach_pct", "0", "%", 115], payable_days: ["payable_days", "38", "days", 116],
  conc_purchases_th: ["conc_purchases_th", "3.0", "%", 117], conc_sales_dealers: ["conc_sales_dealers", "71.0", "%", 117], rpt_purchases: ["rpt_purchases", "9.4", "%", 118], rpt_sales: ["rpt_sales", "1.1", "%", 118],
  rpt_loans: ["rpt_loans", "0.0", "%", 118], rpt_investments: ["rpt_investments", "12.0", "%", 118],
};

const toNum = (s: string) => Number(s.replace(/,/g, ""));

const HEADLINE = ["ghg_s1", "ghg_s2", "energy_total", "energy_renewable_pct", "water_withdrawal", "water_consumption", "waste_total", "ltifr", "injuries_recordable", "fatalities", "wages_female_pct", "payable_days", "posh_total", "msme_pct"];
const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const indian = (n: number) => n.toLocaleString("en-IN", { maximumFractionDigits: 2 });

function build(rows: Row[], fy: string, variant: "a" | "b"): KpiResult[] {
  const byId = new Map(rows.map((r) => [r[0], r]));
  return KPIS.map((d) => {
    const r = byId.get(d.id);
    if (!r || r[4] === "n") {
      return { id: d.id, status: "not_found", value: null, numeric: null, unit: null, year: null, page: null, quote: null, note: null, evidence: "none" } as KpiResult;
    }
    const [id, value, unit, page, mode] = r;
    const quote = `${KPI_BY_ID[id].label}: ${value} ${unit}`.trim();
    const numeric = toNum(value);
    let prev = numeric === 0 ? 0 : Math.round(numeric * (1 + ((hash(id) % 11) - 5) / 100) * 100) / 100;
    if (variant === "a" && id === "waste_haz") prev = 120; // a deliberate jump so the demo shows the year on year rule
    const differ = variant === "a" && id === "injuries_recordable";
    const xcheck = HEADLINE.includes(id) && mode !== "u" ? (differ ? "differ" : "agree") : undefined;
    return {
      id,
      status: mode === "p" ? "partial" : "disclosed",
      value,
      numeric,
      prev_value: indian(prev),
      prev_numeric: prev,
      xcheck,
      xvalue: differ ? "28" : xcheck ? value : null,
      unit,
      year: fy,
      page,
      quote,
      note: mode === "p" ? "Only part of the breakdown is given." : null,
      evidence: mode === "u" ? "unverified" : mode === "p" ? "partial" : "verified",
    } as KpiResult;
  });
}

function finish(id: string, fileName: string, meta: Meta, assurance: Assurance, kpis: KpiResult[], claims: Claim[], flags: Flag[], fixes: Fix[], verdict: string, strengths: string[]): Audit {
  const rules = runRules(kpis, meta, assurance);
  const scores = computeScores({ kpis, rules, flags, assurance });
  return {
    id, createdAt: new Date().toISOString(), fileName, numPages: 240, usedPages: 38, demo: true,
    models: { extract: "Illustrative sample", review: "Illustrative sample", cross: "Illustrative sample" },
    meta, assurance, kpis, claims, rules, flags, fixes, verdict, strengths, scores, warnings: [], reviewRan: true, contextOk: true, brsrFound: true,
  };
}

const fl = (n: number, f: Omit<Flag, "id" | "evidence"> & { evidence?: Flag["evidence"] }): Flag => ({ id: `f${n}`, evidence: f.quote ? "verified" : "none", ...f });

export function sampleFabrics(): Audit {
  const meta: Meta = { company: "Sample Fabrics Ltd (illustrative)", cin: null, fy: "FY 2024-25", sector: "Textiles", turnover_cr: 3420, employees_total: 18400, female_employees_pct: 31, scope: "consolidated" };
  const assurance: Assurance = { status: "limited", provider: "Illustrative Assurance LLP", standard: "ISAE 3000", scope: "Selected BRSR Core KPIs", page: 140, quote: "Limited assurance was obtained on selected BRSR Core indicators.", evidence: "verified" };
  const claims: Claim[] = [
    { claim: "Net zero by 2070 in line with the national ambition.", type: "commitment", has_number: false, has_baseline: false, has_deadline: true, page: 20, quote: "We are committed to becoming a net zero company in line with India's 2070 ambition.", evidence: "verified", rating: "vague", reason: "No baseline, no interim milestone and no emissions pathway are given." },
    { claim: "Cut Scope 1 and 2 intensity by 30% by FY2030.", type: "target", has_number: true, has_baseline: false, has_deadline: true, page: 21, quote: "We target a 30% reduction in emissions intensity by FY2030.", evidence: "verified", rating: "partly_backed", reason: "The percentage and year are clear, but the baseline year is missing, so progress cannot be tracked." },
    { claim: "27% of energy now comes from renewable sources.", type: "achievement", has_number: true, has_baseline: true, has_deadline: false, page: 113, quote: "Renewable energy accounted for 27.4% of total energy consumption.", evidence: "verified", rating: "backed", reason: "Matches the renewable share reported in the BRSR Core table." },
    { claim: "Zero liquid discharge at all manufacturing units.", type: "achievement", has_number: false, has_baseline: false, has_deadline: false, page: 31, quote: "All our units operate on a zero liquid discharge basis.", evidence: "verified", rating: "unsupported", reason: "The water table still reports 4,10,000 kL of discharge." },
    { claim: "Zero fatalities in the year.", type: "achievement", has_number: true, has_baseline: false, has_deadline: false, page: 122, quote: "There were no fatalities among employees or workers during the year.", evidence: "verified", rating: "backed", reason: "Fatalities are reported as 0 in the safety table." },
  ];
  const flags: Flag[] = [
    fl(1, { severity: "high", category: "inconsistency", title: "Waste categories add up to more than the stated total", explanation: "The eight waste categories sum to 9,340 MT but the total is 9,100 MT. A reader cannot tell which number is right.", quote: null, page: 114, kpi_ids: ["waste_total", "waste_nonhaz"], suggestion: "Reconcile the table and restate the total." }),
    fl(2, { severity: "high", category: "claim_data_mismatch", title: "Zero liquid discharge claim conflicts with reported discharge", explanation: "The narrative says all units are zero liquid discharge, while the water table shows 4,10,000 kL discharged.", quote: "All our units operate on a zero liquid discharge basis.", page: 31, kpi_ids: ["water_discharge"], suggestion: "Define the claim, or explain which units discharge and why." }),
    fl(3, { severity: "medium", category: "missing_baseline", title: "Net zero ambition has no baseline or interim target", explanation: "A 2070 date without a baseline year or milestones cannot be tested for progress.", quote: "We are committed to becoming a net zero company in line with India's 2070 ambition.", page: 20, kpi_ids: ["ghg_s1", "ghg_s2"], suggestion: "Publish a baseline year and 2030 and 2040 milestones." }),
    fl(4, { severity: "medium", category: "selective_disclosure", title: "MSME sourcing and related party loans are not disclosed", explanation: "Several inclusive development and openness KPIs are missing, which limits peer comparison.", quote: null, page: null, kpi_ids: ["msme_pct", "rpt_loans", "rpt_investments"], suggestion: "Disclose all BRSR Core KPIs or state why a KPI does not apply." }),
    fl(5, { severity: "medium", category: "assurance_gap", title: "Only limited assurance on selected indicators", explanation: "The assurance statement covers selected KPIs at a limited level, so readers get weaker comfort than reasonable assurance gives.", quote: "Limited assurance was obtained on selected BRSR Core indicators.", page: 140, kpi_ids: [], suggestion: "State exactly which KPIs were assured and plan a move to reasonable assurance." }),
  ];
  const fixes: Fix[] = [
    { action: "Reconcile the waste table so categories add up to the total.", why: "It is a hard arithmetic error that undermines trust in other numbers.", kpi_ids: ["waste_total"], effort: "low", impact: "high" },
    { action: "Explain or remove the zero liquid discharge claim.", why: "The narrative and the table disagree.", kpi_ids: ["water_discharge"], effort: "low", impact: "high" },
    { action: "Add a baseline year and interim milestones to the net zero commitment.", why: "Targets without a baseline cannot be tracked.", kpi_ids: ["ghg_s1", "ghg_s2"], effort: "medium", impact: "high" },
    { action: "Disclose MSME sourcing and related party loans and investments.", why: "These KPIs are in BRSR Core and missing here.", kpi_ids: ["msme_pct", "rpt_loans", "rpt_investments"], effort: "medium", impact: "medium" },
    { action: "Publish all intensity ratios with their formulas.", why: "Readers need to reproduce the figures.", kpi_ids: ["ghg_int_out", "water_int_out", "energy_int_out", "waste_int_out"], effort: "low", impact: "medium" },
  ];
  return finish("sample-a", "sample-fabrics-brsr.pdf", meta, assurance, build(A, "FY 2024-25", "a"), claims, flags, fixes,
    "Core energy, safety and emissions data are present and mostly traceable to the page. Two hard inconsistencies and an unsupported zero discharge claim reduce trust, and several BRSR Core KPIs are simply absent.",
    ["Scope 1 and 2 and energy data are disclosed with page evidence.", "Safety data is complete and internally consistent.", "Renewable energy claim matches the table."]);
}

export function sampleCement(): Audit {
  const meta: Meta = { company: "Sample Cement Co (illustrative)", cin: null, fy: "FY 2024-25", sector: "Cement", turnover_cr: 9850, employees_total: 6200, female_employees_pct: 6, scope: "standalone" };
  const assurance: Assurance = { status: "reasonable", provider: "Illustrative Assurance LLP", standard: "ISAE 3000", scope: "All BRSR Core KPIs", page: 128, quote: "Reasonable assurance was obtained on all BRSR Core indicators.", evidence: "verified" };
  const claims: Claim[] = [
    { claim: "Reduce net CO2 per tonne of cement by 25% by 2030 from a 2019 baseline.", type: "target", has_number: true, has_baseline: true, has_deadline: true, page: 18, quote: "We will cut net CO2 per tonne of cementitious material by 25% by 2030 against 2019.", evidence: "verified", rating: "backed", reason: "Has a number, a baseline and a deadline, and intensity per tonne is disclosed." },
    { claim: "Alternative fuel use is growing every year.", type: "achievement", has_number: false, has_baseline: false, has_deadline: false, page: 19, quote: "Our alternative fuel usage continues to grow.", evidence: "verified", rating: "vague", reason: "No share or tonnage is given." },
    { claim: "One fatality in the year with a full investigation.", type: "achievement", has_number: true, has_baseline: false, has_deadline: false, page: 109, quote: "We regret one fatality during the year and have completed a full investigation.", evidence: "verified", rating: "backed", reason: "Matches the safety table." },
  ];
  const flags: Flag[] = [
    fl(1, { severity: "medium", category: "vague_language", title: "Alternative fuel progress is described without numbers", explanation: "The narrative says usage is growing but gives no share of fuel or year on year figure.", quote: "Our alternative fuel usage continues to grow.", page: 19, kpi_ids: ["energy_renewable_pct"], suggestion: "Disclose alternative fuel as a percentage of thermal energy." }),
    fl(2, { severity: "low", category: "boundary_unclear", title: "Standalone numbers only", explanation: "The report covers the standalone entity, so group level emissions may be understated.", quote: null, page: null, kpi_ids: ["ghg_s1"], suggestion: "State the boundary clearly next to each table." }),
  ];
  const fixes: Fix[] = [
    { action: "Add a percentage figure for alternative fuel use.", why: "It turns a vague claim into a trackable one.", kpi_ids: ["energy_renewable_pct"], effort: "low", impact: "medium" },
    { action: "State the reporting boundary beside each KPI table.", why: "Standalone and consolidated numbers are not comparable.", kpi_ids: ["ghg_s1", "ghg_s2"], effort: "low", impact: "low" },
  ];
  return finish("sample-b", "sample-cement-brsr.pdf", meta, assurance, build(Object.values(B_OVERRIDES), "FY 2024-25", "b"), claims, flags, fixes,
    "A near complete, arithmetically consistent BRSR Core disclosure under reasonable assurance. Remaining weaknesses are narrative: one vague fuel claim and an unclear boundary.",
    ["Complete BRSR Core coverage with page evidence.", "Reasonable assurance across all BRSR Core KPIs.", "Targets carry a number, baseline and deadline."]);
}
