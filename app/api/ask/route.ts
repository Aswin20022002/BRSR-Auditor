import { NextResponse } from "next/server";
import { generate, errorStatus } from "@/lib/server/llm";
import { bad, guard } from "@/lib/server/guard";
import { ASK_SYSTEM, askUser } from "@/lib/server/prompts";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const denied = guard(req);
  if (denied) return denied;

  let b: { question?: string; context?: string; history?: { role: string; text: string }[] };
  try {
    b = await req.json();
  } catch {
    return bad("Invalid request body");
  }
  const q = (b.question ?? "").trim().slice(0, 600);
  const ctx = (b.context ?? "").slice(0, 40_000);
  if (!q) return bad("Ask a question first");
  if (ctx.length < 100) return bad("No report pages were found for that question");

  try {
    const r = await generate<string>({
      prefer: "gemini",
      system: ASK_SYSTEM,
      user: askUser(q, ctx, Array.isArray(b.history) ? b.history : []),
      json: false,
      maxTokens: 1500,
      budgetMs: 40_000,
    });
    return NextResponse.json({ answer: String(r.data).trim(), provider: r.provider, model: r.model });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Model call failed" }, { status: errorStatus(e) });
  }
}
