export type AttrId =
  | "ghg" | "water" | "energy" | "waste"
  | "wellbeing" | "gender" | "inclusive"
  | "fairness" | "openness";
export type GroupId = "env" | "social" | "gov";

export interface Attr {
  id: AttrId;
  name: string;
  group: GroupId;
  letter: "E" | "S" | "G";
  what: string;
}

export interface KpiDef {
  id: string;
  attr: AttrId;
  label: string;
  unit: string;
  kind: "number" | "percent" | "count";
  hint: string;
}

export const ATTRS: Attr[] = [
  { id: "ghg", name: "GHG footprint", group: "env", letter: "E", what: "Scope 1 and Scope 2 emissions and their intensity." },
  { id: "water", name: "Water footprint", group: "env", letter: "E", what: "Water withdrawn, consumed and discharged, with intensity." },
  { id: "energy", name: "Energy footprint", group: "env", letter: "E", what: "Total energy used, renewable share and intensity." },
  { id: "waste", name: "Circularity (waste)", group: "env", letter: "E", what: "Waste by category, how much is recovered and how much is disposed." },
  { id: "wellbeing", name: "Employee wellbeing and safety", group: "social", letter: "S", what: "Wellbeing spend and workplace injury and fatality data." },
  { id: "gender", name: "Gender diversity", group: "social", letter: "S", what: "Wages paid to women and sexual harassment complaints." },
  { id: "inclusive", name: "Inclusive development", group: "social", letter: "S", what: "Sourcing from MSMEs and India, jobs in smaller towns." },
  { id: "fairness", name: "Fairness with customers and suppliers", group: "gov", letter: "G", what: "Customer data breaches and supplier payment days." },
  { id: "openness", name: "Openness of business", group: "gov", letter: "G", what: "Concentration of trade and related party dealings." },
];

export const GROUPS: { id: GroupId; name: string }[] = [
  { id: "env", name: "Environment" },
  { id: "social", name: "Social" },
  { id: "gov", name: "Governance" },
];

const k = (
  id: string,
  attr: AttrId,
  label: string,
  unit: string,
  kind: KpiDef["kind"],
  hint: string,
): KpiDef => ({ id, attr, label, unit, kind, hint });

