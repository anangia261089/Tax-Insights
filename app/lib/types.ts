export interface XeroTokens {
  accessToken: string;
  refreshToken: string;
  idToken: string;
  tenantId: string;
  expiresAt: number; // Unix timestamp
}

export interface SessionData {
  xero?: XeroTokens;
}

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
}
