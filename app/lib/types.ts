// Tokens are now stored in the xero_sessions DB table (encrypted).
// The cookie only carries the Xero tenant ID as a pointer.
export interface SessionData {
  xeroTenantId?: string;
}

export type EntityType =
  | "sole_proprietor"
  | "s_corp"
  | "c_corp"
  | "partnership"
  | "llc_single"
  | "llc_multi";

export const ENTITY_LABELS: Record<EntityType, string> = {
  sole_proprietor: "Sole Proprietor",
  s_corp: "S-Corp",
  c_corp: "C-Corp",
  partnership: "Partnership",
  llc_single: "LLC (single-member)",
  llc_multi: "LLC (multi-member)",
};

// Approximate combined federal effective rate by entity type.
// Sole prop / partnership / LLC include SE tax net of the 50% SE deduction.
// These are illustrative — actual rates depend on income level and state taxes.
export const ENTITY_TAX_RATES: Record<EntityType, number> = {
  sole_proprietor: 0.296,
  s_corp: 0.248,
  c_corp: 0.210,
  partnership: 0.296,
  llc_single: 0.296,
  llc_multi: 0.296,
};

// §199A QBI deduction applies to all pass-through structures.
export const QBI_ELIGIBLE: Set<EntityType> = new Set([
  "sole_proprietor",
  "s_corp",
  "partnership",
  "llc_single",
  "llc_multi",
]);

export interface DeductionItem {
  account: string;
  amount: number;
  irsSection: string;
  irsSectionTitle: string;
  status: "claimed" | "review" | "opportunity";
  reason?: string;
}

export interface TaxCategory {
  section: string;
  title: string;
  items: DeductionItem[];
  total: number;
  confidence: "high" | "medium" | "low";
}

export interface Section179Analysis {
  assetValue: number;
  currentDepreciation: number;
  maxAllowable: number;
  potentialAdditional: number;
  savingsByBusinessUse: { percentage: number; savings: number }[];
}

export interface NextStep {
  step: string;
  detail: string;
  priority: "High" | "Medium" | "Low";
}

export interface TaxAnalysisResult {
  orgName: string;
  fiscalYear: string;
  totalDeductions: number;
  itemsNeedingReview: number;
  newOpportunities: number;
  estimatedTaxSavings: number;
  effectiveTaxRate: number;
  categories: TaxCategory[];
  section179: Section179Analysis;
  nextSteps: NextStep[];
  entityType: EntityType | null;
  netProfit: number | null;
}
