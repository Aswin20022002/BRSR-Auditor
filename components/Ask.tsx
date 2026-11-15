"use client";

import { useRef, useState } from "react";
import { Send } from "lucide-react";
import { postJson } from "@/lib/api";
import { retrievePages } from "@/lib/select";
import type { PdfDoc } from "@/lib/pdf";

interface Msg {
  role: "user" | "ai";
  text: string;
}

const IDEAS = [
  "What are the Scope 1 and Scope 2 emissions and how do they compare with last year?",
  "Does the company have a net zero target with a baseline year?",
  "Who gave assurance on BRSR Core and at what level?",
  "How many safety incidents and fatalities were reported?",
];

function withCitations(text: string, onPage: (p: number) => void) {
  const parts = text.split(/(\(p\.\s?\d+(?:\s*[,\-and]+\s*\d+)*\))/g);
  return parts.map((part, i) => {
    const m = part.match(/^\(p\.\s?(\d+)/);
    if (m) {
      return (
        <button key={i} type="button" className="mx-0.5 rounded-full bg-[#e5e9fc] px-2 py-0.5 text-xs font-bold text-brand-ink hover:bg-brand hover:text-white" onClick={() => onPage(Number(m[1]))}>
          {part.replace(/[()]/g, "")}
        </button>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export default function Ask({ doc, onAttach, onPage }: { doc: PdfDoc | null; onAttach: (f: File) => void; onPage: (p: number) => void }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);

  if (!doc) {
    return (
      <div className="rounded-xl border border-line bg-surface p-8 text-center">
        <p className="font-display text-xl font-bold">Attach the PDF to ask questions</p>
        <p className="mx-auto mt-1 max-w-md text-mute">Answers are built from the report&apos;s own pages. The PDF is read in your browser and is not stored anywhere.</p>
        <label className="btn btn-primary mt-4 cursor-pointer">
          Choose the PDF
          <input type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) onAttach(f); e.target.value = ""; }} />
        </label>
      </div>
    );
  }

  const ask = async (question: string) => {
    const text = question.trim();
    if (!text || busy) return;
    setErr(null);
    setQ("");
    const history = msgs.map((m) => ({ role: m.role === "user" ? "user" : "ai", text: m.text }));
    setMsgs((m) => [...m, { role: "user", text }]);
    setBusy(true);
    try {
      const ctx = retrievePages(doc.pages, text);
      const r = await postJson<{ answer: string }>("/api/ask", { question: text, context: ctx.text, history });
      setMsgs((m) => [...m, { role: "ai", text: r.answer }]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
      setTimeout(() => end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
    }
  };

  return (
    <div className="no-print">
      <p className="mb-4 max-w-2xl text-mute">Ask anything about this report. Answers use only the report&apos;s pages and cite them, so you can click a page chip to check.</p>
      {msgs.length === 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {IDEAS.map((i) => (
            <button key={i} type="button" onClick={() => ask(i)} className="rounded-full border border-line bg-surface px-3.5 py-2 text-left text-sm font-medium hover:border-brand">{i}</button>
          ))}
        </div>
      )}
      <div className="space-y-3" aria-live="polite">
        {msgs.map((m, i) => (
          <div key={i} className={`max-w-3xl rounded-2xl px-4 py-3 ${m.role === "user" ? "ml-auto bg-brand text-white" : "border border-line bg-surface"}`}>
            {m.role === "ai" ? <p className="whitespace-pre-wrap leading-relaxed">{withCitations(m.text, onPage)}</p> : <p>{m.text}</p>}
          </div>
        ))}
        {busy && <div className="max-w-3xl rounded-2xl border border-line bg-surface px-4 py-3 text-mute">Reading the relevant pages...</div>}
        {err && <p role="alert" className="rounded-xl bg-[#f9e3df] p-3 text-sm font-medium text-bad">{err}</p>}
        <div ref={end} />
      </div>
      <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); ask(q); }}>
        <label htmlFor="ask" className="sr-only">Your question</label>
        <input id="ask" className="field" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask about emissions, targets, assurance, safety..." maxLength={400} />
        <button className="btn btn-primary" disabled={busy || !q.trim()}><Send size={16} aria-hidden /> Ask</button>
      </form>
    </div>
  );
}
