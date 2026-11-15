import { ATTR_BY_ID, KPI_BY_ID, KPIS } from "./kpis";
import type { Audit } from "./types";

function save(name: string, mime: string, body: string) {
  const url = URL.createObjectURL(new Blob([body], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const slug = (a: Audit) => (a.meta.company ?? a.fileName).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "audit";

export function downloadJson(a: Audit) {
  save(`brsr-audit-${slug(a)}.json`, "application/json", JSON.stringify(a, null, 2));
}

const esc = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function downloadCsv(a: Audit) {
  const head = ["attribute", "kpi", "status", "value", "unit", "year", "pdf_page", "evidence", "quote"];
  const by = new Map(a.kpis.map((k) => [k.id, k]));
  const rows = KPIS.map((d) => {
    const k = by.get(d.id);
    return [ATTR_BY_ID[d.attr].name, KPI_BY_ID[d.id].label, k?.status, k?.value, k?.unit, k?.year, k?.page, k?.evidence, k?.quote].map(esc).join(",");
  });
  save(`brsr-kpis-${slug(a)}.csv`, "text/csv", [head.join(","), ...rows].join("\n"));
}
