"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

export interface ViewTarget {
  page: number;
  quote?: string | null;
}

/** Shows the exact text of one PDF page with the quoted passage highlighted. */
export default function PageViewer({ pages, target, onClose }: { pages: string[]; target: ViewTarget | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (target && !d.open) d.showModal();
    if (!target && d.open) d.close();
  }, [target]);

  const text = target ? pages[target.page - 1] ?? "" : "";
  let before = text;
  let hit = "";
  let after = "";
  if (target?.quote) {
    const i = text.toLowerCase().indexOf(target.quote.toLowerCase().slice(0, Math.min(target.quote.length, 60)));
    if (i >= 0) {
      const end = Math.min(text.length, i + Math.max(target.quote.length, 20));
      before = text.slice(0, i);
      hit = text.slice(i, end);
      after = text.slice(end);
    }
  }

  return (
    <dialog ref={ref} onClose={onClose} className="h-[min(86vh,760px)] w-[min(94vw,780px)] rounded-2xl border border-line p-0 text-ink" aria-labelledby="pv-title">
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
          <h2 id="pv-title" className="font-display text-lg font-bold">PDF page {target?.page}</h2>
          <button type="button" className="rounded-lg p-2 hover:bg-paper" onClick={onClose} aria-label="Close page view"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-auto whitespace-pre-wrap px-5 py-4 text-sm leading-relaxed">
          {text ? (<>{before}{hit && <mark className="rounded bg-marigold/60 px-0.5">{hit}</mark>}{after}</>) : "This page has no readable text."}
        </div>
      </div>
    </dialog>
  );
}
