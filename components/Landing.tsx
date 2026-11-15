"use client";

import { useMemo, useRef, useState } from "react";
import { FileUp, ShieldCheck, Layers, Search } from "lucide-react";
import Mosaic, { Legend } from "./Mosaic";
import { Card } from "./ui";
import { sampleFabrics } from "@/lib/sample";
import type { Audit } from "@/lib/types";
import type { Health } from "@/lib/api";

export default function Landing({
  onFile,
  onSample,
  onOpen,
  history,
  health,
  error,
}: {
  onFile: (f: File) => void;
  onSample: () => void;
  onOpen: (a: Audit) => void;
  history: Audit[];
  health: Health | null;
  error: string | null;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const specimen = useMemo(() => sampleFabrics(), []);
  const noKeys = health && !health.gemini && !health.grok;
  const oneKey = health && (health.gemini !== health.grok);

  const pick = (f?: File | null) => {
    if (f) onFile(f);
  };

  return (
    <div>
      <div className="grid items-start gap-8 pt-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-12 lg:pt-10">
        <div>
          <h1 className="font-display text-4xl font-extrabold sm:text-5xl lg:text-[3.4rem]">Find out what a BRSR report really tells you.</h1>
          <p className="mt-5 max-w-xl text-lg text-mute">
            Upload a company&apos;s BRSR or annual report PDF. You get a page-cited check of all nine SEBI BRSR Core attributes, the red flags, and a list of what to fix.
          </p>

          <label
            htmlFor="pdf"
            onDragOver={(e) => { e.preventDefault(); setOver(true); }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files?.[0]); }}
            className={`mt-7 flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-6 py-9 text-center transition-colors focus-within:outline focus-within:outline-[3px] focus-within:outline-marigold ${over ? "border-brand bg-[#e5e9fc]" : "border-[#b9c2e6] bg-surface hover:border-brand"}`}
          >
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-[#e5e9fc] text-brand"><FileUp aria-hidden /></span>
            <span className="font-display text-xl font-bold">Drop a PDF here or choose a file</span>
            <span className="max-w-sm text-sm text-mute">Text PDFs work best, up to about 600 pages. Scanned image PDFs need OCR first.</span>
            <input ref={input} id="pdf" type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
            <span className="btn btn-primary mt-1" aria-hidden>Choose a PDF</span>
          </label>

          {error && <p role="alert" className="mt-3 rounded-xl bg-[#f9e3df] p-3 text-sm font-medium text-bad">{error}</p>}
          {noKeys && <p className="mt-3 rounded-xl bg-[#fbeed6] p-3 text-sm text-warn">No API keys were found on this server. Add GEMINI_API_KEY and XAI_API_KEY in Vercel to audit your own PDFs. The sample audit below still works.</p>}
          {oneKey && <p className="mt-3 rounded-xl bg-[#e8ebf5] p-3 text-sm text-mute">Only one AI key is set, so one model will do both the reading and the review. Add the second key for an independent cross-check.</p>}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="button" className="btn btn-ghost" onClick={onSample}>Try a sample audit</button>
            <span className="text-sm text-mute">No upload needed. Uses a fictional company.</span>
          </div>
        </div>

        <Card className="p-5 sm:p-6">
          <h2 className="font-display text-xl font-bold">What you get: one square per KPI</h2>
          <p className="mb-5 mt-1 text-sm text-mute">Sample audit of a fictional company. Each square is one BRSR Core KPI, grouped by SEBI attribute.</p>
          <Mosaic kpis={specimen.kpis} />
          <div className="mt-5 border-t border-line pt-4"><Legend /></div>
        </Card>
      </div>

      {history.length > 0 && (
        <section className="mt-12" aria-labelledby="recent">
          <h2 id="recent" className="font-display text-2xl font-bold">Your recent audits</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {history.slice(0, 6).map((a) => (
              <li key={a.id}>
                <button type="button" onClick={() => onOpen(a)} className="w-full rounded-xl border border-line bg-surface p-4 text-left hover:border-brand">
                  <span className="block font-semibold">{a.meta.company ?? a.fileName}</span>
                  <span className="mt-0.5 block text-sm text-mute">{a.meta.fy ?? "Year not read"}, score {a.scores.overall} ({a.scores.band})</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-14" aria-labelledby="how">
        <h2 id="how" className="font-display text-2xl font-bold">How it works</h2>
        <ol className="mt-5 grid gap-4 md:grid-cols-3">
          {[
            { icon: Layers, title: "Upload and find the BRSR pages", body: "Your PDF is read inside your browser. Only the pages that look like BRSR tables and narrative are sent for analysis." },
            { icon: Search, title: "Read, test and review", body: "Gemini pulls out 46 KPIs with quotes. Plain arithmetic rules test them. Grok then reviews claims and wording as a second opinion." },
            { icon: ShieldCheck, title: "Check the evidence", body: "Every quote is searched for in your PDF. Anything the AI cannot back with real text is marked, so nothing is taken on trust." },
          ].map((s, i) => (
            <li key={s.title} className="rounded-2xl border border-line bg-surface p-5">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-brand font-display font-bold text-white" aria-hidden>{i + 1}</span>
                <s.icon size={20} className="text-brand" aria-hidden />
              </div>
              <h3 className="mt-3 font-display text-lg font-bold">{s.title}</h3>
              <p className="mt-1.5 text-sm text-mute">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
