import { CheckCircle2, CircleDashed, MinusCircle } from "lucide-react";

export const metadata = { title: "Benchmark: how BRSR Auditor compares with existing tools" };

type V = "yes" | "partly" | "none";

const COLS = ["BRSR reporting platforms", "Greenwashing detectors", "Research prototypes", "ESG ratings and data", "BRSR Auditor"];

const ROWS: { cap: string; v: V[] }[] = [
  { cap: "Built around the BRSR Core attributes and KPIs", v: ["yes", "none", "partly", "none", "yes"] },
  { cap: "Audits a published report from the outside, with no setup", v: ["none", "partly", "partly", "none", "yes"] },
  { cap: "Free and instant to try", v: ["none", "none", "partly", "none", "yes"] },
  { cap: "Every value linked to a page and a source quote", v: ["partly", "partly", "partly", "partly", "yes"] },
  { cap: "Checks that each quote really exists in the PDF", v: ["none", "none", "partly", "none", "yes"] },
  { cap: "Arithmetic and logic tests on the numbers", v: ["partly", "partly", "none", "partly", "yes"] },
  { cap: "Tests claims for number, baseline and deadline", v: ["none", "yes", "yes", "none", "yes"] },
  { cap: "Compares assurance level with how complete the disclosure is", v: ["none", "none", "none", "none", "yes"] },
  { cap: "Second AI model re-reads the numbers and reviews the first", v: ["none", "none", "partly", "none", "yes"] },
  { cap: "Prioritised fix list", v: ["partly", "none", "none", "none", "yes"] },
  { cap: "Side by side comparison of companies", v: ["partly", "yes", "yes", "yes", "yes"] },
  { cap: "Plain English questions answered with page citations", v: ["none", "none", "yes", "none", "yes"] },
  { cap: "PDF stays in the browser", v: ["none", "none", "none", "none", "yes"] },
];

const GAPS: { gap: string; why: string; fix: string }[] = [
  {
    gap: "Tools serve the company filing the report, not the person reading it",
    why: "Credibl, Newtral, Benchmark Gensuite, EcoActive, Deloitte on SAP and similar products collect data inside a company and produce the filing. An analyst, investor or student holding a published PDF has little to use.",
    fix: "Upload any BRSR or annual report PDF and get an audit with no setup, no data entry and no account.",
  },
  {
    gap: "Greenwashing detectors are generic and often gated",
    why: "msg Greenwashing Detector and GaiaLens are enterprise products, and research tools such as EmeraldApp and InferESG are built for global report styles, not the SEBI BRSR format.",
    fix: "Checks are anchored on the nine BRSR Core attributes and 46 KPIs, plus BRSR specific logic such as assurance level against coverage.",
  },
  {
    gap: "AI can invent evidence, and users cannot tell",
    why: "Document AI tools return confident numbers. Public material rarely shows a test that the quoted text exists in the source.",
    fix: "Every quote is searched for in the PDF text, and the number must appear on that page. Anything that fails is shown as unconfirmed and lowers the Evidence score.",
  },
  {
    gap: "Narrative claims are never tested against the numbers",
    why: "A net zero pledge can sit next to data that does not support it, and most tools read text and tables separately.",
    fix: "A claims ledger rates each claim for number, baseline and deadline, and the reviewer flags claims that conflict with the KPI table.",
  },
  {
    gap: "Arithmetic errors slip through",
    why: "Waste categories that exceed the total, or water consumption above withdrawal, are easy for a person to miss across 80 pages.",
    fix: "Thirteen tests run on the extracted numbers, including year-on-year jumps and a two-model agreement check. They are plain code, so results are reproducible.",
  },
  {
    gap: "One model gives one opinion",
    why: "A single LLM that reads and judges its own extraction is marking its own homework.",
    fix: "Gemini reads and extracts. Grok independently re-reads the headline numbers and reviews the wording. Disagreements are marked on the KPI. If one key is missing the app falls back to a single model and says so.",
  },
  {
    gap: "Scores are opaque",
    why: "Ratings from different providers often disagree and rarely show how a number was reached.",
    fix: "The score formula, weights and every rule are published on the Method page, and each sub score has a plain English explanation.",
  },
  {
    gap: "Findings are not actionable",
    why: "Most outputs describe a problem and stop.",
    fix: "A fix list ranks actions by impact and effort, and results export to PDF, CSV and JSON.",
  },
  {
    gap: "No easy peer view",
    why: "Comparing two reports means rebuilding the work by hand.",
    fix: "The Compare page lines up any saved audits KPI by KPI, with attribute coverage side by side.",
  },
];

const SOURCES: [string, string][] = [
  ["Benchmark Gensuite, BRSR reporting software", "https://benchmarkgensuite.com/brsr-reporting-software/"],
  ["Deloitte BRSR reporting service on SAP BTP", "https://www.sap.com/india/products/technology-platform/partners/deloitte-touche-tohmatsu-india-llp-sustainability-reporting-regulatory-reporting-framework-brsr.html"],
  ["The Sustainability Cloud, top BRSR software guide", "https://www.thesustainabilitycloud.com/blog/top-5-brsr-softwares/"],
  ["Achilles, BRSR automation", "https://achilles.com/brsr"],
  ["msg Greenwashing Detector", "https://msg-global.com/solutions/msg-greenwashing-detector"],
  ["GaiaLens AI greenwashing analytics, Portfolio Adviser", "https://future.portfolio-adviser.com/?p=352816"],
  ["EmeraldMind, arXiv 2512.11506", "https://arxiv.org/abs/2512.11506"],
  ["InferESG overview, Scott Logic", "https://blog.scottlogic.com/2025/03/20/inferesg-overview.html"],
  ["JoelJosy/brsr-analysis, NLP gap analysis of four IT services BRSRs", "https://github.com/JoelJosy/brsr-analysis"],
  ["Clarity AI", "https://www.clarity.ai"],
  ["SEBI, BRSR Core framework circular, 12 July 2023", "https://www.sebi.gov.in/legal/circulars/jul-2023/brsr-core-framework-for-assurance-and-esg-disclosures-for-value-chain_73854.html"],
];

