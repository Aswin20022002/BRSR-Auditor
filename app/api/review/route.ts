import { NextResponse } from "next/server";
import { KPI_BY_ID } from "@/lib/kpis";
import { generate, errorStatus } from "@/lib/server/llm";
import { bad, guard, MAX_CHARS } from "@/lib/server/guard";
import { REVIEW_SYSTEM, reviewUser } from "@/lib/server/prompts";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

interface InKpi { id: string; status: string; value: string | null; unit: string | null; year: string | null; page: number | null; prev_value?: string | null; xcheck?: string; xvalue?: string | null }
interface InRule { title: string; status: string; detail: string }
interface InClaim { claim: string; type: string; has_number: boolean; has_baseline: boolean; has_deadline: boolean; page: number | null; quote: string | null }

const str = (v: unknown, max = 500): string | null => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const int = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? Math.round(v) : null);
const pick = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T => (allowed.includes(v as T) ? (v as T) : fallback);

export async function POST(req: Request) {
  const denied = guard(req);
  if (denied) return denied;

  let b: { meta?: unknown; assurance?: unknown; kpis?: InKpi[]; rules?: InRule[]; claims?: InClaim[]; narrative?: string };
  try {
    b = await req.json();
  } catch {
    return bad("Invalid request body");
  }
  const kpis = Array.isArray(b.kpis) ? b.kpis : [];
  const rules = Array.isArray(b.rules) ? b.rules : [];
  const claims = Array.isArray(b.claims) ? b.claims : [];
  const narrative = (b.narrative ?? "").slice(0, 90_000);
  if (kpis.length === 0) return bad("No KPIs were sent");
  if (narrative.length > MAX_CHARS) return bad("Too large", 413);

  const kpiTable = kpis
    .map((k) => `${k.id} | ${KPI_BY_ID[k.id]?.label ?? k.id} | ${k.status} | ${k.value ?? "-"} ${k.unit ?? ""} | ${k.year ?? "-"} | p.${k.page ?? "-"} | last year: ${k.prev_value ?? "-"}${k.xcheck === "differ" ? ` | SECOND MODEL READ ${k.xvalue ?? "?"}` : ""}`)
    .join("\n");
  const ruleText = rules.map((r) => `${r.status.toUpperCase()}: ${r.title}. ${r.detail}`).join("\n");
  const claimText = claims
    .map((c, i) => `${i} | ${c.type} | number:${c.has_number ? "y" : "n"} baseline:${c.has_baseline ? "y" : "n"} deadline:${c.has_deadline ? "y" : "n"} | p.${c.page ?? "-"} | ${c.quote ?? c.claim}`)
    .join("\n");

  try {
    const r = await generate<Record<string, unknown>>({
      prefer: "grok",
      system: REVIEW_SYSTEM,
      user: reviewUser({ meta: b.meta ?? {}, assurance: b.assurance ?? {}, kpiTable, rules: ruleText, claims: claimText || "none found", narrative }),
      maxTokens: 9000,
    });
    const d = r.data as { verdict?: unknown; strengths?: unknown; flags?: Record<string, unknown>[]; claims_assessed?: Record<string, unknown>[]; fixes?: Record<string, unknown>[] };
    const sev = ["high", "medium", "low"] as const;
    const level = ["low", "medium", "high"] as const;

    const flags = (Array.isArray(d.flags) ? d.flags : []).slice(0, 12).map((f, i) => ({
      id: `f${i + 1}`,
      severity: pick(f.severity, sev, "medium"),
      category: str(f.category, 40) ?? "inconsistency",
      title: str(f.title, 140) ?? "Disclosure issue",
      explanation: str(f.explanation, 600) ?? "",
      quote: str(f.quote, 320),
      page: int(f.page),
      kpi_ids: (Array.isArray(f.kpi_ids) ? f.kpi_ids : []).filter((x): x is string => typeof x === "string" && !!KPI_BY_ID[x]).slice(0, 6),
      suggestion: str(f.suggestion, 400) ?? "",
    }));
    const order = { high: 0, medium: 1, low: 2 } as const;
    flags.sort((a, c) => order[a.severity] - order[c.severity]);

    return NextResponse.json({
      verdict: str(d.verdict, 700) ?? "",
      strengths: (Array.isArray(d.strengths) ? d.strengths : []).map((s) => str(s, 240)).filter((s): s is string => !!s).slice(0, 4),
      flags,
      claimsAssessed: (Array.isArray(d.claims_assessed) ? d.claims_assessed : []).map((c) => ({
        index: int(c.index),
        rating: pick(c.rating, ["backed", "partly_backed", "unsupported", "vague"] as const, "vague"),
        reason: str(c.reason, 300) ?? "",
      })),
      fixes: (Array.isArray(d.fixes) ? d.fixes : []).slice(0, 8).map((f) => ({
        action: str(f.action, 260) ?? "",
        why: str(f.why, 300) ?? "",
        kpi_ids: (Array.isArray(f.kpi_ids) ? f.kpi_ids : []).filter((x): x is string => typeof x === "string" && !!KPI_BY_ID[x]).slice(0, 6),
        effort: pick(f.effort, level, "medium"),
        impact: pick(f.impact, level, "medium"),
      })).filter((f) => f.action),
      provider: r.provider,
      model: r.model,
      fellBack: r.fellBack,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Model call failed";
    return NextResponse.json({ error: msg }, { status: errorStatus(e) });
  }
}
