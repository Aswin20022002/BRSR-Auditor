import { NextResponse } from "next/server";
import { KPI_BY_ID } from "@/lib/kpis";
import { generate, errorStatus } from "@/lib/server/llm";
import { bad, guard } from "@/lib/server/guard";
import { CROSS_SYSTEM, crossUser } from "@/lib/server/prompts";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const num = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v.replace(/,/g, "").replace(/[^\d.\-]/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

/** Independent second read of headline numbers. Prefers Grok so it is a different model from the extractor. */
export async function POST(req: Request) {
  const denied = guard(req);
  if (denied) return denied;

  let b: { text?: string; ids?: string[] };
  try {
    b = await req.json();
  } catch {
    return bad("Invalid request body");
  }
  const ids = (Array.isArray(b.ids) ? b.ids : []).filter((x): x is string => typeof x === "string" && !!KPI_BY_ID[x]).slice(0, 20);
  const text = b.text ?? "";
  if (ids.length === 0) return bad("No KPIs to check");
  if (text.length < 200) return bad("Not enough report text was sent");
  if (text.length > 160_000) return bad("Report text is too large", 413);

  try {
    const r = await generate<{ kpis?: Record<string, unknown>[] }>({ prefer: "grok", system: CROSS_SYSTEM, user: crossUser(ids, text), maxTokens: 4000, budgetMs: 50_000 });
    const kpis = (Array.isArray(r.data.kpis) ? r.data.kpis : [])
      .filter((k) => typeof k.id === "string" && ids.includes(k.id as string))
      .map((k) => ({
        id: k.id as string,
        value: typeof k.value === "string" ? k.value.slice(0, 120) : null,
        numeric: num(k.numeric),
        unit: typeof k.unit === "string" ? k.unit.slice(0, 60) : null,
      }));
    return NextResponse.json({ kpis, provider: r.provider, model: r.model, fellBack: r.fellBack });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Model call failed" }, { status: errorStatus(e) });
  }
}
