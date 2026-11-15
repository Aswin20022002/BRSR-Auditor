import { PART_KEYS, type PartKey, type Weights } from "@/lib/score";
import type { Scores } from "@/lib/types";
import { Card, Pill, bandColor } from "./ui";

const ROWS: Record<PartKey, { label: string; help: string }> = {
  completeness: { label: "Coverage", help: "How many of the 46 BRSR Core KPIs are disclosed." },
  evidence: { label: "Evidence", help: "Share of values whose quote is confirmed in the PDF." },
  consistency: { label: "Consistency", help: "Arithmetic and logic tests that passed." },
  credibility: { label: "Credibility", help: "Fewer greenwashing flags means a higher score." },
  assurance: { label: "Assurance", help: "Level of independent assurance on BRSR Core." },
};

function Ring({ value, band }: { value: number; band: string }) {
  const r = 56;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-[148px] w-[148px] flex-none" role="img" aria-label={`Overall score ${value} out of 100, ${band}`}>
      <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
        <circle cx="70" cy="70" r={r} fill="none" stroke="var(--line)" strokeWidth="13" />
        <circle cx="70" cy="70" r={r} fill="none" stroke={bandColor(band)} strokeWidth="13" strokeLinecap="round" strokeDasharray={`${(value / 100) * c} ${c}`} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="font-display text-5xl font-bold leading-none tnum">{value}</div>
          <div className="mt-1 text-sm font-semibold" style={{ color: bandColor(band) }}>{band}</div>
        </div>
      </div>
    </div>
  );
}

export default function ScorePanel({ scores, weights, custom }: { scores: Scores; weights: Weights; custom: boolean }) {
  const sum = PART_KEYS.reduce((s, k) => s + weights[k], 0) || 1;
  return (
    <Card className="p-5">
      <div className="flex items-center gap-5">
        <Ring value={scores.overall} band={scores.band} />
        <div>
          <h2 className="font-display text-xl font-bold">Disclosure quality</h2>
          <p className="mt-1 text-sm text-mute">Out of 100. This rates how well the report discloses and backs up its numbers, not how green the company is.</p>
          {custom && <div className="mt-2"><Pill tone="viol">Non-default weights in use</Pill></div>}
        </div>
      </div>
      <ul className="mt-5 space-y-3.5">
        {PART_KEYS.map((k) => {
          const v = scores[k] as number | null;
          return (
            <li key={k}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-semibold">
                  {ROWS[k].label} <span className="font-normal text-mute">weight {Math.round((100 * weights[k]) / sum)}%</span>
                </span>
                <span className="text-sm font-bold tnum">{v === null ? "Not available" : v}</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-line" aria-hidden>
                <div className="h-full rounded-full" style={{ width: `${v ?? 0}%`, background: v === null ? "transparent" : v >= 65 ? "var(--ok)" : v >= 40 ? "var(--warn)" : "var(--bad)" }} />
              </div>
              <p className="mt-1 text-xs text-mute">{ROWS[k].help}</p>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
