import { ATTR_BY_ID, KPI_BY_ID, kpisForGroup, type GroupId } from "../kpis";

const KPI_SCHEMA = `{
  "kpis": [
    {
      "id": "<kpi id from the list>",
      "status": "disclosed" | "partial" | "not_found" | "not_applicable",
      "value": "<value exactly as printed in the report, or null>",
      "numeric": <number without commas, or null>,
      "unit": "<unit as printed, or null>",
      "year": "<financial year of the value, for example FY 2024-25, or null>",
      "prev_value": "<the previous financial year value exactly as printed, or null>",
      "prev_numeric": <previous year number without commas, or null>,
      "page": <PDF page number from the === PDF PAGE n === marker, or null>,
      "quote": "<verbatim text copied from the page that contains the value, max 220 characters, or null>",
      "note": "<one short sentence only if something needs explaining, otherwise null>"
    }
  ]
}`;

export const EXTRACT_SYSTEM = `You are a meticulous data extraction engine for India's SEBI BRSR (Business Responsibility and Sustainability Report) disclosures.
You read text from a company's BRSR or annual report and return structured JSON only.
Strict rules:
1. Use only the text provided. Never use outside knowledge, never estimate, never calculate a number that is not printed.
2. If the report gives current and previous year columns, take the CURRENT financial year for value, numeric and year, and put the PREVIOUS year figure in prev_value and prev_numeric (null when absent).
3. "disclosed" means an explicit value is printed. "partial" means only some components, only a previous year, or only a qualitative statement. "not_found" means you searched the text and it is absent. "not_applicable" means the company states it is not applicable.
4. "value" is copied exactly as printed (keep units and Indian number formatting). "numeric" is the same number as a plain JavaScript number in the unit printed. Do not convert units.
5. "quote" must be copied character for character from the provided text, and must include the value. Do not paraphrase. If you cannot quote it, use status "partial" or "not_found".
6. "page" is the number in the nearest preceding "=== PDF PAGE n ===" marker. This is the PDF page, not the printed page number.
7. Return one entry for every KPI id requested, in the same order. Return JSON only, no commentary.`;

export function extractUser(group: Exclude<GroupId, never>, text: string): string {
  const defs = kpisForGroup(group);
  const list = defs
    .map((d) => `- ${d.id} | ${d.label} | unit: ${d.unit} | ${ATTR_BY_ID[d.attr].name} | ${d.hint}`)
    .join("\n");
  return `Extract these BRSR Core KPIs.

KPI list (id | label | expected unit | attribute | where to look):
${list}

Return JSON in exactly this shape:
${KPI_SCHEMA}

REPORT TEXT:
${text}`;
}

export const CONTEXT_SYSTEM = `You are an analyst reading a company's BRSR or annual report. Return structured JSON only.
Strict rules: use only the text provided, never outside knowledge. Quotes must be copied character for character from the text. "page" is the number in the nearest preceding "=== PDF PAGE n ===" marker. If something is not in the text, use null.`;

export function contextUser(text: string): string {
  return `Read the text and return JSON in exactly this shape:
{
  "meta": {
    "company": "<name of the listed entity or null>",
    "cin": "<corporate identity number or null>",
    "fy": "<financial year being reported, for example FY 2024-25, or null>",
    "sector": "<industry or business in 3 words or fewer, or null>",
    "turnover_cr": <turnover in Rs crore as a number, or null>,
    "employees_total": <total employees as a number, or null>,
    "female_employees_pct": <women as percent of employees, or null>,
    "scope": "standalone" | "consolidated" | null
  },
  "assurance": {
    "status": "reasonable" | "limited" | "none" | "unclear",
    "provider": "<assurance firm or null>",
    "standard": "<for example ISAE 3000, or null>",
    "scope": "<what was assured, for example BRSR Core KPIs, or null>",
    "page": <page or null>,
    "quote": "<verbatim sentence about the assurance, or null>"
  },
  "claims": [
    {
      "claim": "<the sustainability target, commitment or achievement, one sentence>",
      "type": "target" | "commitment" | "achievement" | "policy" | "certification",
      "has_number": <true if the claim contains a measurable number>,
      "has_baseline": <true if a baseline year or value is given>,
      "has_deadline": <true if a target year is given>,
      "page": <page or null>,
      "quote": "<verbatim text, max 220 characters>"
    }
  ]
}
List up to 14 of the most important climate, energy, water, waste, safety, diversity and supply chain claims. Prefer forward looking targets and headline achievements. Skip routine policy boilerplate.

REPORT TEXT:
${text}`;
}

