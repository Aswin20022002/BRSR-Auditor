"use client";

import { RotateCcw } from "lucide-react";
import { ANCHOR_IDS, DEFAULT_CONFIG, OPTIONAL_IDS, PART_KEYS, PRESETS, sameConfig, type KpiMode, type PartKey, type ScoreConfig } from "@/lib/score";
import { KPI_BY_ID } from "@/lib/kpis";

export const PART_LABEL: Record<PartKey, string> = {
  completeness: "Coverage",
  evidence: "Evidence",
  consistency: "Consistency",
  credibility: "Credibility",
  assurance: "Assurance",
};

export default function WeightsPanel({ cfg, onChange }: { cfg: ScoreConfig; onChange: (c: ScoreConfig) => void }) {
  const sum = PART_KEYS.reduce((s, k) => s + cfg.weights[k], 0) || 1;
  const active = PRESETS.find((p) => sameConfig(p.config, cfg));

  return (
    <details className="no-print rounded-2xl border border-line bg-surface shadow-lift">
      <summary className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
        <span className="font-display text-lg font-bold">Test the score with other weights</span>
        <span className="text-sm font-semibold text-brand-ink">{active ? active.label : "Custom"}</span>
      </summary>
      <div className="space-y-5 border-t border-line p-5">
        <p className="text-sm text-mute">
          Weights are a judgment call, so try others. The findings stay the same. Only the way they are combined changes, and every screen and export follows your setting.
        </p>

        <div role="group" aria-label="Weight presets" className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button key={p.id} type="button" aria-pressed={active?.id === p.id} title={p.note} onClick={() => onChange(p.config)} className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold ${active?.id === p.id ? "border-brand bg-brand text-white" : "border-line bg-surface hover:border-brand"}`}>
              {p.label}
            </button>
          ))}
        </div>
        {active && <p className="text-sm text-mute">{active.note}</p>}

        <div className="space-y-3">
          {PART_KEYS.map((k) => (
            <div key={k}>
              <div className="flex items-baseline justify-between text-sm">
                <label htmlFor={`w-${k}`} className="font-semibold">{PART_LABEL[k]}</label>
                <span className="tnum text-mute">{Math.round((100 * cfg.weights[k]) / sum)}% of the score</span>
              </div>
              <input id={`w-${k}`} type="range" min={0} max={60} step={5} value={cfg.weights[k]} onChange={(e) => onChange({ ...cfg, weights: { ...cfg.weights, [k]: Number(e.target.value) } })} className="mt-1 w-full accent-[var(--brand)]" />
            </div>
          ))}
        </div>

        <div>
          <label htmlFor="kpimode" className="text-sm font-semibold">How KPIs are weighted inside coverage and evidence</label>
          <select id="kpimode" className="field mt-1.5" value={cfg.kpiMode} onChange={(e) => onChange({ ...cfg, kpiMode: e.target.value as KpiMode })}>
            <option value="equal">Every KPI counts the same</option>
            <option value="importance">Anchor KPIs count more</option>
          </select>
          {cfg.kpiMode === "importance" && (
            <p className="mt-2 text-xs text-mute">
              Anchor KPIs count 3. These are absolute totals that other KPIs are derived from or checked against: {ANCHOR_IDS.map((i) => KPI_BY_ID[i].label).join(", ")}. Optional ratios count 1: {OPTIONAL_IDS.map((i) => KPI_BY_ID[i].label).join(", ")}. All others count 2.
            </p>
          )}
        </div>

        <button type="button" className="btn btn-ghost !min-h-[38px] text-sm" onClick={() => onChange(DEFAULT_CONFIG)} disabled={sameConfig(cfg, DEFAULT_CONFIG)}>
          <RotateCcw size={15} aria-hidden /> Back to default
        </button>
      </div>
    </details>
  );
}
