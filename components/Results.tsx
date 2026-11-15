"use client";

import { useMemo, useRef, useState } from "react";
import { Download, FileJson, Printer, RotateCcw, TriangleAlert } from "lucide-react";
import type { Audit } from "@/lib/types";
import type { PdfDoc } from "@/lib/pdf";
import { downloadCsv, downloadJson } from "@/lib/export";
import Mosaic, { Legend } from "./Mosaic";
import ScorePanel from "./ScorePanel";
import WeightsPanel from "./WeightsPanel";
import ReliabilityCard from "./ReliabilityCard";
import { DEFAULT_CONFIG, rescore, sameConfig } from "@/lib/score";
import { useScoreConfig } from "@/lib/useConfig";
import Ledger from "./Ledger";
import { Checks, Claims, Fixes, Flags } from "./Findings";
import Ask from "./Ask";
import PageViewer, { type ViewTarget } from "./PageViewer";
import { Card, Pill } from "./ui";

type Tab = "ledger" | "flags" | "checks" | "claims" | "fixes" | "ask";

export default function Results({
  audit,
  doc,
  onNew,
  onRerun,
  onAttach,
}: {
  audit: Audit;
  doc: PdfDoc | null;
  onNew: () => void;
  onRerun?: () => void;
  onAttach: (f: File) => void;
}) {
  const [tab, setTab] = useState<Tab>("ledger");
  const [focus, setFocus] = useState<{ id: string; n: number } | null>(null);
  const [view, setView] = useState<ViewTarget | null>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const [cfg, setCfg] = useScoreConfig();
  const scores = useMemo(() => rescore(audit, cfg), [audit, cfg]);
  const shown = useMemo(() => ({ ...audit, scores }), [audit, scores]);

  const rulesBad = audit.rules.filter((r) => r.status === "fail" || r.status === "warn").length;
  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "ledger", label: "KPI ledger", count: audit.kpis.length },
    { id: "flags", label: "Red flags", count: audit.flags.length },
    { id: "checks", label: "Consistency checks", count: rulesBad },
    { id: "claims", label: "Claims", count: audit.claims.length },
    { id: "fixes", label: "Fix list", count: audit.fixes.length },
    ...(audit.demo ? [] : [{ id: "ask" as Tab, label: "Ask the report" }]),
  ];

  const pickKpi = (id: string) => {
    setTab("ledger");
    setFocus({ id, n: Date.now() });
    tabsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const onView = doc ? (page: number, quote: string | null) => setView({ page, quote }) : undefined;

  const onKey = (e: React.KeyboardEvent, i: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const next = (i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    setTab(tabs[next].id);
    (tabsRef.current?.querySelectorAll('[role="tab"]')[next] as HTMLElement | undefined)?.focus();
    e.preventDefault();
  };

  const subtitle = [audit.meta.fy, audit.meta.sector, audit.meta.scope].filter(Boolean).join(", ");

  return (
    <div className="pt-2">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          {audit.demo && <Pill tone="viol">Illustrative sample with fictional data</Pill>}
          <h1 className="mt-2 font-display text-3xl font-extrabold sm:text-4xl">{audit.meta.company ?? audit.fileName}</h1>
          <p className="mt-1.5 text-mute">
            {subtitle || "Company details not read"}. File: {audit.fileName}, {audit.usedPages} of {audit.numPages} pages analysed.
          </p>
          <p className="mt-1 text-sm text-mute">Read by {audit.models.extract}.{audit.models.cross ? ` Numbers cross-checked by ${audit.models.cross}.` : ""} Reviewed by {audit.models.review}.</p>
        </div>
        <div className="no-print flex flex-wrap gap-2">
          <button type="button" className="btn btn-ghost" onClick={() => window.print()}><Printer size={16} aria-hidden /> Save as PDF</button>
          <button type="button" className="btn btn-ghost" onClick={() => downloadCsv(audit)}><Download size={16} aria-hidden /> KPIs as CSV</button>
          <button type="button" className="btn btn-ghost" onClick={() => downloadJson(shown)}><FileJson size={16} aria-hidden /> JSON</button>
          <button type="button" className="btn btn-primary" onClick={onNew}>New audit</button>
        </div>
      </div>

      {audit.warnings.length > 0 && (
        <div role="alert" className="mt-5 rounded-xl border border-[#e9c98b] bg-[#fbeed6] p-4 text-sm text-warn">
          <p className="flex items-center gap-2 font-semibold"><TriangleAlert size={18} aria-hidden /> Part of the audit did not complete</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-6">{audit.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
          {onRerun && <button type="button" className="btn btn-ghost mt-3 !min-h-[38px] text-sm" onClick={onRerun}><RotateCcw size={15} aria-hidden /> Try again</button>}
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-6">
          <ScorePanel scores={scores} weights={cfg.weights} custom={!sameConfig(cfg, DEFAULT_CONFIG)} />
          <WeightsPanel cfg={cfg} onChange={setCfg} />
        </div>
        <div className="space-y-6">
          {(audit.verdict || audit.strengths.length > 0) && (
            <Card className="p-5">
              <h2 className="font-display text-xl font-bold">The short version</h2>
              {audit.verdict && <p className="mt-2 max-w-3xl text-lg leading-snug">{audit.verdict}</p>}
              {audit.strengths.length > 0 && (
                <ul className="mt-3 list-disc space-y-1 pl-5 text-mute">{audit.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
              )}
            </Card>
          )}
          <ReliabilityCard audit={audit} />
          <Card className="p-5">
            <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-xl font-bold">KPI map</h2>
              <p className="text-sm text-mute tnum">{scores.counts.disclosed + scores.counts.partial} of {scores.counts.total} found, {scores.counts.verified} confirmed in the PDF{audit.kpis.some((k) => k.xcheck === "agree" || k.xcheck === "differ") ? `, ${audit.kpis.filter((k) => k.xcheck === "agree").length} cross-checked` : ""}</p>
            </div>
            <p className="mb-4 text-sm text-mute no-print">Select a square to jump to that KPI.</p>
            <Mosaic kpis={audit.kpis} onPick={pickKpi} />
            <div className="mt-4 border-t border-line pt-3"><Legend /></div>
          </Card>
        </div>
      </div>

      <div ref={tabsRef} className="no-print mt-10 scroll-mt-4 overflow-x-auto" role="tablist" aria-label="Audit sections">
        <div className="flex min-w-max gap-1 border-b border-line">
          {tabs.map((t, i) => (
            <button
              key={t.id}
              id={`tab-${t.id}`}
              role="tab"
              type="button"
              aria-selected={tab === t.id}
              aria-controls={`panel-${t.id}`}
              tabIndex={tab === t.id ? 0 : -1}
              onKeyDown={(e) => onKey(e, i)}
              onClick={() => setTab(t.id)}
              className={`-mb-px border-b-[3px] px-4 py-3 text-sm font-semibold ${tab === t.id ? "border-brand text-brand-ink" : "border-transparent text-mute hover:text-ink"}`}
            >
              {t.label}
              {t.count !== undefined && <span className="ml-1.5 rounded-full bg-[#e8ebf5] px-2 py-0.5 text-xs tnum">{t.count}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <div id="panel-ledger" role="tabpanel" aria-labelledby="tab-ledger" hidden={tab !== "ledger"} className="panel"><h2 className="mb-3 hidden font-display text-2xl font-bold print:block">KPI ledger</h2><Ledger kpis={audit.kpis} focusId={focus ? focus.id : null} key={focus?.n ?? "base"} onView={onView} /></div>
        <div id="panel-flags" role="tabpanel" aria-labelledby="tab-flags" hidden={tab !== "flags"} className="panel"><h2 className="mb-3 hidden font-display text-2xl font-bold print:block">Red flags</h2><Flags audit={audit} onView={onView} onPickKpi={pickKpi} /></div>
        <div id="panel-checks" role="tabpanel" aria-labelledby="tab-checks" hidden={tab !== "checks"} className="panel"><h2 className="mb-3 hidden font-display text-2xl font-bold print:block">Consistency checks</h2><Checks rules={audit.rules} /></div>
        <div id="panel-claims" role="tabpanel" aria-labelledby="tab-claims" hidden={tab !== "claims"} className="panel"><h2 className="mb-3 hidden font-display text-2xl font-bold print:block">Claims</h2><Claims claims={audit.claims} onView={onView} /></div>
        <div id="panel-fixes" role="tabpanel" aria-labelledby="tab-fixes" hidden={tab !== "fixes"} className="panel"><h2 className="mb-3 hidden font-display text-2xl font-bold print:block">Fix list</h2><Fixes audit={audit} onPickKpi={pickKpi} /></div>
        {!audit.demo && (
          <div id="panel-ask" role="tabpanel" aria-labelledby="tab-ask" hidden={tab !== "ask"} className="panel"><Ask doc={doc} onAttach={onAttach} onPage={(p) => setView({ page: p })} /></div>
        )}
      </div>

      <PageViewer pages={doc?.pages ?? []} target={view} onClose={() => setView(null)} />
    </div>
  );
}