export const REVIEW_SYSTEM = `You are an independent sustainability disclosure auditor. You judge the QUALITY OF DISCLOSURE, not the company's ESG performance.
You receive KPIs already extracted by another AI model, deterministic rule results, the report's headline claims and some narrative text.
Your job is to find greenwashing risk and weak or inconsistent disclosure, and to say how to fix it.
Strict rules:
1. Be evidence based. Every flag that depends on wording must carry a verbatim quote copied from the provided text. Flags that come purely from the numbers may have quote null.
2. Do not invent facts, do not use outside knowledge about the company, do not guess missing numbers.
3. Severity: high = could mislead a reader or breaks a hard logic test; medium = weakens credibility or comparability; low = minor polish.
4. Categories you may use: vague_language, unquantified_target, missing_baseline, claim_data_mismatch, selective_disclosure, assurance_gap, inconsistency, boundary_unclear.
5. Look at year on year movement. Flag big swings, intensity falling while absolute numbers rise, and any KPI where the second model read a different number. Also be fair and name real strengths. Prefer fewer, sharper flags over many weak ones.
6. Write in plain English for an MBA student. No em dashes.
Return JSON only.`;

export function reviewUser(payload: {
  meta: unknown;
  assurance: unknown;
  kpiTable: string;
  rules: string;
  claims: string;
  narrative: string;
}): string {
  return `COMPANY FACTS
${JSON.stringify(payload.meta)}

ASSURANCE
${JSON.stringify(payload.assurance)}

EXTRACTED KPIs (id | label | status | value unit | year | page | last year | second model disagreement)
${payload.kpiTable}

DETERMINISTIC RULE RESULTS
${payload.rules}

HEADLINE CLAIMS FOUND IN THE REPORT (index | type | number? baseline? deadline? | page | quote)
${payload.claims}

NARRATIVE EXCERPTS
${payload.narrative}

Return JSON in exactly this shape:
{
  "verdict": "<max 60 words. Overall read on disclosure quality, balanced and specific>",
  "strengths": ["<max 4 short strengths>"],
  "flags": [
    {
      "severity": "high" | "medium" | "low",
      "category": "<one of the allowed categories>",
      "title": "<max 12 words>",
      "explanation": "<2 sentences max. Say what is wrong and why a reader should care>",
      "quote": "<verbatim from the provided text, or null>",
      "page": <page number or null>,
      "kpi_ids": ["<related kpi ids, may be empty>"],
      "suggestion": "<one sentence on how the company should fix the disclosure>"
    }
  ],
  "claims_assessed": [
    { "index": <claim index from the list>, "rating": "backed" | "partly_backed" | "unsupported" | "vague", "reason": "<one sentence>" }
  ],
  "fixes": [
    {
      "action": "<imperative sentence>",
      "why": "<one sentence>",
      "kpi_ids": ["<kpi ids>"],
      "effort": "low" | "medium" | "high",
      "impact": "low" | "medium" | "high"
    }
  ]
}
Give at most 12 flags and at most 8 fixes. Order flags by severity, then fixes by impact divided by effort.`;
}

export const CROSS_SYSTEM = `You are an independent second reader of India's BRSR disclosures. You re-read the given pages and report only the requested KPI values for the CURRENT financial year.
Use only the text provided. Never estimate or calculate. Copy values exactly as printed, and use null when a value is not printed. Return JSON only.`;

export function crossUser(ids: string[], text: string): string {
  const list = ids.map((id) => `- ${id} | ${KPI_BY_ID[id].label} | unit: ${KPI_BY_ID[id].unit}`).join("\n");
  return `Re-read these KPIs from the pages below.

KPIs:
${list}

Return JSON in exactly this shape:
{"kpis":[{"id":"<id>","value":"<value as printed or null>","numeric":<number or null>,"unit":"<unit or null>"}]}

PAGES:
${text}`;
}

export const COMPARE_SYSTEM = `You compare the DISCLOSURE QUALITY of two or three BRSR reports using only the summaries provided. You never rate ESG performance.
Write in plain English for an MBA student, 150 words or fewer, no em dashes, no bullet symbols. Structure: one sentence verdict on who discloses better and why; then one or two short sentences per company on strengths and weaknesses; then one sentence reminding the reader that size and sector limit comparability.`;

export const ASK_SYSTEM = `You answer questions about one company's BRSR or annual report using ONLY the page text provided.
Rules: cite the PDF page for every fact like (p. 123). If the pages do not contain the answer, say so plainly and suggest what to look for. Never use outside knowledge about the company. Be concise: 120 words or fewer unless asked for more. Use plain English and no em dashes.`;

export function askUser(question: string, context: string, history: { role: string; text: string }[]): string {
  const h = history
    .slice(-4)
    .map((m) => `${m.role === "user" ? "Q" : "A"}: ${m.text}`)
    .join("\n");
  return `${h ? `EARLIER IN THIS CHAT\n${h}\n\n` : ""}PAGES\n${context}\n\nQUESTION\n${question}`;
}
