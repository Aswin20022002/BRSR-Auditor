import { CheckCircle2, CircleAlert } from "lucide-react";
import type { Audit } from "@/lib/types";
import { reliabilityOf } from "@/lib/reliability";
import { Card, Pill } from "./ui";

export default function ReliabilityCard({ audit }: { audit: Audit }) {
  const r = reliabilityOf(audit);
  const tone = r.level === "High" ? "ok" : r.level === "Medium" ? "warn" : "bad";
  return (
    <Card className="print-break p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-xl font-bold">How much to trust this audit</h2>
        <Pill tone={tone}>{r.level} confidence</Pill>
      </div>
      <p className="mt-1 max-w-3xl text-sm text-mute">
        This is about how well the tool read the report, which is separate from the disclosure score. It counts four plain tests, and High means all four passed.
      </p>
      <ul className="mt-3 grid gap-2.5 md:grid-cols-2">
        {r.items.map((i) => (
          <li key={i.label} className="flex gap-2.5 text-sm">
            {i.ok ? <CheckCircle2 size={20} className="mt-0.5 flex-none text-ok" aria-label="Passed" /> : <CircleAlert size={20} className="mt-0.5 flex-none text-warn" aria-label="Not passed" />}
            <div>
              <p className="font-semibold">{i.label}</p>
              <p className="text-mute">{i.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