export const KPIS: KpiDef[] = [
  k("ghg_s1", "ghg", "Total Scope 1 emissions", "tCO2e", "number", "Direct emissions. Usually a table with current and previous year."),
  k("ghg_s2", "ghg", "Total Scope 2 emissions", "tCO2e", "number", "Purchased electricity and energy emissions."),
  k("ghg_int_ppp", "ghg", "GHG intensity per rupee of turnover (PPP adjusted)", "as reported", "number", "Scope 1 plus 2 divided by turnover adjusted for purchasing power parity."),
  k("ghg_int_out", "ghg", "GHG intensity per unit of physical output", "as reported", "number", "Optional intensity per tonne, unit or similar output."),
  k("water_withdrawal", "water", "Total water withdrawal", "kL", "number", "Sum of surface, ground, third party and other sources."),
  k("water_consumption", "water", "Total water consumption", "kL", "number", "Withdrawal minus discharge."),
  k("water_discharge", "water", "Total water discharged", "kL", "number", "Discharge by destination and level of treatment."),
  k("water_int_ppp", "water", "Water intensity per rupee of turnover (PPP adjusted)", "as reported", "number", "Water consumption divided by PPP adjusted turnover."),
  k("water_int_out", "water", "Water intensity per unit of physical output", "as reported", "number", "Optional intensity per unit of output."),
  k("energy_total", "energy", "Total energy consumed", "GJ", "number", "Electricity, fuel and other sources, renewable and non renewable."),
  k("energy_renewable_pct", "energy", "Share of energy from renewable sources", "%", "percent", "Renewable energy as a share of total energy consumed."),
  k("energy_int_ppp", "energy", "Energy intensity per rupee of turnover (PPP adjusted)", "as reported", "number", "Total energy divided by PPP adjusted turnover."),
  k("energy_int_out", "energy", "Energy intensity per unit of physical output", "as reported", "number", "Optional intensity per unit of output."),
  k("waste_plastic", "waste", "Plastic waste (A)", "MT", "number", "Waste generated, category A."),
  k("waste_ewaste", "waste", "E-waste (B)", "MT", "number", "Waste generated, category B."),
  k("waste_biomed", "waste", "Bio-medical waste (C)", "MT", "number", "Waste generated, category C."),
  k("waste_cnd", "waste", "Construction and demolition waste (D)", "MT", "number", "Waste generated, category D."),
  k("waste_battery", "waste", "Battery waste (E)", "MT", "number", "Waste generated, category E."),
  k("waste_radio", "waste", "Radioactive waste (F)", "MT", "number", "Waste generated, category F."),
  k("waste_haz", "waste", "Other hazardous waste (G)", "MT", "number", "Waste generated, category G."),
  k("waste_nonhaz", "waste", "Other non-hazardous waste (H)", "MT", "number", "Waste generated, category H."),
  k("waste_total", "waste", "Total waste generated (A to H)", "MT", "number", "Sum of all waste categories."),
  k("waste_int_ppp", "waste", "Waste intensity per rupee of turnover (PPP adjusted)", "as reported", "number", "Total waste divided by PPP adjusted turnover."),
  k("waste_int_out", "waste", "Waste intensity per unit of physical output", "as reported", "number", "Optional intensity per unit of output."),
  k("waste_recovered", "waste", "Waste recovered (recycled, re-used, other recovery)", "MT", "number", "Total recovered across all recovery routes."),
  k("waste_disposed", "waste", "Waste disposed (landfill, incineration, other)", "MT", "number", "Total disposed across all disposal routes."),
  k("wellbeing_spend_pct", "wellbeing", "Spend on wellbeing as % of revenue", "%", "percent", "Employee and worker wellbeing measures as a share of revenue."),
  k("ltifr", "wellbeing", "Lost time injury frequency rate (LTIFR)", "per million person-hours", "number", "Safety incidents table, employees and workers."),
  k("injuries_recordable", "wellbeing", "Total recordable work-related injuries", "count", "count", "Safety incidents table."),
  k("fatalities", "wellbeing", "Number of fatalities", "count", "count", "Safety incidents table."),
  k("injuries_high", "wellbeing", "High consequence injuries or ill-health (excl. fatalities)", "count", "count", "Safety incidents table."),
  k("wages_female_pct", "gender", "Gross wages paid to women as % of total wages", "%", "percent", "Often shown as a ratio or percentage by category."),
  k("posh_total", "gender", "Sexual harassment complaints received", "count", "count", "POSH complaints table."),
  k("posh_pct_female", "gender", "Complaints as % of female employees and workers", "%", "percent", "POSH complaints table."),
  k("posh_upheld", "gender", "Sexual harassment complaints upheld", "count", "count", "POSH complaints table."),
  k("msme_pct", "inclusive", "Input material sourced from MSMEs and small producers", "%", "percent", "Share of total input material by value."),
  k("india_pct", "inclusive", "Input material sourced from within India", "%", "percent", "Share of total input material by value."),
  k("smalltown_pct", "inclusive", "Wages paid in smaller towns as % of total wage cost", "%", "percent", "Rural, semi-urban, urban and metropolitan split."),
  k("data_breach_pct", "fairness", "Customer data breaches as % of total breaches", "%", "percent", "Data privacy and cyber security disclosures."),
  k("payable_days", "fairness", "Number of days of accounts payable", "days", "number", "Accounts payable times 365 divided by cost of goods or services procured."),
  k("conc_purchases_th", "openness", "Purchases from trading houses as % of total purchases", "%", "percent", "Concentration of purchases."),
  k("conc_sales_dealers", "openness", "Sales to dealers and distributors as % of total sales", "%", "percent", "Concentration of sales."),
  k("rpt_purchases", "openness", "Related party purchases as % of total purchases", "%", "percent", "Share of related party transactions."),
  k("rpt_sales", "openness", "Related party sales as % of total sales", "%", "percent", "Share of related party transactions."),
  k("rpt_loans", "openness", "Loans and advances to related parties", "%", "percent", "Share of total loans and advances."),
  k("rpt_investments", "openness", "Investments in related parties", "%", "percent", "Share of total investments."),
];

export const KPI_BY_ID: Record<string, KpiDef> = Object.fromEntries(KPIS.map((x) => [x.id, x]));
export const ATTR_BY_ID: Record<string, Attr> = Object.fromEntries(ATTRS.map((x) => [x.id, x]));

export function kpisForGroup(g: GroupId): KpiDef[] {
  const attrIds = ATTRS.filter((a) => a.group === g).map((a) => a.id);
  return KPIS.filter((x) => attrIds.includes(x.attr));
}
