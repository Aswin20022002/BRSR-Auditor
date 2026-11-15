import { NextResponse } from "next/server";
import { generate, errorStatus } from "@/lib/server/llm";
import { bad, guard } from "@/lib/server/guard";
import { COMPARE_SYSTEM } from "@/lib/server/prompts";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

interface Summary {
  name?: string;
  fy?: string | null;
  sector?: string | null;
  scores?: Record<string, number | string | null>;
  assurance?: string;
  kpisFound?: number;
  highFlags?: string[];
  ruleProblems?: string[];
  missing?: string[];
}

const clip = (s: unknown, n: number) => (typeof s === "string" ? s.slice(0, n) : "");

export async function POST(req: Request) {
  const denied = guard(req);
  if (denied) return denied;

  let b: { audits?: Summary[] };
  try {
    b = await req.json();
  } catch {
    return bad("Invalid request body");
  }
  const audits = Array.isArray(b.audits) ? b.audits.slice(0, 3) : [];
  if (audits.length < 2) return bad("Pick at least two audits");

  const text = audits
    .map((a, i) =>
      [
        `Company ${i + 1}: ${clip(a.name, 120)} (${clip(a.fy, 20)}, ${clip(a.sector, 40)})`,
        `Scores: ${JSON.stringify(a.scores ?? {})}`,
        `Assurance: ${clip(a.assurance, 20)}. KPIs found: ${Number(a.kpisFound) || 0} of 46.`,
        `High risk flags: ${(a.highFlags ?? []).slice(0, 4).map((x) => clip(x, 140)).join("; ") || "none"}`,
        `Failed or warned rules: ${(a.ruleProblems ?? []).slice(0, 4).map((x) => clip(x, 140)).join("; ") || "none"}`,
        `Missing KPIs: ${(a.missing ?? []).slice(0, 8).map((x) => clip(x, 80)).join("; ") || "none"}`,
      ].join("\n"),
    )
    .join("\n\n");

  try {
    const r = await generate<string>({ prefer: "grok", system: COMPARE_SYSTEM, user: text, json: false, maxTokens: 900, budgetMs: 40_000 });
    return NextResponse.json({ summary: String(r.data).trim(), provider: r.provider, model: r.model });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Model call failed" }, { status: errorStatus(e) });
  }
}
