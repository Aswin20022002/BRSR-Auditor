"use client";

import { CheckCircle2, CircleSlash, TriangleAlert, XCircle } from "lucide-react";
import { KPI_BY_ID } from "@/lib/kpis";
import type { Audit, Claim, RuleResult } from "@/lib/types";
import { EvidencePill, Pill, SeverityPill } from "./ui";

type View = ((page: number, quote: string | null) => void) | undefined;

const sevColor = { high: "var(--bad)", medium: "var(--warn)", low: "var(--mute)" } as const;

export function Flags({ audit, onView, onPickKpi }: { audit: Audit; onView: View; onPickKpi: (id: string) => void }) {
  if (audit.flags.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-surface p-8 text-center">
        <p className="font-display text-xl font-bold">{audit.warnings.some((w) => w.includes("review did not run")) ? "The independent review did not run" : "No red flags raised"}</p>
        <p className="mx-auto mt-1 max-w-md text-mute">{audit.warnings.some((w) => w.includes("review did not run")) ? "Run the audit again once the AI service is reachable." : "The reviewer found no wording or consistency problems worth flagging."}</p>
      </div>
    );
  }
  return (
    <ul className="space-y-4">
      {audit.flags.map((f) => (
        <li key={f.id} className="print-break rounded-xl border border-line bg-surface p-5" style={{ borderLeft: `6px solid ${sevColor[f.severity]}` }}>
          <div className="flex flex-wrap items-center gap-2">
            <SeverityPill severity={f.severity} />
            <Pill tone="brand">{f.category.replace(/_/g, " ")}</Pill>
            {f.page && <span className="text-sm text-mute">PDF page {f.page}</span>}
          </div>
          <h3 className="mt-2.5 font-display text-xl font-bold">{f.title}</h3>
          <p className="mt-1.5 max-w-3xl">{f.explanation}</p>
          {f.quote && (
            <figure className="mt-3">
              <blockquote className="border-l-4 border-line pl-3 text-sm italic">&ldquo;{f.quote}&rdquo;</blockquote>
              <figcaption className="mt-1.5 flex flex-wrap items-center gap-2"><EvidencePill evidence={f.evidence} />
                {f.page && onView && <button type="button" className="text-sm font-semibold text-brand underline" onClick={() => onView(f.page as number, f.quote)}>View page</button>}
              </figcaption>
            </figure>
          )}
          <p className="mt-3 rounded-lg bg-paper p-3 text-sm"><strong>How to fix it:</strong> {f.suggestion}</p>
          {f.kpi_ids.length > 0 && (
            <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-mute">
              Related KPIs:
              {f.kpi_ids.map((id) => (
                <button key={id} type="button" onClick={() => onPickKpi(id)} className="no-print rounded-full border border-line px-2.5 py-0.5 text-xs font-semibold text-ink hover:border-brand">{KPI_BY_ID[id].label}</button>
              ))}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

const ratingTone = { backed: "ok", partly_backed: "warn", unsupported: "bad", vague: "viol" } as const;
const ratingText = { backed: "Backed by data", partly_backed: "Partly backed", unsupported: "Not supported", vague: "Too vague to test" } as const;

export function Claims({ claims, onView }: { claims: Claim[]; onView: View }) {
  if (claims.length === 0) return <p className="rounded-xl border border-line bg-surface p-8 text-center text-mute">No headline claims were captured from this report.</p>;
  return (
    <ul className="space-y-3">
      {claims.map((c, i) => (
        <li key={i} className="print-break rounded-xl border border-line bg-surface p-4">
          <div className="flex flex-wrap items-center gap-2">
            {c.rating ? <Pill tone={ratingTone[c.rating]}>{ratingText[c.rating]}</Pill> : <Pill tone="mute">Not rated</Pill>}
            <Pill tone="mute">{c.type}</Pill>
            <Pill tone={c.has_number ? "ok" : "mute"}>{c.has_number ? "Has a number" : "No number"}</Pill>
            <Pill tone={c.has_baseline ? "ok" : "mute"}>{c.has_baseline ? "Has a baseline" : "No baseline"}</Pill>
            <Pill tone={c.has_deadline ? "ok" : "mute"}>{c.has_deadline ? "Has a deadline" : "No deadline"}</Pill>
          </div>
          <p className="mt-2 font-semibold">{c.claim}</p>
          {c.reason && <p className="mt-1 text-sm text-mute">{c.reason}</p>}
          {c.quote && (
            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <span className="italic text-mute">&ldquo;{c.quote}&rdquo;</span>
              <EvidencePill evidence={c.evidence} />
              {c.page && onView && <button type="button" className="font-semibold text-brand underline" onClick={() => onView(c.page as number, c.quote)}>View page {c.page}</button>}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

const ruleIcon = (s: RuleResult["status"]) =>
  s === "pass" ? <CheckCircle2 className="text-ok" size={22} aria-label="Passed" /> : s === "warn" ? <TriangleAlert className="text-warn" size={22} aria-label="Warning" /> : s === "fail" ? <XCircle className="text-bad" size={22} aria-label="Failed" /> : <CircleSlash className="text-mute" size={22} aria-label="Not testable" />;

export function Checks({ rules }: { rules: RuleResult[] }) {
  const order = { fail: 0, warn: 1, pass: 2, skip: 3 } as const;
  const sorted = [...rules].sort((a, b) => order[a.status] - order[b.status]);
  return (
    <div>
      <p className="mb-4 max-w-2xl text-mute">These tests use plain arithmetic and logic on the extracted numbers, with no AI involved, so the same report always gives the same result.</p>
      <ul className="space-y-2.5">
        {sorted.map((r) => (
          <li key={r.id} className="print-break flex gap-3 rounded-xl border border-line bg-surface p-4">
            <span className="mt-0.5 flex-none">{ruleIcon(r.status)}</span>
            <div>
              <p className="font-semibold">{r.title}</p>
              <p className="text-sm text-mute">{r.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

const lvl = { low: "Low", medium: "Medium", high: "High" } as const;

export function Fixes({ audit, onPickKpi }: { audit: Audit; onPickKpi: (id: string) => void }) {
  if (audit.fixes.length === 0) return <p className="rounded-xl border border-line bg-surface p-8 text-center text-mute">No fixes were suggested.</p>;
  return (
    <div>
      <p className="mb-4 max-w-2xl text-mute">Ordered by the most improvement for the least effort. Useful if you are preparing a report, or briefing a company on what to improve.</p>
      <ol className="space-y-3">
        {audit.fixes.map((f, i) => (
          <li key={i} className="print-break flex gap-4 rounded-xl border border-line bg-surface p-4">
            <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-brand font-display font-bold text-white" aria-hidden>{i + 1}</span>
            <div>
              <p className="font-semibold">{f.action}</p>
              <p className="mt-0.5 text-sm text-mute">{f.why}</p>
              <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                <Pill tone={f.impact === "high" ? "ok" : "mute"}>Impact {lvl[f.impact]}</Pill>
                <Pill tone={f.effort === "low" ? "ok" : "mute"}>Effort {lvl[f.effort]}</Pill>
                {f.kpi_ids.slice(0, 3).map((id) => (
                  <button key={id} type="button" onClick={() => onPickKpi(id)} className="no-print rounded-full border border-line px-2.5 py-0.5 text-xs font-semibold hover:border-brand">{KPI_BY_ID[id].label}</button>
                ))}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
