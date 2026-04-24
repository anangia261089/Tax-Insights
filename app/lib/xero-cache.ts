import { getAuthenticatedXero } from "@/app/lib/xero-auth";
import { analyseDeductions } from "@/app/lib/tax-engine";
import type { TaxAnalysisResult } from "@/app/lib/types";
import type { XeroClient } from "xero-node";

const TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  data: TaxAnalysisResult;
  expiresAt: number;
}

// Module-scoped cache. On Vercel this is per-serverless-instance,
// so warm invocations within ~5 min on the same instance hit the cache.
// Cold starts or concurrent instances miss and re-fetch — acceptable tradeoff
// for zero-dependency simplicity.
const cache = new Map<string, CacheEntry>();

async function fetchAndAnalyse(xero: XeroClient, tenantId: string): Promise<TaxAnalysisResult> {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const dateFilter = `Date >= DateTime(${oneYearAgo.getFullYear()}, ${oneYearAgo.getMonth() + 1}, ${oneYearAgo.getDate()})`;
  const now = new Date();
  const fromDate = `${now.getFullYear() - 1}-04-01`;
  const toDate = `${now.getFullYear()}-03-31`;
  const today = now.toISOString().split("T")[0];

  const [txRes, pnlRes, bsRes, contactsRes, orgRes] = await Promise.all([
    xero.accountingApi.getBankTransactions(tenantId, undefined, dateFilter),
    xero.accountingApi.getReportProfitAndLoss(tenantId, fromDate, toDate),
    xero.accountingApi.getReportBalanceSheet(tenantId, today),
    xero.accountingApi.getContacts(tenantId, undefined, "IsSupplier==true"),
    xero.accountingApi.getOrganisations(tenantId),
  ]);

  const orgName = orgRes.body.organisations?.[0]?.name || "Your Organisation";

  const transactions = (txRes.body.bankTransactions || []).map((tx) => ({
    total: tx.total,
    contact: tx.contact?.name,
    type: tx.type?.toString(),
    lineItems: (tx.lineItems || []).map((li) => ({
      description: li.description,
      amount: li.lineAmount,
      accountCode: li.accountCode,
    })),
  }));

  const contacts = (contactsRes.body.contacts || []).map((c) => ({
    name: c.name,
    isSupplier: c.isSupplier,
  }));

  return analyseDeductions(
    orgName,
    transactions,
    pnlRes.body.reports?.[0] || null,
    bsRes.body.reports?.[0] || null,
    contacts
  );
}

export async function getCachedAnalysis(options: { forceRefresh?: boolean } = {}): Promise<{
  tenantId: string;
  result: TaxAnalysisResult;
  cached: boolean;
}> {
  const { xero, tenantId } = await getAuthenticatedXero();

  if (!options.forceRefresh) {
    const entry = cache.get(tenantId);
    if (entry && entry.expiresAt > Date.now()) {
      return { tenantId, result: entry.data, cached: true };
    }
  }

  const result = await fetchAndAnalyse(xero, tenantId);
  cache.set(tenantId, { data: result, expiresAt: Date.now() + TTL_MS });
  return { tenantId, result, cached: false };
}

export function invalidateAnalysisCache(tenantId: string): void {
  cache.delete(tenantId);
}
