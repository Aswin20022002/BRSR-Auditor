"use client";

import { Check, CircleHelp, Minus, X } from "lucide-react";
import { ATTRS, KPIS, KPI_BY_ID } from "@/lib/kpis";
import type { KpiResult } from "@/lib/types";

type CellState = "verified" | "check" | "partial" | "missing" | "na" | "pending";

export function cellState(k: KpiResult | undefined): CellState {
  if (!k || k.status === "not_analysed") return "pending";
  if (k.status === "not_found") return "missing";
  if (k.status === "not_applicable") return "na";
  if (k.status === "partial") return "partial";
  return k.evidence === "verified" && k.xcheck !== "differ" ? "verified" : "check";
}

const WORD: Record<CellState, string> = {
  verified: "disclosed, quote confirmed in the PDF",
  check: "disclosed, but needs a check (quote unconfirmed or the second model disagrees)",
  partial: "partly disclosed",
  missing: "not found in the report",
  na: "not applicable",
  pending: "not analysed yet",
};

function Glyph({ s }: { s: CellState }) {
  const p = { size: 16, strokeWidth: 3, "aria-hidden": true } as const;
  if (s === "verified") return <Check {...p} />;
  if (s === "check") return <CircleHelp {...p} />;
  if (s === "missing") return <X {...p} />;
  if (s === "na") return <Minus {...p} />;
  return null;
}

export function Legend() {
  const items: [CellState, string][] = [
    ["verified", "Disclosed and confirmed"],
    ["check", "Disclosed, needs a check"],
    ["partial", "Partial"],
    ["missing", "Not found"],
  ];
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-mute" aria-label="Legend">
      {items.map(([s, label]) => (
        <li key={s} className="flex items-center gap-2">
          <span className={`cell cell-${s}`} style={{ width: 20, height: 20, borderRadius: 5 }} aria-hidden>
            <Glyph s={s} />
          </span>
          {label}
        </li>
      ))}
    </ul>
  );
}

export default function Mosaic({
  kpis,
  onPick,
  animate = false,
}: {
  kpis: KpiResult[];
  onPick?: (id: string) => void;
  animate?: boolean;
}) {
  const by = new Map(kpis.map((k) => [k.id, k]));
  return (
    <div className="space-y-3">
      {ATTRS.map((a) => {
        const items = KPIS.filter((d) => d.attr === a.id);
        return (
          <div key={a.id} className="grid items-center gap-x-4 gap-y-1.5 sm:grid-cols-[210px_1fr]">
            <div className="text-sm font-semibold leading-tight">{a.name}</div>
            <div className="flex flex-wrap gap-1.5">
              {items.map((d) => {
                const k = by.get(d.id);
                const s = cellState(k);
                const label = `${KPI_BY_ID[d.id].label}: ${WORD[s]}`;
                const cls = `cell cell-${s} ${animate && s !== "pending" ? "cell-new" : ""}`;
                return onPick ? (
                  <button key={d.id} type="button" className={cls} title={label} aria-label={label} onClick={() => onPick(d.id)}>
                    <Glyph s={s} />
                  </button>
                ) : (
                  <span key={d.id} className={cls} title={label} role="img" aria-label={label}>
                    <Glyph s={s} />
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
