# BRSR Auditor

An AI product for ESG. Upload a company's BRSR or annual report PDF and get a page-cited audit of all nine SEBI BRSR Core attributes (46 KPIs), greenwashing flags, consistency checks, a claims ledger, a fix list, and side by side comparison.

Gemini reads the report. Grok reviews it independently. Plain arithmetic rules and a quote verifier keep both honest.

## Deploy in 10 minutes

1. Create a new GitHub repository and push this folder to it.
2. Go to vercel.com, choose **Add New Project**, import the repository. Framework is detected as Next.js. Leave build settings as they are.
3. In **Settings, Environment Variables**, add:
   - `GEMINI_API_KEY` from https://aistudio.google.com/apikey (free tier is enough)
   - `XAI_API_KEY` from https://console.x.ai
   - `ACCESS_CODE` (optional, recommended): any phrase. Visitors must enter it under Settings in the app. This stops strangers from using your keys.
4. Redeploy. Open the site. The badge in the top right should read **Two-model review**.

Keys stay on the server. They are never sent to the browser or stored in the repo (`.env*` is git-ignored).

Run locally: `npm install`, copy `.env.example` to `.env.local`, fill the keys, then `npm run dev`.

## Demo script for class (5 minutes)

1. Open **Benchmark**. Show the five groups of existing tools and the nine gaps. This is your literature and market review.
2. Back on **Audit**, upload a real BRSR PDF. Watch the KPI squares fill in as each part is read.
3. On the results page, point at the score and its five parts, then the KPI map. Select a red square to jump to that KPI.
4. Open **Red flags**. Show a flag with a quote marked "Quote confirmed in PDF", then press **View page** to prove it.
5. Open **Consistency checks** to show the arithmetic tests. Open **Fix list**.
6. Use **Ask the report** with "Who gave assurance on BRSR Core and at what level?" and click a page chip.
7. Run a second company, open **Compare**, and show the side by side view.
8. Open **Method** to show the score formula, so nothing is a black box.

If wifi or quotas fail on the day, press **Try a sample audit** on the landing page. It works with no keys.

## What makes it different

See the Benchmark page or BENCHMARK.md. In short: it audits a published report from the outside, links every value to a page and a quote, proves the quote exists in the PDF, tests the arithmetic, tests claims for number, baseline and deadline, compares assurance level with completeness, uses two AI models, gives a fix list, and compares companies.

## Where AI is used

1. **Extraction (Gemini):** reads the report pages and returns 46 KPIs with units, years, previous year values, page numbers and verbatim quotes.
2. **Company facts, assurance and claims (Gemini):** reads Section A, the assurance statement and the headline targets.
3. **Cross-check (Grok):** independently re-reads 14 headline numbers. Disagreements lower the Evidence score and mark the KPI.
4. **Review (Grok):** looks for greenwashing, claim versus data mismatches and year on year oddities, rates each claim, and writes the fix list.
5. **Ask the report (Gemini):** answers questions from the report's own pages with page citations.
6. **Comparison summary (Grok):** explains in plain English how two or three audited reports differ.

AI is deliberately not used for the arithmetic rules, the quote verification or the score, so those stay reproducible and can be defended.

## Making the score defensible

- **Transparent rubric.** Every weight and rule is on the Method page.
- **Adjustable weights.** On any result, open "Test the score with other weights" to try presets or your own weights, and optionally weight anchor KPIs more. All screens and exports follow the setting.
- **Ranking robustness.** On the Compare page the same audits are rescored under four weightings and the app says whether the order of companies survives. A conclusion that does not change with the weights is the safest one to present.
- **Confidence in the audit.** Each result shows High, Medium or Low confidence in the tool's own reading, based on four plain tests, separate from the disclosure score.

Be upfront in your report that the default weights are a reasoned judgment, not calibrated on data. The robustness check is how you show that your conclusions do not depend on them.

## How it works

```
Browser                                   Vercel API routes
-------                                   -----------------
pdf.js reads the PDF locally
rank pages by BRSR vocabulary
send only the best pages  -------------->  /api/extract  Gemini returns 46 KPIs as JSON
verify every quote in the PDF text
send cited pages  ---------------------->  /api/crosscheck  Grok re-reads 14 headline numbers
compare the two reads, run 13 rules
send data, rules, claims  -------------->  /api/review   Grok writes flags, ratings, fixes
verify flag quotes
compute score                              /api/ask      Gemini answers with page citations
                              /api/compare  Grok writes a comparison summary
```

Files worth knowing:

| Path | Purpose |
| --- | --- |
| `lib/kpis.ts` | The 46 KPI checklist and nine attributes |
| `lib/rules.ts` | The 13 consistency rules |
| `lib/score.ts` | Score formula and weights |
| `lib/verify.ts` | Quote and number verification against the PDF |
| `lib/select.ts` | Page ranking and retrieval |
| `lib/pipeline.ts` | Orchestrates the audit in the browser |
| `lib/server/llm.ts` | Gemini and Grok clients with retry, model fallback and cross-provider fallback |
| `lib/server/prompts.ts` | All prompts |
| `lib/sample.ts` | Fictional sample audits for demos |

## Good to know

- **Model names change.** The server tries `GEMINI_MODEL` or `XAI_MODEL` if set, then a list of current names, and remembers which one works. If a name is retired, set the variable in Vercel.
- **One key is enough.** With a single key that model does both jobs and the badge says "Single model".
- **Free tier limits.** Gemini's free tier has per minute and per day limits. The app retries once, then shows which part failed and offers Try again.
- **Timeouts.** Each API route allows up to 60 seconds. A full audit makes four extract calls and one review call, so no single request runs long.
- **Scanned PDFs** have no text and need OCR first. The app says so.
- **Page numbers** are PDF page numbers, not the numbers printed on the page.
- **Privacy.** The PDF never leaves the browser. Only selected page text goes to the model providers. Saved audits live in the browser's local storage.

## Limits to state in your report

The AI can misread flattened PDF tables, so "Quote confirmed" proves the text exists, not that the model understood it. The KPI checklist is a working list based on SEBI's BRSR Core framework, so confirm definitions against the SEBI annexure before citing it. The score measures disclosure quality, not ESG performance.
