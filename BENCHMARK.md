# Benchmark and gap analysis

Reviewed in November 2026 from public product pages, papers and code. "Not evident" means not found in public material, which is not proof of absence. Ratings are per group of tools, and individual products vary.

## Five groups of existing tools

| Group | Examples | What they do | Main limit for our use case |
| --- | --- | --- | --- |
| BRSR reporting platforms | Credibl, Newtral AI, EcoActive, Benchmark Gensuite, The Sustainability Cloud, Deloitte on SAP BTP, Achilles | Templates, data collection workflows, audit trail, version control, some AI anomaly detection and auto-population | Built for the company filing the report. Paid plans with setup, configuration and training |
| Greenwashing detectors | msg Greenwashing Detector, GaiaLens | Upload a sustainability report or combine disclosures with quantitative data to flag inconsistencies | Enterprise products, demo gated, not built around the BRSR format |
| Research prototypes | EmeraldApp and EmeraldMind, InferESG, DeepGreen, academic artefacts, student BRSR NLP projects | Retrieval and knowledge graph claim verification, multi-agent assistants, NLP gap analysis | Prototypes or scripts, generic report styles or a handful of companies, no hosted product |
| ESG ratings and data | Clarity AI, Sustainalytics, MSCI | Wide coverage, scores, data feeds | Ratings differ between providers, not a page level audit of one report |
| Our product | BRSR Auditor | See below | Limits listed in the README |

## Capability comparison

| Capability | BRSR platforms | Greenwashing detectors | Research prototypes | Ratings and data | BRSR Auditor |
| --- | --- | --- | --- | --- | --- |
| Built around BRSR Core attributes and KPIs | Yes | Not evident | Partly | Not evident | Yes |
| Audits a published report from outside, no setup | Not evident | Partly | Partly | Not evident | Yes |
| Free and instant to try | Not evident | Not evident | Partly | Not evident | Yes |
| Every value linked to page and quote | Partly | Partly | Partly | Partly | Yes |
| Checks that each quote exists in the PDF | Not evident | Not evident | Partly | Not evident | Yes |
| Arithmetic and logic tests | Partly | Partly | Not evident | Partly | Yes |
| Tests claims for number, baseline, deadline | Not evident | Yes | Yes | Not evident | Yes |
| Compares assurance level with completeness | Not evident | Not evident | Not evident | Not evident | Yes |
| Second AI model reviews the first | Not evident | Not evident | Partly | Not evident | Yes |
| Prioritised fix list | Partly | Not evident | Not evident | Not evident | Yes |
| Side by side comparison | Partly | Yes | Yes | Yes | Yes |
| Questions answered with page citations | Not evident | Not evident | Yes | Not evident | Yes |
| PDF stays in the browser | Not evident | Not evident | Not evident | Not evident | Yes |

## Gaps and how each is closed

| Gap | How BRSR Auditor closes it |
| --- | --- |
| Tools serve the company filing, not the person reading the report | Upload any PDF, no setup, no account |
| Greenwashing detectors are generic and often gated | 46 BRSR Core KPIs, nine attributes, assurance against coverage logic |
| AI can invent evidence and users cannot tell | Every quote is searched in the PDF and the number must appear on that page |
| Narrative claims are never tested against numbers | Claims ledger (number, baseline, deadline) and claim versus data flags |
| Arithmetic errors slip through | 13 rules, including year on year jumps and two-model agreement |
| One model gives one opinion | Gemini extracts, Grok re-reads the headline numbers and reviews, with single model fallback |
| Scores are opaque | Formula, weights and rules published on the Method page |
| Findings are not actionable | Ranked fix list, PDF, CSV and JSON export |
| Scoring weights are arbitrary and hidden | Weights are published, adjustable, and the Compare page tests whether rankings survive four weightings |
| No easy peer view | Compare page, KPI by KPI |

## Sources

- Benchmark Gensuite BRSR software: https://benchmarkgensuite.com/brsr-reporting-software/
- Deloitte BRSR on SAP BTP: https://www.sap.com/india/products/technology-platform/partners/deloitte-touche-tohmatsu-india-llp-sustainability-reporting-regulatory-reporting-framework-brsr.html
- The Sustainability Cloud guide to BRSR software: https://www.thesustainabilitycloud.com/blog/top-5-brsr-softwares/
- Achilles BRSR: https://achilles.com/brsr
- msg Greenwashing Detector: https://msg-global.com/solutions/msg-greenwashing-detector
- GaiaLens, Portfolio Adviser: https://future.portfolio-adviser.com/?p=352816
- EmeraldMind, arXiv 2512.11506: https://arxiv.org/abs/2512.11506
- InferESG, Scott Logic: https://blog.scottlogic.com/2025/03/20/inferesg-overview.html
- JoelJosy/brsr-analysis: https://github.com/JoelJosy/brsr-analysis
- Clarity AI: https://www.clarity.ai
- SEBI BRSR Core circular, 12 July 2023: https://www.sebi.gov.in/legal/circulars/jul-2023/brsr-core-framework-for-assurance-and-esg-disclosures-for-value-chain_73854.html
