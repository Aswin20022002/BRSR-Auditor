import { AlertTriangle, CheckCircle2, CircleHelp, CircleSlash, MinusCircle, ShieldAlert, ShieldCheck, ShieldQuestion, Users, XCircle } from "lucide-react";
import type { Evidence, Severity, Status } from "@/lib/types";

export function Pill({ tone, children, icon }: { tone: "ok" | "warn" | "viol" | "bad" | "mute" | "brand"; children: React.ReactNode; icon?: React.ReactNode }) {
  const tones: Record<string, string> = {
    ok: "bg-[#e3f4ef] text-ok",
    warn: "bg-[#fbeed6] text-warn",
    viol: "bg-[#ecEAfb] text-viol",
    bad: "bg-[#f9e3df] text-bad",
    mute: "bg-[#e8ebf5] text-mute",
    brand: "bg-[#e5e9fc] text-brand-ink",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>
      {icon}
      {children}
    </span>
  );
}

export function StatusPill({ status }: { status: Status }) {
  switch (status) {
    case "disclosed":
      return <Pill tone="ok" icon={<CheckCircle2 size={14} aria-hidden />}>Disclosed</Pill>;
    case "partial":
      return <Pill tone="warn" icon={<MinusCircle size={14} aria-hidden />}>Partial</Pill>;
    case "not_found":
      return <Pill tone="bad" icon={<XCircle size={14} aria-hidden />}>Not found</Pill>;
    case "not_applicable":
      return <Pill tone="mute" icon={<CircleSlash size={14} aria-hidden />}>Not applicable</Pill>;
    default:
      return <Pill tone="mute" icon={<CircleHelp size={14} aria-hidden />}>Not analysed</Pill>;
  }
}

export function EvidencePill({ evidence }: { evidence: Evidence }) {
  switch (evidence) {
    case "verified":
      return <Pill tone="ok" icon={<ShieldCheck size={14} aria-hidden />}>Quote confirmed in PDF</Pill>;
    case "partial":
      return <Pill tone="warn" icon={<ShieldQuestion size={14} aria-hidden />}>Quote partly matched</Pill>;
    case "unverified":
      return <Pill tone="viol" icon={<ShieldAlert size={14} aria-hidden />}>Quote not found in PDF</Pill>;
    default:
      return <Pill tone="mute" icon={<ShieldQuestion size={14} aria-hidden />}>No quote</Pill>;
  }
}

export function CrossPill({ xcheck }: { xcheck?: "agree" | "differ" | "unchecked" }) {
  if (xcheck === "agree") return <Pill tone="ok" icon={<Users size={14} aria-hidden />}>Second model agrees</Pill>;
  if (xcheck === "differ") return <Pill tone="bad" icon={<Users size={14} aria-hidden />}>Models disagree</Pill>;
  return null;
}

export function SeverityPill({ severity }: { severity: Severity }) {
  if (severity === "high") return <Pill tone="bad" icon={<AlertTriangle size={14} aria-hidden />}>High risk</Pill>;
  if (severity === "medium") return <Pill tone="warn" icon={<AlertTriangle size={14} aria-hidden />}>Medium risk</Pill>;
  return <Pill tone="mute" icon={<AlertTriangle size={14} aria-hidden />}>Low risk</Pill>;
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-line bg-surface shadow-lift ${className}`}>{children}</div>;
}

export const bandColor = (band: string) => (band === "Strong" ? "var(--ok)" : band === "Solid" ? "var(--brand)" : band === "Patchy" ? "var(--warn)" : "var(--bad)");
