import { NextResponse } from "next/server";
import { kpisForGroup, KPI_BY_ID, type GroupId } from "@/lib/kpis";
import { generate, errorStatus } from "@/lib/server/llm";
import { bad, guard, MAX_CHARS } from "@/lib/server/guard";
import { CONTEXT_SYSTEM, EXTRACT_SYSTEM, contextUser, extractUser } from "@/lib/server/prompts";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const str = (v: unknown, max = 400): string | null => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const numOrNull = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/,/g, "").replace(/[^\d.\-]/g, ""));
    return Number.isFinite(n) && v.trim() ? n : null;
  }
  return null;
};
const intOrNull = (v: unknown): number | null => {
  const n = numOrNull(v);
  return n === null ? null : Math.round(n);
};

export async function POST(req: Request) {
  const denied = guard(req);
  if (denied) return denied;

  let body: { group?: string; text?: string };
  try {
    body = await req.json();
  } catch {
    return bad("Invalid request body");
  }
  const text = body.text ?? "";
  if (!text || text.length < 200) return bad("Not enough report text was sent");
  if (text.length > MAX_CHARS) return bad("Report text is too large", 413);

  try {
    if (body.group === "context") {
      const r = await generate<Record<string, unknown>>({ prefer: "gemini", system: CONTEXT_SYSTEM, user: contextUser(text), maxTokens: 6000 });
      const d = r.data as { meta?: Record<string, unknown>; assurance?: Record<string, unknown>; claims?: Record<string, unknown>[] };
      const m = d.meta ?? {};
      const a = d.assurance ?? {};
      const st = String(a.status ?? "unclear");
      return NextResponse.json({
        meta: {
          company: str(m.company, 160),
          cin: str(m.cin, 40),
          fy: str(m.fy, 30),
          sector: str(m.sector, 60),
          turnover_cr: numOrNull(m.turnover_cr),
          employees_total: intOrNull(m.employees_total),
          female_employees_pct: numOrNull(m.female_employees_pct),
          scope: str(m.scope, 20),
        },
        assurance: {
          status: ["reasonable", "limited", "none", "unclear"].includes(st) ? st : "unclear",
          provider: str(a.provider, 120),
          standard: str(a.standard, 80),
          scope: str(a.scope, 160),
          page: intOrNull(a.page),
          quote: str(a.quote, 300),
        },
        claims: (Array.isArray(d.claims) ? d.claims : []).slice(0, 16).map((c) => ({
          claim: str(c.claim, 300) ?? "",
          type: str(c.type, 24) ?? "claim",
          has_number: c.has_number === true,
          has_baseline: c.has_baseline === true,
          has_deadline: c.has_deadline === true,
          page: intOrNull(c.page),
          quote: str(c.quote, 300),
        })).filter((c) => c.claim),
        provider: r.provider,
        model: r.model,
        fellBack: r.fellBack,
      });
    }

    const group = body.group as GroupId;
    if (!["env", "social", "gov"].includes(group)) return bad("Unknown group");
    const r = await generate<{ kpis?: Record<string, unknown>[] }>({ prefer: "gemini", system: EXTRACT_SYSTEM, user: extractUser(group, text), maxTokens: 16000 });
    const got = new Map<string, Record<string, unknown>>();
    for (const row of Array.isArray(r.data.kpis) ? r.data.kpis : []) {
      const id = String(row.id ?? "");
      if (KPI_BY_ID[id]) got.set(id, row);
    }
    const kpis = kpisForGroup(group).map((def) => {
      const row = got.get(def.id);
      if (!row) {
        return { id: def.id, status: "not_found", value: null, numeric: null, unit: null, year: null, page: null, quote: null, note: null };
      }
      const status = ["disclosed", "partial", "not_found", "not_applicable"].includes(String(row.status)) ? String(row.status) : "not_found";
      const numeric = numOrNull(row.numeric);
      const value = str(row.value, 120);
      return {
        id: def.id,
        status: status === "disclosed" && !value ? "partial" : status,
        value,
        numeric,
        unit: str(row.unit, 60),
        year: str(row.year, 30),
        page: intOrNull(row.page),
        quote: str(row.quote, 300),
        note: str(row.note, 240),
        prev_value: str(row.prev_value, 120),
        prev_numeric: numOrNull(row.prev_numeric),
      };
    });
    return NextResponse.json({ kpis, provider: r.provider, model: r.model, fellBack: r.fellBack });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Model call failed";
    return NextResponse.json({ error: msg }, { status: errorStatus(e) });
  }
}
