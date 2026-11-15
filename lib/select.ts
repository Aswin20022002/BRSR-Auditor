export type SelectGroup = "env" | "social" | "gov" | "context";

const TERMS: Record<SelectGroup, Array<[string, number]>> = {
  env: [
    ["scope 1", 4], ["scope 2", 4], ["scope 3", 1], ["ghg", 3], ["greenhouse", 3], ["tco2e", 4], ["co2e", 3], ["tonnes of co2", 3],
    ["water withdrawal", 4], ["water consumption", 4], ["water discharge", 4], ["kilolitre", 3], ["kl)", 2], ["withdrawal", 2], ["discharge", 2],
    ["energy consumption", 3], ["total energy", 3], ["gigajoule", 3], ["joules", 2], [" gj", 2], ["renewable", 3], ["electricity", 1],
    ["plastic waste", 4], ["e-waste", 4], ["bio-medical", 4], ["biomedical", 3], ["battery waste", 4], ["hazardous waste", 4], ["radioactive", 3],
    ["construction and demolition", 4], ["landfill", 3], ["incineration", 3], ["recycled", 2], ["re-used", 2], ["recovery", 1], ["intensity", 2], ["ppp", 3], ["purchasing power parity", 3],
    ["principle 6", 2], ["waste generated", 4],
  ],
  social: [
    ["wellbeing", 3], ["well-being", 3], ["ltifr", 5], ["lost time injury", 5], ["fatalit", 4], ["recordable", 4], ["work-related injur", 4], ["high consequence", 4], ["safety", 2],
    ["gross wages", 5], ["female", 2], ["women", 2], ["sexual harassment", 4], ["posh", 3], ["complaints", 1],
    ["msme", 4], ["small producers", 4], ["sourced from within india", 4], ["input material", 3], ["smaller towns", 5], ["semi-urban", 3], ["rural", 1], ["wages paid", 3], ["total wage cost", 4],
    ["principle 3", 2], ["principle 5", 2], ["principle 8", 2],
  ],
  gov: [
    ["trading houses", 5], ["dealers", 3], ["related part", 3], ["accounts payable", 5], ["number of days of accounts payable", 5], ["data breach", 4], ["cyber security", 3], ["cybersecurity", 3],
    ["concentration of purchases", 5], ["concentration of sales", 5], ["loans and advances", 4], ["investments", 2], ["consumer complaints", 2], ["customer", 1],
    ["principle 1", 2], ["principle 9", 2], ["share of rpts", 4],
  ],
  context: [
    ["name of the listed entity", 6], ["corporate identity number", 5], ["cin", 1], ["financial year", 2], ["turnover", 3], ["number of employees", 3], ["section a", 3], ["general disclosures", 3],
    ["reporting boundary", 3], ["standalone basis", 2], ["consolidated basis", 2],
    ["assurance", 4], ["independent assessment", 4], ["reasonable assurance", 6], ["limited assurance", 6], ["isae", 5], ["assurance provider", 5], ["brsr core", 3],
    ["net zero", 4], ["net-zero", 4], ["carbon neutral", 4], ["science based", 4], ["sbti", 4], ["target", 2], ["by 2030", 3], ["by 2040", 3], ["by 2050", 3], ["by 2070", 3],
    ["commitment", 2], ["decarbon", 3], ["zero waste", 3], ["water positive", 3], ["ambition", 2],
  ],
};

const ZONE_MARKERS = [
  "business responsibility and sustainability report",
  "business responsibility & sustainability report",
  "brsr",
  "section a: general disclosures",
  "section b: management and process disclosures",
  "section c: principle wise performance disclosure",
];

function countOccurrences(hay: string, needle: string, cap: number): number {
  let n = 0;
  let i = hay.indexOf(needle);
  while (i !== -1 && n < cap) {
    n++;
    i = hay.indexOf(needle, i + needle.length);
  }
  return n;
}

