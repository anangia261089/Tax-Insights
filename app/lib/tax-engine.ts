import type { DeductionItem, TaxCategory, TaxAnalysisResult, NextStep } from "./types";

const EFFECTIVE_TAX_RATE = 0.232; // 23.2% for US SMBs
const SECTION_179_MAX = 1220000; // 2024 IRS limit

// Map Xero account names/types to IRS sections
const IRS_MAPPINGS: {
  pattern: RegExp;
  section: string;
  title: string;
}[] = [
  // §274 — Vehicle & Transportation (check before §162 since "fuel" could match both)
  { pattern: /auto|vehicle|car|mileage|parking|toll|uber|lyft|taxi/i, section: "§274", title: "Vehicle & Transportation" },
  // §162(a)(1) — Compensation
  { pattern: /wage|salary|salaries|payroll|contractor|subcontract|commission|bonus|staff/i, section: "§162(a)(1)", title: "Compensation" },
  // §179 — Accelerated Depreciation
  { pattern: /deprec|amortis|amortiz|fixed asset|equipment|machinery|computer|hardware|furniture/i, section: "§179", title: "Accelerated Depreciation" },
  // §280A — Home Office
  { pattern: /home office|home-office|work from home|residential office/i, section: "§280A", title: "Home Office" },
  // §401/§408 — Retirement Plan Contributions
  { pattern: /401k|401\(k\)|sep.?ira|simple ira|pension|profit.?sharing|retirement plan|keogh/i, section: "§401", title: "Retirement Plan Contributions" },
  // §162(l) — Self-Employed Health Insurance
  { pattern: /health insurance|medical insurance|dental insurance|vision insurance|self.?employed.*health|owner.*health/i, section: "§162(l)", title: "Self-Employed Health Insurance" },
  // §164 — State & Local Taxes
  { pattern: /state tax|local tax|property tax|franchise tax|sales tax paid|payroll tax|employer tax/i, section: "§164", title: "State & Local Taxes (SALT)" },
  // §162 — Ordinary & Necessary Business Expenses (broad catch-all)
  { pattern: /fuel|gas|maintenance|repair|insurance|legal|lawyer|attorney|accounting|tax prep|advertis|marketing|promotion|office|supplies|rent|lease|utility|utilities|electric|water|internet|phone|telecom|postage|shipping|freight|travel|airfare|hotel|lodging|meal|dining|restaurant|catering|entertain|subscription|software|cloud|hosting|printing|stationery|cleaning|security|training|education|conference|membership|dues|license|permit|consulting|professional fee|bank fee|bank charge|merchant fee|credit card fee/i, section: "§162", title: "Ordinary & Necessary Business Expenses" },
];

function categoriseAccount(accountName: string): { section: string; title: string } {
  for (const mapping of IRS_MAPPINGS) {
    if (mapping.pattern.test(accountName)) {
      return { section: mapping.section, title: mapping.title };
    }
  }
  return { section: "§162", title: "Ordinary & Necessary Business Expenses" };
}

function flagItem(item: DeductionItem, supplierPayments: Map<string, number>): DeductionItem {
  // Vehicle fuel without mileage documentation
  if (/fuel|gas|petrol/i.test(item.account) && item.irsSection === "§274") {
    return { ...item, status: "review", reason: "Vehicle fuel expenses may need a mileage log for full deduction" };
  }

  // Home office requires exclusive-use documentation
  if (item.irsSection === "§280A") {
    return { ...item, status: "review", reason: "Home office deduction requires a space used regularly and exclusively for business — calculate sq ft percentage" };
  }

  // Retirement contributions — flag as opportunity if not already maximized
  if (item.irsSection === "§401") {
    return { ...item, status: "review", reason: "Verify contribution limits: SEP-IRA up to 25% of net self-employment income; Solo 401(k) up to $69,000 for 2024" };
  }

  // Legal costs that might mix personal/business
  if (/legal|lawyer|attorney/i.test(item.account)) {
    return { ...item, status: "review", reason: "Legal costs should be reviewed to confirm they are 100% business-related" };
  }

  // Entertainment: 0% deductible post-TCJA 2017
  if (/entertain|concert|sport|golf|ticket|club|amuse/i.test(item.account)) {
    return { ...item, status: "review", reason: "Entertainment expenses are not deductible post-TCJA (2018+) — verify this is a business meal, not entertainment" };
  }

  // Business meals: 50% deductible
  if (/meal|dining|restaurant|catering|food/i.test(item.account)) {
    return { ...item, status: "review", reason: "Business meals are 50% deductible — keep receipts and document the business purpose" };
  }

  // Contractor payments at or above the 1099-NEC filing threshold
  if (/contractor|subcontract/i.test(item.account)) {
    for (const [name, total] of supplierPayments) {
      if (total >= 600) {
        return { ...item, status: "review", reason: `Payments to ${name} ($${total.toLocaleString()}) meet or exceed the $600 threshold — Form 1099-NEC required` };
      }
    }
  }

  return { ...item, status: "claimed" };
}

