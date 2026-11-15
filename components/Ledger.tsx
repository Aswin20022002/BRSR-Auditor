"use client";

import { useEffect, useMemo, useState } from "react";
import { ATTRS, KPIS, KPI_BY_ID } from "@/lib/kpis";
import type { KpiResult } from "@/lib/types";
import { CrossPill, EvidencePill, StatusPill } from "./ui";

type Filter = "all" | "missing" | "attention" | "confirmed";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "missing", label: "Not found" },
  { id: "attention", label: "Needs a check" },
  { id: "confirmed", label: "Confirmed" },
];

function match(k: KpiResult, f: Filter) {
  if (f === "all") return true;
  if (f === "missing") return k.status === "not_found";
  if (f === "confirmed") return (k.status === "disclosed" || k.status === "partial") && k.evidence === "verified" && k.xcheck !== "differ";
  return k.status === "partial" || k.xcheck === "differ" || (k.status === "disclosed" && k.evidence !== "verified");
}

function change(k: KpiResult): string | null {
  if (k.numeric === null || k.prev_numeric == null || k.prev_numeric === 0) return null;
  const ch = ((k.numeric - k.prev_numeric) / Math.abs(k.prev_numeric)) * 100;
  return `${ch > 0 ? "+" : ""}${Math.round(ch * 10) / 10}%`;
}

export default function Ledger({ kpis, focusId, onView }: { kpis: KpiResult[]; focusId: string | null; onView?: (page: number, quote: string | null) => void }) {
  const [filter, setFilter] = useState<Filter>("all");
  const by = useMemo(() => new Map(kpis.map((k) => [k.id, k])), [kpis]);

  useEffect(() => {
    if (!focusId) return;
    setFilter("all");
    const t = setTimeout(() => {
      const el = document.getElementById(`kpi-${focusId}`);
      if (el) {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        el.classList.add("flash");
        (el.querySelector("summary") as HTMLElement | null)?.focus({ preventScroll: true });
        setTimeout(() => el.classList.remove("flash"), 2100);
      }
    }, 60);
    return () => clearTimeout(t);
  }, [focusId]);

  return (
    <div>
      <div className="no-print mb-4 flex flex-wrap items-center gap-2" role="group" aria-label="Filter KPIs">
        {FILTERS.map((f) => {
          const n = kpis.filter((k) => match(k, f.id)).length;
          return (
            <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)} className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold ${filter === f.id ? "border-brand bg-brand text-white" : "border-line bg-surface hover:border-brand"}`}>
              {f.label} <span className="tnum opacity-80">{n}</span>
            </button>
          );
        })}
      </div>

      <div className="space-y-7">
        {ATTRS.map((a) => {
          const rows = KPIS.filter((d) => d.attr === a.id).map((d) => by.get(d.id)).filter((k): k is KpiResult => !!k && match(k, filter));
          if (rows.length === 0) return null;
          return (
            <section key={a.id} aria-labelledby={`attr-${a.id}`}>
              <h3 id={`attr-${a.id}`} className="font-display text-xl font-bold">{a.name}</h3>
              <p className="mb-2 text-sm text-mute">{a.what}</p>
              <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
                {rows.map((k) => {
                  const def = KPI_BY_ID[k.id];
                  const shown = k.value ? `${k.value}${k.unit && k.unit !== "as reported" ? ` ${k.unit}` : ""}` : null;
                  return (
                    <li key={k.id} id={`kpi-${k.id}`} className="print-break">
                      <details>
                        <summary className="grid gap-x-4 gap-y-2 px-4 py-3 md:grid-cols-[minmax(0,1.1fr)_minmax(0,150px)_minmax(0,1.6fr)] md:items-center">
                          <span className="font-medium">{def.label}</span>
                          <span className="tnum font-display text-lg font-bold">
                            {shown ?? <span className="text-sm font-normal text-mute">No value</span>}
                            {k.prev_value && <span className="block font-sans text-xs font-normal text-mute">Last year {k.prev_value}{change(k) ? ` (${change(k)})` : ""}</span>}
                          </span>
                          <span className="flex flex-wrap items-center gap-1.5">
                            <StatusPill status={k.status} />
                            {(k.status === "disclosed" || k.status === "partial") && <EvidencePill evidence={k.evidence} />}
                            <CrossPill xcheck={k.xcheck} />
                          </span>
                        </summary>
                        <div className="space-y-2 border-t border-dashed border-line bg-paper/60 px-4 py-3 text-sm">
                          {k.quote ? (
                            <blockquote className="border-l-4 border-brand pl-3 italic">&ldquo;{k.quote}&rdquo;</blockquote>
                          ) : (
                            <p className="text-mute">{k.status === "not_found" ? `Where to look: ${def.hint}` : k.status === "not_analysed" ? "This part of the report could not be analysed. Run the audit again." : "No quote was given for this value."}</p>
                          )}
                          <p className="text-mute">
                            {k.year && <span>Year: {k.year}. </span>}
                            {k.page && <span>PDF page {k.page}. </span>}
                            {k.note && <span>{k.note} </span>}
                            {k.xcheck === "differ" && <span className="font-semibold text-bad">The second model read {k.xvalue ?? "a different value"} on the same page. Open the page and check the table.</span>}
                          </p>
                          {k.page && onView && (
                            <button type="button" className="btn btn-ghost !min-h-[36px] text-sm" onClick={() => onView(k.page as number, k.quote)}>View page {k.page}</button>
                          )}
                        </div>
                      </details>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
        {kpis.every((k) => !match(k, filter)) && <p className="rounded-xl border border-line bg-surface p-6 text-center text-mute">Nothing matches this filter.</p>}
      </div>
    </div>
  );
}
