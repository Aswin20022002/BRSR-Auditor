import type { Audit } from "./types";

const KEY = "brsr-auditor:audits:v1";
const CODE = "brsr-auditor:code";

export function loadAudits(): Audit[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Audit[]) : [];
  } catch {
    return [];
  }
}

export function saveAudit(a: Audit): Audit[] {
  try {
    const rest = loadAudits().filter((x) => x.id !== a.id);
    const next = [a, ...rest].slice(0, 12);
    localStorage.setItem(KEY, JSON.stringify(next));
    return next;
  } catch {
    return [a];
  }
}

export function deleteAudit(id: string): Audit[] {
  try {
    const next = loadAudits().filter((x) => x.id !== id);
    localStorage.setItem(KEY, JSON.stringify(next));
    return next;
  } catch {
    return [];
  }
}

export function getCode(): string {
  try {
    return localStorage.getItem(CODE) ?? "";
  } catch {
    return "";
  }
}

export function setCode(v: string) {
  try {
    if (v) localStorage.setItem(CODE, v);
    else localStorage.removeItem(CODE);
  } catch {
    /* storage can be blocked, the app still works */
  }
}