interface XeroTransaction {
  total?: number;
  contact?: string;
  type?: string;
  lineItems?: {
    description?: string;
    amount?: number;
    accountCode?: string;
  }[];
}

interface XeroContact {
  name?: string;
  isSupplier?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type XeroReport = any;

export function analyseDeductions(
  orgName: string,
  transactions: XeroTransaction[],
  pnlReport: XeroReport | null,
  balanceSheetReport: XeroReport | null,
  contacts: XeroContact[]
): TaxAnalysisResult {
  // Build supplier payment totals for 1099 tracking
  const supplierPayments = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.contact && (tx.type === "SPEND" || tx.type === "SPEND_OVERPAYMENT")) {
      const current = supplierPayments.get(tx.contact) || 0;
      supplierPayments.set(tx.contact, current + Math.abs(tx.total || 0));
    }
  }

  // Extract expense line items from P&L report
  const expenseItems: DeductionItem[] = [];

  // Xero SDK returns camelCase fields (rowType, cells, value, rows)
  // Helper to read a field case-insensitively
  const getField = (obj: Record<string, unknown>, ...keys: string[]): unknown => {
    for (const key of keys) {
      if (obj[key] !== undefined) return obj[key];
    }
    return undefined;
  };

  if (pnlReport?.rows) {
    for (const section of pnlReport.rows) {
      const sectionType = getField(section, "rowType", "RowType") as string;
      const sectionRows = (getField(section, "rows", "Rows") || []) as Record<string, unknown>[];

      if (sectionType === "Section" && sectionRows.length > 0) {
        for (const row of sectionRows) {
          const rowType = getField(row, "rowType", "RowType") as string;
          const cells = (getField(row, "cells", "Cells") || []) as Record<string, unknown>[];

          if (rowType === "Row" && cells.length >= 2) {
            const accountName = (getField(cells[0], "value", "Value") || "") as string;
            const amountStr = (getField(cells[1], "value", "Value") || "0") as string;
            const amount = Math.abs(parseFloat(amountStr) || 0);

            if (amount > 0 && accountName) {
              const { section: irsSection, title } = categoriseAccount(accountName);
              const item: DeductionItem = {
                account: accountName,
                amount,
                irsSection,
                irsSectionTitle: title,
                status: "claimed",
              };
              expenseItems.push(flagItem(item, supplierPayments));
            }
          }
        }
      }
    }
  }

  // If no P&L data, fall back to transaction line items
  if (expenseItems.length === 0) {
    const accountTotals = new Map<string, number>();
    for (const tx of transactions) {
      if (tx.type === "SPEND" || tx.type === "SPEND_OVERPAYMENT" || tx.type === "SPEND_PREPAYMENT") {
        for (const li of tx.lineItems || []) {
          const name = li.description || li.accountCode || "Uncategorised";
          const current = accountTotals.get(name) || 0;
          accountTotals.set(name, current + Math.abs(li.amount || 0));
        }
      }
    }

    for (const [account, amount] of accountTotals) {
      const { section: irsSection, title } = categoriseAccount(account);
      const item: DeductionItem = {
        account,
        amount,
        irsSection,
        irsSectionTitle: title,
        status: "claimed",
      };
      expenseItems.push(flagItem(item, supplierPayments));
    }
  }

  // Group by IRS section
  const categoryMap = new Map<string, TaxCategory>();
  for (const item of expenseItems) {
    const key = item.irsSection;
    if (!categoryMap.has(key)) {
      categoryMap.set(key, {
        section: item.irsSection,
        title: item.irsSectionTitle,
        items: [],
        total: 0,
        confidence: "high",
      });
    }
    const cat = categoryMap.get(key)!;
    cat.items.push(item);
    cat.total += item.amount;
  }

  // Score confidence per category
  for (const cat of categoryMap.values()) {
    const hasReviewItems = cat.items.some((i) => i.status === "review");
    if (cat.section === "§274") {
      cat.confidence = "medium"; // vehicle always needs mileage log
    } else if (hasReviewItems) {
      cat.confidence = "medium"; // flagged items need documentation
    } else {
      cat.confidence = "high"; // clean, well-documented expenses
    }
  }

  const categories = Array.from(categoryMap.values()).sort((a, b) => b.total - a.total);

  // §179 analysis from balance sheet
  let assetValue = 0;
  if (balanceSheetReport?.rows) {
    for (const section of balanceSheetReport.rows) {
      const sectionType = getField(section, "rowType", "RowType") as string;
      const sectionRows = (getField(section, "rows", "Rows") || []) as Record<string, unknown>[];

      if (sectionType === "Section" && sectionRows.length > 0) {
        for (const row of sectionRows) {
          const rowType = getField(row, "rowType", "RowType") as string;
          const cells = (getField(row, "cells", "Cells") || []) as Record<string, unknown>[];

          if (rowType === "Row" && cells.length >= 2) {
            const name = (getField(cells[0], "value", "Value") || "") as string;
            if (/fixed asset|equipment|machinery|furniture|computer|vehicle/i.test(name)) {
              const val = parseFloat((getField(cells[1], "value", "Value") || "0") as string) || 0;
              assetValue += Math.abs(val);
            }
          }
        }
      }
    }
  }

  const currentDepreciation = categoryMap.get("§179")?.total || 0;
  const potentialAdditional = Math.min(
    Math.max(assetValue - currentDepreciation, 0),
    SECTION_179_MAX - currentDepreciation
  );

  const section179 = {
    assetValue,
    currentDepreciation,
    maxAllowable: SECTION_179_MAX,
    potentialAdditional,
    savingsByBusinessUse: [
      { percentage: 100, savings: potentialAdditional * EFFECTIVE_TAX_RATE },
      { percentage: 75, savings: potentialAdditional * 0.75 * EFFECTIVE_TAX_RATE },
      { percentage: 50, savings: potentialAdditional * 0.50 * EFFECTIVE_TAX_RATE },
    ],
  };

  // Totals
  const totalDeductions = expenseItems.reduce((sum, i) => sum + i.amount, 0);
  const itemsNeedingReview = expenseItems.filter((i) => i.status === "review").length;
  const newOpportunities = potentialAdditional > 0 ? 1 : 0;

  // Next steps
  const nextSteps: NextStep[] = [];

  if (itemsNeedingReview > 0) {
    nextSteps.push({
      step: "Review flagged items",
      detail: `${itemsNeedingReview} expense${itemsNeedingReview > 1 ? "s" : ""} need documentation or review before claiming`,
      priority: "High",
    });
  }

  if (potentialAdditional > 0) {
    nextSteps.push({
      step: "Consider §179 accelerated depreciation",
      detail: `Up to $${potentialAdditional.toLocaleString()} in assets may qualify for immediate deduction. Note: §179 cannot create a net operating loss — deduction is limited to business taxable income. Also consider 40% bonus depreciation available for 2025.`,
      priority: "High",
    });
  }

  // Suppliers at or above the 1099-NEC threshold
  const suppliersNear1099 = Array.from(supplierPayments.entries()).filter(
    ([, total]) => total >= 600
  );
  if (suppliersNear1099.length > 0) {
    nextSteps.push({
      step: "Verify 1099 reporting",
      detail: `${suppliersNear1099.length} supplier${suppliersNear1099.length > 1 ? "s" : ""} may require 1099 forms`,
      priority: "Medium",
    });
  }

  nextSteps.push({
    step: "Share with your tax advisor",
    detail: "Export this report and review with a qualified tax professional",
    priority: "Medium",
  });

  return {
    orgName,
    fiscalYear: `${new Date().getFullYear() - 1}`,
    totalDeductions,
    itemsNeedingReview,
    newOpportunities,
    estimatedTaxSavings: totalDeductions * EFFECTIVE_TAX_RATE,
    effectiveTaxRate: EFFECTIVE_TAX_RATE,
    categories,
    section179,
    nextSteps,
  };
}
