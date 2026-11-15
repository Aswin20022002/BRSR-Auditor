"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Sparkles, Trash2 } from "lucide-react";
import { ATTRS, KPIS } from "@/lib/kpis";
import { deleteAudit, loadAudits, saveAudit } from "@/lib/store";
import { sampleCement, sampleFabrics } from "@/lib/sample";
import { PRESETS, rescore, sameConfig, DEFAULT_CONFIG } from "@/lib/score";
import { useScoreConfig } from "@/lib/useConfig";
import type { Audit } from "@/lib/types";
import { Card, Pill, bandColor } from "@/components/ui";
import { postJson } from "@/lib/api";
import { KPI_BY_ID } from "@/lib/kpis";

const name = (a: Audit) => a.meta.company ?? a.fileName;

export default function Compare() {
  const [all, setAll] = useState<Audit[]>([]);
  const [sel, setSel] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [summary, setSummary] = useState<{ text: string; model: string } | null>(null);
  const [sumBusy, setSumBusy] = useState(false);
  const [sumErr, setSumErr] = useState<string | null>(null);

  useEffect(() => {
    const a = loadAudits();
    setAll(a);
    setSel(a.slice(0, 3).map((x) => x.id));
    setReady(true);
  }, []);

  const [cfg] = useScoreConfig();
  const chosenRaw = useMemo(() => sel.map((id) => all.find((a) => a.id === id)).filter((a): a is Audit => !!a), [sel, all]);
  const chosen = useMemo(() => chosenRaw.map((a) => ({ ...a, scores: rescore(a, cfg) })), [chosenRaw, cfg]);
  // Does the ranking survive a change of weights? Scores are recomputed under each preset.
  const sensitivity = useMemo(() => {
    const rows = PRESETS.map((p) => {
      const vals = chosenRaw.map((a) => rescore(a, p.config).overall);
      const order = vals.map((v, i) => ({ v, i })).sort((x, y) => y.v - x.v).map((x) => x.i);
      return { preset: p, vals, order };
    });
    const first = rows[0]?.order.join(",");
    const ties = rows.some((r) => new Set(r.vals).size < r.vals.length);
    const stable = rows.every((r) => r.order.join(",") === first) && !ties;
    return { rows, stable, ties };
  }, [chosenRaw]);

  const writeSummary = async () => {
    setSumBusy(true);
    setSumErr(null);
    setSummary(null);
    try {
      const audits = chosen.map((a) => ({
        name: name(a),
        fy: a.meta.fy,
        sector: a.meta.sector,
        scores: { overall: a.scores.overall, band: a.scores.band, coverage: a.scores.completeness, evidence: a.scores.evidence, consistency: a.scores.consistency, credibility: a.scores.credibility, assurance: a.scores.assurance },
        assurance: a.assurance.status,
        kpisFound: a.scores.counts.disclosed + a.scores.counts.partial,
        highFlags: a.flags.filter((f) => f.severity === "high").map((f) => f.title),
        ruleProblems: a.rules.filter((r) => r.status === "fail" || r.status === "warn").map((r) => r.title),
        missing: a.kpis.filter((k) => k.status === "not_found").map((k) => KPI_BY_ID[k.id].label),
      }));
      const r = await postJson<{ summary: string; provider: string; model: string }>("/api/compare", { audits });
      setSummary({ text: r.summary, model: `${r.provider === "gemini" ? "Gemini" : "Grok"} ${r.model}` });
    } catch (e) {
      setSumErr(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSumBusy(false);
    }
  };

  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= 3 ? s : [...s, id]));
  const addSamples = () => {
    saveAudit(sampleFabrics());
    const next = saveAudit(sampleCement());
    setAll(next);
    setSel(["sample-a", "sample-b"]);
  };
  const remove = (id: string) => {
    setAll(deleteAudit(id));
    setSel((s) => s.filter((x) => x !== id));
  };

  const rows: { label: string; get: (a: Audit) => string | number | null }[] = [
    { label: "Overall score", get: (a) => a.scores.overall },
    { label: "Coverage", get: (a) => a.scores.completeness },
    { label: "Evidence", get: (a) => a.scores.evidence },
    { label: "Consistency", get: (a) => a.scores.consistency },
    { label: "Credibility", get: (a) => a.scores.credibility },
    { label: "Assurance", get: (a) => a.scores.assurance },
    { label: "High risk flags", get: (a) => a.flags.filter((f) => f.severity === "high").length },
    { label: "KPIs found out of 46", get: (a) => a.scores.counts.disclosed + a.scores.counts.partial },
    { label: "Assurance level", get: (a) => a.assurance.status },
  ];

  return (
    <div className="pt-4">
      <h1 className="font-display text-4xl font-extrabold sm:text-5xl">Compare reports side by side</h1>
      <p className="mt-3 max-w-2xl text-lg text-mute">Pick up to three audits you have run. Audits are saved in this browser only.</p>

      {!ready ? null : all.length === 0 ? (
        <Card className="mt-8 p-8 text-center">
          <p className="font-display text-2xl font-bold">No saved audits yet</p>
          <p className="mx-auto mt-2 max-w-md text-mute">Run an audit on the Audit page, then come back here. Or load two sample audits of fictional companies to try the view.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link href="/" className="btn btn-primary">Audit a report</Link>
            <button type="button" className="btn btn-ghost" onClick={addSamples}>Load two sample audits</button>
          </div>
        </Card>
      ) : (
        <>
          <fieldset className="mt-8">
            <legend className="font-display text-xl font-bold">Choose audits to compare</legend>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {all.map((a) => {
                const on = sel.includes(a.id);
                return (
                  <li key={a.id} className={`flex items-start gap-3 rounded-xl border-2 bg-surface p-4 ${on ? "border-brand" : "border-line"}`}>
                    <input id={`c-${a.id}`} type="checkbox" className="mt-1 h-5 w-5 accent-[var(--brand)]" checked={on} disabled={!on && sel.length >= 3} onChange={() => toggle(a.id)} />
                    <label htmlFor={`c-${a.id}`} className="min-w-0 flex-1 cursor-pointer">
                      <span className="block font-semibold">{name(a)}</span>
                      <span className="block text-sm text-mute">{a.meta.fy ?? "Year not read"}, score {a.scores.overall}</span>
                      {a.demo && <span className="mt-1 inline-block"><Pill tone="viol">Sample</Pill></span>}
                    </label>
                    <button type="button" className="rounded-lg p-2 text-mute hover:bg-paper hover:text-bad" onClick={() => remove(a.id)} aria-label={`Delete ${name(a)}`}><Trash2 size={16} /></button>
                  </li>
                );
              })}
            </ul>
            {!all.some((a) => a.demo) && <button type="button" className="btn btn-ghost mt-3 text-sm" onClick={addSamples}>Add two sample audits</button>}
          </fieldset>

          {chosen.length < 2 ? (
            <p className="mt-8 rounded-xl border border-line bg-surface p-6 text-center text-mute">Select at least two audits to compare.</p>
          ) : (
            <div className="mt-10 space-y-10">
              <section aria-labelledby="ai-sum">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 id="ai-sum" className="font-display text-2xl font-bold">AI summary</h2>
                  <button type="button" className="btn btn-primary" onClick={writeSummary} disabled={sumBusy}>
                    <Sparkles size={16} aria-hidden /> {sumBusy ? "Writing..." : summary ? "Write it again" : "Write a comparison summary"}
                  </button>
                </div>
                {sumErr && <p role="alert" className="mt-3 rounded-xl bg-[#f9e3df] p-3 text-sm font-medium text-bad">{sumErr}</p>}
                {summary ? (
                  <Card className="mt-3 p-5">
                    <p className="max-w-3xl whitespace-pre-wrap leading-relaxed">{summary.text}</p>
                    <p className="mt-3 text-xs text-mute">Written by {summary.model} from the scores, flags and missing KPIs above. It judges disclosure quality only.</p>
                  </Card>
                ) : (
                  <p className="mt-2 text-sm text-mute">An AI model reads the scores, flags and gaps of the audits you picked and explains who discloses better and why.</p>
                )}
              </section>

              <section aria-labelledby="sum">
                <h2 id="sum" className="font-display text-2xl font-bold">Scores</h2>
                <div className="mt-3 overflow-x-auto rounded-2xl border border-line bg-surface">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-line bg-paper">
                        <th className="px-4 py-3" scope="col"><span className="sr-only">Measure</span></th>
                        {chosen.map((a) => <th key={a.id} scope="col" className="px-4 py-3 font-display text-base">{name(a)}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => {
                        const vals = chosen.map((a) => r.get(a));
                        const nums = vals.filter((v): v is number => typeof v === "number");
                        const best = nums.length > 1 && r.label !== "High risk flags" && r.label !== "Assurance level" ? Math.max(...nums) : null;
                        return (
                          <tr key={r.label} className="border-b border-line last:border-0">
                            <th scope="row" className="px-4 py-3 font-medium">{r.label}</th>
                            {vals.map((v, i) => (
                              <td key={i} className={`tnum px-4 py-3 ${best !== null && v === best ? "font-bold text-ok" : ""}`}>
                                {v === null ? <span className="text-mute">Not available</span> : v}
                                {r.label === "Overall score" && <span className="ml-2 text-xs font-semibold" style={{ color: bandColor(chosen[i].scores.band) }}>{chosen[i].scores.band}</span>}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              <section aria-labelledby="sens">
                <h2 id="sens" className="font-display text-2xl font-bold">Does the ranking depend on the weights?</h2>
                <p className="mt-1 max-w-3xl text-sm text-mute">
                  The score weights are a judgment call, so the same audits are rescored under four weightings. A conclusion that survives all four is much safer to state.
                </p>
                <div className="mt-3 overflow-x-auto rounded-2xl border border-line bg-surface">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-line bg-paper">
                        <th scope="col" className="px-4 py-3">Weighting</th>
                        {chosen.map((a) => <th key={a.id} scope="col" className="px-4 py-3 font-display text-base">{name(a)}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {sensitivity.rows.map((r) => (
                        <tr key={r.preset.id} className="border-b border-line last:border-0">
                          <th scope="row" className="px-4 py-3 font-medium">{r.preset.label}</th>
                          {r.vals.map((v, i) => <td key={i} className={`tnum px-4 py-3 ${r.order[0] === i && new Set(r.vals).size === r.vals.length ? "font-bold text-ok" : ""}`}>{v}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 rounded-xl bg-paper p-3 text-sm font-semibold" role="status">
                  {sensitivity.ties
                    ? "At least one weighting gives a tie, so the order is too close to call."
                    : sensitivity.stable
                      ? `The order is the same under all four weightings: ${sensitivity.rows[0].order.map((i) => name(chosen[i])).join(", then ")}. The ranking is robust.`
                      : "The order changes under different weightings, so avoid stating a firm ranking. Look at the parts that differ."}
                </p>
                {!sameConfig(cfg, DEFAULT_CONFIG) && <p className="mt-2 text-sm text-mute">The scores elsewhere on this page use your custom weights.</p>}
              </section>

              <section aria-labelledby="att">
                <h2 id="att" className="font-display text-2xl font-bold">Coverage by attribute</h2>
                <div className="mt-3 space-y-3 rounded-2xl border border-line bg-surface p-5">
                  {ATTRS.map((at) => (
                    <div key={at.id} className="grid items-center gap-x-4 gap-y-1 md:grid-cols-[220px_1fr]">
                      <p className="text-sm font-semibold">{at.name}</p>
                      <div className="space-y-1.5">
                        {chosen.map((a, i) => (
                          <div key={a.id} className="flex items-center gap-3">
                            <div className="h-3 flex-1 overflow-hidden rounded-full bg-line" aria-hidden>
                              <div className="h-full rounded-full" style={{ width: `${a.scores.attrs[at.id]}%`, background: ["var(--brand)", "var(--marigold)", "var(--viol)"][i] }} />
                            </div>
                            <span className="w-24 text-right text-xs tnum text-mute">{a.scores.attrs[at.id]}% <span className="sr-only">for {name(a)}</span></span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  <ul className="flex flex-wrap gap-4 border-t border-line pt-3 text-sm">
                    {chosen.map((a, i) => (
                      <li key={a.id} className="flex items-center gap-2"><span className="h-3 w-5 rounded-full" style={{ background: ["var(--brand)", "var(--marigold)", "var(--viol)"][i] }} aria-hidden />{name(a)}</li>
                    ))}
                  </ul>
                </div>
              </section>

              <section aria-labelledby="kp">
                <h2 id="kp" className="font-display text-2xl font-bold">KPI by KPI</h2>
                <p className="mt-1 text-sm text-mute">Companies differ in size and sector, so compare disclosure and ratios rather than raw totals.</p>
                <div className="mt-3 overflow-x-auto rounded-2xl border border-line bg-surface">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-line bg-paper">
                        <th scope="col" className="px-4 py-3">KPI</th>
                        {chosen.map((a) => <th key={a.id} scope="col" className="px-4 py-3 font-display text-base">{name(a)}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {ATTRS.map((at) => (
                        <FragmentRows key={at.id} attrName={at.name} attrId={at.id} chosen={chosen} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function FragmentRows({ attrName, attrId, chosen }: { attrName: string; attrId: string; chosen: Audit[] }) {
  return (
    <>
      <tr className="bg-paper"><th scope="colgroup" colSpan={chosen.length + 1} className="px-4 py-2 font-display text-base">{attrName}</th></tr>
      {KPIS.filter((k) => k.attr === attrId).map((k) => (
        <tr key={k.id} className="border-b border-line last:border-0">
          <th scope="row" className="px-4 py-2.5 font-medium">{k.label}</th>
          {chosen.map((a) => {
            const r = a.kpis.find((x) => x.id === k.id);
            const missing = !r || r.status === "not_found";
            return (
              <td key={a.id} className="tnum px-4 py-2.5">
                {missing ? <span className="font-semibold text-bad">Not found</span> : r.status === "not_analysed" ? <span className="text-mute">Not analysed</span> : (
                  <span>{r.value ?? "n/a"}{r.unit && r.unit !== "as reported" && r.unit !== "count" ? <span className="text-mute"> {r.unit}</span> : null}</span>
                )}
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}
