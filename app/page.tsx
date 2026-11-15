"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Landing from "@/components/Landing";
import Progress from "@/components/Progress";
import Results from "@/components/Results";
import { getHealth, type Health } from "@/lib/api";
import { KPIS } from "@/lib/kpis";
import { readPdf, type PdfDoc } from "@/lib/pdf";
import { runAudit, STEP_LABELS, type StepId, type StepState } from "@/lib/pipeline";
import { sampleFabrics } from "@/lib/sample";
import { loadAudits, saveAudit } from "@/lib/store";
import type { Audit, KpiResult } from "@/lib/types";

type Phase = "idle" | "working" | "done";

const blankKpis = (): KpiResult[] =>
  KPIS.map((d) => ({ id: d.id, status: "not_analysed", value: null, numeric: null, unit: null, year: null, page: null, quote: null, note: null, evidence: "none" }));

const blankSteps = (): StepState[] => (Object.keys(STEP_LABELS) as StepId[]).map((id) => ({ id, label: STEP_LABELS[id], state: "wait" }));

export default function Home() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [audit, setAudit] = useState<Audit | null>(null);
  const [steps, setSteps] = useState<StepState[]>(blankSteps());
  const [live, setLive] = useState<KpiResult[]>(blankKpis());
  const [readInfo, setReadInfo] = useState("Starting...");
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Audit[]>([]);
  const [health, setHealth] = useState<Health | null>(null);
  const [doc, setDoc] = useState<PdfDoc | null>(null);
  const docRef = useRef<PdfDoc | null>(null);

  useEffect(() => {
    setHistory(loadAudits().filter((a) => !a.demo));
    getHealth().then(setHealth);
  }, []);

  const top = () => window.scrollTo({ top: 0, behavior: "auto" });

  const runAi = useCallback(async (d: PdfDoc) => {
    setPhase("working");
    setError(null);
    setSteps(blankSteps());
    setLive(blankKpis());
    setFileName(d.fileName);
    setReadInfo(`Read ${d.numPages} pages`);
    top();
    try {
      const result = await runAudit(d, {
        onStep: (s) => setSteps((prev) => prev.map((p) => (p.id === s.id ? s : p))),
        onKpis: (k) => setLive(k),
      });
      setHistory(saveAudit(result).filter((a) => !a.demo));
      setAudit(result);
      setPhase("done");
      top();
    } catch (e) {
      setError(e instanceof Error ? e.message : "The audit failed");
      setPhase("idle");
    }
  }, []);

  const start = useCallback(async (file: File) => {
    setError(null);
    if (!/\.pdf$/i.test(file.name) && file.type !== "application/pdf") {
      setError("That file is not a PDF. Choose a BRSR or annual report in PDF format.");
      return;
    }
    if (file.size > 120 * 1024 * 1024) {
      setError("That PDF is larger than 120 MB. Try only the pages that hold the BRSR section.");
      return;
    }
    setPhase("working");
    setFileName(file.name);
    setSteps(blankSteps());
    setLive(blankKpis());
    setReadInfo("Opening the file");
    top();
    try {
      const d = await readPdf(file, (done, total) => setReadInfo(`Page ${done} of ${total}`));
      if (d.scanned) {
        setPhase("idle");
        setError("This PDF looks like scanned images with no selectable text. Run OCR on it first (for example with Adobe or the free ocrmypdf tool) and upload it again.");
        return;
      }
      docRef.current = d;
      setDoc(d);
      await runAi(d);
    } catch (e) {
      setPhase("idle");
      setError(e instanceof Error ? `Could not read that PDF: ${e.message}` : "Could not read that PDF.");
    }
  }, [runAi]);

  const attach = useCallback(async (file: File) => {
    try {
      const d = await readPdf(file);
      docRef.current = d;
      setDoc(d);
    } catch {
      setError("Could not read that PDF.");
    }
  }, []);

  const openSample = () => {
    docRef.current = null;
    setDoc(null);
    setAudit(sampleFabrics());
    setPhase("done");
    top();
  };

  const reset = () => {
    setPhase("idle");
    setAudit(null);
    setError(null);
    top();
  };

  if (phase === "working") return <Progress fileName={fileName} readInfo={readInfo} steps={steps} kpis={live} />;
  if (phase === "done" && audit) {
    return <Results audit={audit} doc={doc} onNew={reset} onAttach={attach} onRerun={docRef.current && !audit.demo ? () => runAi(docRef.current as PdfDoc) : undefined} />;
  }
  return (
    <Landing
      onFile={start}
      onSample={openSample}
      onOpen={(a) => { docRef.current = null; setDoc(null); setAudit(a); setPhase("done"); top(); }}
      history={history}
      health={health}
      error={error}
    />
  );
}
