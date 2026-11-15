import { ATTRS, KPIS } from "@/lib/kpis";
import { ANCHOR_IDS, DEFAULT_WEIGHTS, OPTIONAL_IDS, PRESETS } from "@/lib/score";
import { KPI_BY_ID } from "@/lib/kpis";

export const metadata = { title: "Method: how scores, checks and evidence work" };

const RULES = [
  "Waste categories add up to the stated total",
  "Recovered plus disposed waste equals waste generated",
  "Water balance: withdrawal minus discharge equals consumption",
  "Every percentage sits between 0 and 100",
  "Safety numbers are logically consistent",
  "Upheld harassment complaints do not exceed complaints received",
  "Scope 1 and Scope 2 are not identical",
  "Every intensity ratio can be traced to a base number",
  "All KPIs refer to the same financial year",
  "Assurance claim matches how complete the disclosure is",
  "No unexplained year-on-year jumps",
  "Two AI models read the same headline numbers",
  "Basic company facts were captured",
];

export default function Method() {
  return (
    <div className="max-w-4xl pt-4">
      <h1 className="font-display text-4xl font-extrabold sm:text-5xl">How the audit works</h1>
      <p className="mt-4 text-lg text-mute">Nothing here is a black box. This page explains each step so you can defend the results in a viva or a report.</p>

      <h2 className="mt-12 font-display text-2xl font-bold">The pipeline</h2>
      <ol className="mt-4 space-y-3">
        {[
          ["Read in the browser", "pdf.js extracts text page by page on your device. The PDF itself is never uploaded."],
          ["Find the BRSR pages", "Pages are ranked by BRSR vocabulary for each topic, with a boost inside the detected BRSR section. Only the best pages go to the AI, each tagged with its PDF page number."],
          ["Extract", "Gemini returns 46 KPIs as JSON with value, unit, year, page, a verbatim quote and the previous year figure. It is told to leave a KPI as not found rather than guess."],
          ["Cross-check", "Grok independently re-reads up to 14 headline numbers (emissions, energy, water, waste, safety and so on) from the cited pages. If the two models read different numbers, the KPI is marked for checking."],
          ["Verify", "Each quote is searched in the PDF text. The reported number must also appear on that page. Results: confirmed, partly matched, or not found."],
          ["Test", "Thirteen rules run on the numbers, including year-on-year jumps and whether two models agree. Each is plain code, so results are reproducible."],
          ["Review", "Grok receives the extracted data, rule results, claims and narrative and writes flags, claim ratings and a fix list. It must quote the report for wording based flags."],
          ["Score", "The five sub scores are combined with the weights below."],
        ].map(([t, d], i) => (
          <li key={t} className="flex gap-4 rounded-xl border border-line bg-surface p-4">
            <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-brand font-display font-bold text-white" aria-hidden>{i + 1}</span>
            <div><p className="font-semibold">{t}</p><p className="text-sm text-mute">{d}</p></div>
          </li>
        ))}
      </ol>

      <h2 className="mt-12 font-display text-2xl font-bold">Score formula</h2>
      <p className="mt-2 text-mute">The overall score is a weighted average of five parts, each from 0 to 100. If a part could not be computed, for example because the review failed, its weight is shared out over the others.</p>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-surface">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead><tr className="border-b border-line bg-paper"><th className="px-4 py-3">Part</th><th className="px-4 py-3">Weight</th><th className="px-4 py-3">How it is computed</th></tr></thead>
          <tbody>
            {[
              ["Coverage", DEFAULT_WEIGHTS.completeness, "Disclosed KPIs count 1, partial count 0.5, not found count 0. Not applicable and not analysed KPIs are left out."],
              ["Evidence", DEFAULT_WEIGHTS.evidence, "Among KPIs that were found: confirmed quote 1, partly matched 0.5, otherwise 0. If the second model read a different number, that credit is halved."],
              ["Consistency", DEFAULT_WEIGHTS.consistency, "100 minus 18 for each failed rule and 6 for each warning. Rules that cannot be tested are ignored."],
              ["Credibility", DEFAULT_WEIGHTS.credibility, "100 minus 15 per high risk flag, 7 per medium and 2 per low."],
              ["Assurance", DEFAULT_WEIGHTS.assurance, "Reasonable 100, limited 60, unclear 30, none 0."],
            ].map(([p, w, d]) => (
              <tr key={p as string} className="border-b border-line last:border-0"><th scope="row" className="px-4 py-3 font-semibold">{p}</th><td className="px-4 py-3 tnum">{w as number}%</td><td className="px-4 py-3 text-mute">{d}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-mute">Bands: Strong 80 and above, Solid 65 to 79, Patchy 45 to 64, Weak below 45. The score rates disclosure quality. It says nothing about how well the company actually performs on ESG.</p>

      <h2 className="mt-12 font-display text-2xl font-bold">Why these weights, and how to test them</h2>
      <p className="mt-2 text-mute">
        The weights are a reasoned judgment, not a result fitted to data. The ordering follows one principle: what code can prove or compare against the PDF counts more than what depends on an AI&apos;s judgment. Because the weights are a choice, the app lets you change them and see what happens.
      </p>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {PRESETS.map((p) => (
          <li key={p.id} className="rounded-xl border border-line bg-surface px-4 py-3 text-sm"><span className="font-semibold">{p.label}.</span> <span className="text-mute">{p.note}</span></li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-mute">
        Inside coverage and evidence, every KPI counts the same by default. You can switch to importance weighting. The criterion is logical: anchor KPIs are absolute totals that other KPIs are derived from or checked against, so ratios and breakdowns cannot be verified without them.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-line bg-surface p-4 text-sm"><p className="font-semibold">Anchor KPIs, count 3</p><p className="mt-1 text-mute">{ANCHOR_IDS.map((i) => KPI_BY_ID[i].label).join(", ")}.</p></div>
        <div className="rounded-xl border border-line bg-surface p-4 text-sm"><p className="font-semibold">Optional ratios, count 1</p><p className="mt-1 text-mute">{OPTIONAL_IDS.map((i) => KPI_BY_ID[i].label).join(", ")}. These do not exist for every business. All other KPIs count 2.</p></div>
      </div>
      <p className="mt-3 text-sm text-mute">
        On the Compare page, the same audits are rescored under all four weightings. If the order of companies does not change, the conclusion does not depend on the weights, which is the strongest defence a rubric can have.
      </p>

      <h2 className="mt-12 font-display text-2xl font-bold">Confidence in the audit itself</h2>
      <p className="mt-2 text-mute">
        Every audit also shows how much to trust the tool&apos;s reading, separately from the disclosure score. It counts four tests: at least 85% of quotes found in the PDF, at least 90% agreement between the two models on headline numbers, a BRSR section located, and every AI step completed. All four is High, three is Medium, fewer is Low. A low-confidence audit tells you to check the pages yourself.
      </p>

      <h2 className="mt-12 font-display text-2xl font-bold">The thirteen consistency rules</h2>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {RULES.map((r) => <li key={r} className="rounded-xl border border-line bg-surface px-4 py-3 text-sm">{r}</li>)}
      </ul>

      <h2 className="mt-12 font-display text-2xl font-bold">The 46 KPIs</h2>
      <p className="mt-2 text-mute">The checklist follows the nine attributes of SEBI&apos;s BRSR Core framework (circular of 12 July 2023). It is a working checklist built for this tool, so confirm exact definitions against the SEBI annexure before you cite it formally.</p>
      <div className="mt-4 space-y-4">
        {ATTRS.map((a) => (
          <details key={a.id} className="rounded-xl border border-line bg-surface">
            <summary className="flex items-center justify-between gap-3 px-4 py-3 font-semibold">
              {a.name}
              <span className="text-sm font-normal text-mute">{KPIS.filter((k) => k.attr === a.id).length} KPIs</span>
            </summary>
            <ul className="divide-y divide-line border-t border-line text-sm">
              {KPIS.filter((k) => k.attr === a.id).map((k) => (
                <li key={k.id} className="px-4 py-2.5"><span className="font-medium">{k.label}</span> <span className="text-mute">Unit: {k.unit}. {k.hint}</span></li>
              ))}
            </ul>
          </details>
        ))}
      </div>

      <h2 className="mt-12 font-display text-2xl font-bold">Limits you should know about</h2>
      <ul className="mt-4 list-disc space-y-2 pl-6 text-mute">
        <li>PDF tables sometimes flatten badly. A value can be misread even when its quote is real. The confirmed badge proves the text exists, not that the model understood it.</li>
        <li>Page numbers are PDF page numbers, which differ from the numbers printed on the page.</li>
        <li>Scanned PDFs need OCR first. Very large annual reports are trimmed to the most relevant pages.</li>
        <li>Intensity ratios depend on a PPP adjustment that varies by company, so they are checked for traceability, not recomputed.</li>
        <li>Free API tiers have rate limits. If a call fails, the app says which part is missing and offers a retry.</li>
        <li>This is a decision aid for study and screening. It is not assurance, rating or investment advice.</li>
      </ul>
    </div>
  );
}
