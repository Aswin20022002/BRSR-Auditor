"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_CONFIG, PART_KEYS, type KpiMode, type ScoreConfig } from "./score";

const KEY = "brsr-auditor:config:v1";
const EVT = "brsr-config";

function sanitize(raw: unknown): ScoreConfig {
  const r = raw as Partial<ScoreConfig> | null;
  if (!r || typeof r !== "object" || !r.weights) return DEFAULT_CONFIG;
  const w = { ...DEFAULT_CONFIG.weights };
  for (const k of PART_KEYS) {
    const v = Number((r.weights as Record<string, unknown>)[k]);
    w[k] = Number.isFinite(v) ? Math.min(100, Math.max(0, v)) : DEFAULT_CONFIG.weights[k];
  }
  const kpiMode: KpiMode = r.kpiMode === "importance" ? "importance" : "equal";
  return { weights: w, kpiMode };
}

/** Score settings shared by every component and remembered in this browser. */
export function useScoreConfig(): [ScoreConfig, (c: ScoreConfig) => void] {
  const [cfg, setCfg] = useState<ScoreConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    const load = () => {
      try {
        const raw = localStorage.getItem(KEY);
        setCfg(raw ? sanitize(JSON.parse(raw)) : DEFAULT_CONFIG);
      } catch {
        /* storage can be blocked, keep what we have */
      }
    };
    load();
    window.addEventListener(EVT, load);
    return () => window.removeEventListener(EVT, load);
  }, []);

  const save = useCallback((c: ScoreConfig) => {
    setCfg(c);
    try {
      localStorage.setItem(KEY, JSON.stringify(c));
      window.dispatchEvent(new Event(EVT));
    } catch {
      /* the setting still applies for this visit */
    }
  }, []);

  return [cfg, save];
}
