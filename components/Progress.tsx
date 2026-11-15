"use client";

import { CheckCircle2, Circle, Loader2, XCircle } from "lucide-react";
import Mosaic, { Legend } from "./Mosaic";
import { Card } from "./ui";
import type { StepState } from "@/lib/pipeline";
import type { KpiResult } from "@/lib/types";

export default function Progress({ fileName, readInfo, steps, kpis }: { fileName: string; readInfo: string; steps: StepState[]; kpis: KpiResult[] }) {
  return (
    <div className="pt-4">
      <h1 className="font-display text-3xl font-extrabold sm:text-4xl">Auditing {fileName}</h1>
      <p className="mt-2 max-w-2xl text-mute">This usually takes one to two minutes. Squares fill in as each part of the report is read. You can leave this tab open.</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,6fr)]">
        <Card className="p-5">
          <ol className="space-y-3.5" aria-live="polite">
            <li className="flex items-start gap-3">
              {readInfo.startsWith("Read") ? <CheckCircle2 className="mt-0.5 text-ok" size={20} aria-hidden /> : <Loader2 className="mt-0.5 animate-spin text-brand" size={20} aria-hidden />}
              <div><div className="font-semibold">Reading the PDF in your browser</div><div className="text-sm text-mute">{readInfo}</div></div>
            </li>
            {steps.map((s) => (
              <li key={s.id} className="flex items-start gap-3">
                {s.state === "done" ? <CheckCircle2 className="mt-0.5 text-ok" size={20} aria-hidden /> : s.state === "error" ? <XCircle className="mt-0.5 text-bad" size={20} aria-hidden /> : s.state === "run" ? <Loader2 className="mt-0.5 animate-spin text-brand" size={20} aria-hidden /> : <Circle className="mt-0.5 text-line" size={20} aria-hidden />}
                <div>
                  <div className={`font-semibold ${s.state === "wait" ? "text-mute" : ""}`}>{s.label}</div>
                  {s.detail && <div className={`text-sm ${s.state === "error" ? "text-bad" : "text-mute"}`}>{s.detail}</div>}
                </div>
              </li>
            ))}
          </ol>
        </Card>
        <Card className="p-5 sm:p-6">
          <h2 className="font-display text-xl font-bold">KPI map, live</h2>
          <p className="mb-5 mt-1 text-sm text-mute">Grey squares are still being read.</p>
          <Mosaic kpis={kpis} animate />
          <div className="mt-5 border-t border-line pt-4"><Legend /></div>
        </Card>
      </div>
    </div>
  );
}