/** Finds the PDF page range that most likely holds the BRSR section. */
export function findBrsrZone(pages: string[]): { start: number; end: number } | null {
  const hits: number[] = [];
  pages.forEach((p, i) => {
    const t = p.toLowerCase();
    let s = 0;
    for (const m of ZONE_MARKERS) if (t.includes(m)) s += m === "brsr" ? 1 : 3;
    if (s >= 3) hits.push(i);
  });
  if (hits.length === 0) return null;
  // Use the densest cluster: widest span that keeps gaps under 25 pages.
  let best = { start: hits[0], end: hits[0], count: 1 };
  let cur = { start: hits[0], end: hits[0], count: 1 };
  for (let i = 1; i < hits.length; i++) {
    if (hits[i] - cur.end <= 25) {
      cur.end = hits[i];
      cur.count++;
    } else {
      cur = { start: hits[i], end: hits[i], count: 1 };
    }
    if (cur.count > best.count) best = { ...cur };
  }
  return { start: Math.max(0, best.start - 2), end: Math.min(pages.length - 1, best.end + 12) };
}

export interface Selection {
  text: string;
  pageNumbers: number[]; // 1-based
  chars: number;
}

export function selectPages(pages: string[], group: SelectGroup, budgetChars = 130_000): Selection {
  const zone = findBrsrZone(pages);
  const terms = TERMS[group];
  const scored = pages.map((p, i) => {
    const t = p.toLowerCase();
    let s = 0;
    for (const [term, w] of terms) s += Math.min(countOccurrences(t, term, 4), 4) * w;
    if (zone && i >= zone.start && i <= zone.end) s += s > 0 ? 6 : 0;
    return { i, s, len: p.length };
  });

  const ranked = scored.filter((x) => x.s > 0).sort((a, b) => b.s - a.s);
  const chosen = new Set<number>();
  let used = 0;
  for (const r of ranked) {
    if (used + r.len > budgetChars) continue;
    chosen.add(r.i);
    used += r.len;
    if (r.s >= 14) {
      // tables often continue on the next page
      const nxt = r.i + 1;
      if (nxt < pages.length && !chosen.has(nxt) && used + pages[nxt].length <= budgetChars) {
        chosen.add(nxt);
        used += pages[nxt].length;
      }
    }
  }
  if (group === "context" && zone) {
    for (let i = zone.start; i < Math.min(zone.start + 6, pages.length); i++) {
      if (!chosen.has(i) && used + pages[i].length <= budgetChars) {
        chosen.add(i);
        used += pages[i].length;
      }
    }
  }
  const order = [...chosen].sort((a, b) => a - b);
  const text = order.map((i) => `=== PDF PAGE ${i + 1} ===\n${pages[i]}`).join("\n\n");
  return { text, pageNumbers: order.map((i) => i + 1), chars: text.length };
}

const STOP = new Set("a an the of and or to in on for with is are was were be by as at from that this it its what which who how does do did has have had any all about into than then there their they them you your our we can could would should will not no yes per vs report company".split(" "));

/** Keyword retrieval for the "Ask the report" panel. */
export function retrievePages(pages: string[], question: string, k = 6, budgetChars = 28_000): Selection {
  const words = question
    .toLowerCase()
    .replace(/[^a-z0-9\- ]+/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
  const zone = findBrsrZone(pages);
  const scored = pages.map((p, i) => {
    const t = p.toLowerCase();
    let s = 0;
    for (const w of words) s += Math.min(countOccurrences(t, w, 6), 6) * (w.length > 5 ? 2 : 1);
    if (zone && i >= zone.start && i <= zone.end) s *= 1.4;
    return { i, s };
  });
  const top = scored.filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, k);
  const order = top.map((x) => x.i).sort((a, b) => a - b);
  let text = "";
  const used: number[] = [];
  for (const i of order) {
    const chunk = `=== PDF PAGE ${i + 1} ===\n${pages[i]}\n\n`;
    if (text.length + chunk.length > budgetChars) {
      text += chunk.slice(0, Math.max(0, budgetChars - text.length));
      used.push(i + 1);
      break;
    }
    text += chunk;
    used.push(i + 1);
  }
  return { text, pageNumbers: used, chars: text.length };
}