function Mark({ v }: { v: V }) {
  if (v === "yes") return <span className="inline-flex items-center gap-1.5 font-semibold text-ok"><CheckCircle2 size={18} aria-hidden /> Yes</span>;
  if (v === "partly") return <span className="inline-flex items-center gap-1.5 font-semibold text-warn"><MinusCircle size={18} aria-hidden /> Partly</span>;
  return <span className="inline-flex items-center gap-1.5 text-mute"><CircleDashed size={18} aria-hidden /> Not evident</span>;
}

export default function Benchmark() {
  return (
    <div className="pt-4">
      <h1 className="max-w-3xl font-display text-4xl font-extrabold sm:text-5xl">How existing tools compare, and the gaps we closed</h1>
      <p className="mt-4 max-w-2xl text-lg text-mute">
        We reviewed public product pages, papers and code for BRSR software, greenwashing detectors, research prototypes and ESG data providers. Five groups of tools came out of that.
      </p>
      <p className="mt-2 max-w-2xl text-sm text-mute">
        Read &ldquo;Not evident&rdquo; as &ldquo;we could not find this in public material&rdquo;, which is not the same as proof that it is absent. Group level ratings are a summary, and individual products vary. Reviewed in November 2026.
      </p>

      <section className="mt-10" aria-labelledby="matrix">
        <h2 id="matrix" className="font-display text-2xl font-bold">Capability comparison</h2>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-surface shadow-lift">
          <table className="w-full min-w-[860px] border-collapse text-left text-sm">
            <caption className="sr-only">Capabilities by group of tools</caption>
            <thead>
              <tr className="border-b border-line bg-paper">
                <th scope="col" className="w-[30%] px-4 py-3 font-display text-base">Capability</th>
                {COLS.map((c, i) => (
                  <th key={c} scope="col" className={`px-3 py-3 font-display text-base ${i === COLS.length - 1 ? "bg-[#e5e9fc] text-brand-ink" : ""}`}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.cap} className="border-b border-line last:border-0">
                  <th scope="row" className="px-4 py-3 font-medium">{r.cap}</th>
                  {r.v.map((v, i) => (
                    <td key={i} className={`px-3 py-3 ${i === r.v.length - 1 ? "bg-[#f1f3fe]" : ""}`}><Mark v={v} /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-12" aria-labelledby="who">
        <h2 id="who" className="font-display text-2xl font-bold">Who is in each group</h2>
        <dl className="mt-4 grid gap-4 md:grid-cols-2">
          {[
            ["BRSR reporting platforms", "Credibl, Newtral AI, EcoActive, Benchmark Gensuite, The Sustainability Cloud, Deloitte on SAP BTP, Achilles. They provide BRSR templates, workflows, audit trails and in some cases AI anomaly detection or auto-population. Plans typically include setup, configuration and training."],
            ["Greenwashing detectors", "msg Greenwashing Detector on SAP BTP (upload a sustainability report, book a demo) and GaiaLens (investor analytics built with aberdeen and HSBC)."],
            ["Research prototypes", "EmeraldApp and EmeraldMind (retrieval and knowledge graph, claim level verdicts), InferESG (multi-agent assistant), DeepGreen and academic artefacts, plus student BRSR NLP projects such as a gap analysis of four IT services reports."],
            ["ESG ratings and data", "Clarity AI, Sustainalytics, MSCI and similar. Wide coverage and ratings, but ratings differ between providers and they are not a page level audit of one report."],
          ].map(([t, d]) => (
            <div key={t} className="rounded-xl border border-line bg-surface p-4">
              <dt className="font-display text-lg font-bold">{t}</dt>
              <dd className="mt-1 text-sm text-mute">{d}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-12" aria-labelledby="gaps">
        <h2 id="gaps" className="font-display text-2xl font-bold">Gaps found and how BRSR Auditor closes each one</h2>
        <ul className="mt-4 space-y-3">
          {GAPS.map((g) => (
            <li key={g.gap} className="grid gap-4 rounded-2xl border border-line bg-surface p-5 md:grid-cols-2">
              <div>
                <h3 className="font-display text-lg font-bold">{g.gap}</h3>
                <p className="mt-1.5 text-sm text-mute">{g.why}</p>
              </div>
              <div className="rounded-xl bg-[#e3f4ef] p-4">
                <p className="text-sm font-bold text-ok">How it is closed</p>
                <p className="mt-1 text-sm">{g.fix}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12" aria-labelledby="src">
        <h2 id="src" className="font-display text-2xl font-bold">Sources</h2>
        <ul className="mt-3 space-y-1.5 text-sm">
          {SOURCES.map(([t, u]) => (
            <li key={u}><a className="font-medium text-brand underline" href={u} target="_blank" rel="noreferrer">{t}</a></li>
          ))}
        </ul>
      </section>
    </div>
  );
}
