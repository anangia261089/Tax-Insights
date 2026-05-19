import { getAuthenticatedXero } from "@/app/lib/xero-auth";
import { analyseDeductions } from "@/app/lib/tax-engine";
import { withRetry } from "@/app/lib/retry";
import { resolveTenant } from "@/app/lib/tenant";
import type { TaxAnalysisResult, EntityType } from "@/app/lib/types";
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

async function fetchAndAnalyse(xero: XeroClient, tenantId: string, entityType?: EntityType | null): Promise<TaxAnalysisResult> {
  // US calendar tax year: prior year Jan 1 – Dec 31
  const taxYear = new Date().getFullYear() - 1;
  const fromDate = `${taxYear}-01-01`;
  const toDate = `${taxYear}-12-31`;
  const dateFilter = `Date >= DateTime(${taxYear}, 1, 1) AND Date <= DateTime(${taxYear}, 12, 31)`;
  const today = new Date().toISOString().split("T")[0];

  const [txRes, pnlRes, bsRes, contactsRes, orgRes] = await Promise.all([
    withRetry(() => xero.accountingApi.getBankTransactions(tenantId, undefined, dateFilter)),
    withRetry(() => xero.accountingApi.getReportProfitAndLoss(tenantId, fromDate, toDate)),
    withRetry(() => xero.accountingApi.getReportBalanceSheet(tenantId, today)),
    withRetry(() => xero.accountingApi.getContacts(tenantId, undefined, "IsSupplier==true")),
    withRetry(() => xero.accountingApi.getOrganisations(tenantId)),
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
    contacts,
    entityType
  );
}

export async function getCachedAnalysis(options: { forceRefresh?: boolean } = {}): Promise<{
  tenantId: string;
  result: TaxAnalysisResult;
  cached: boolean;
}> {
  const { xero, tenantId } = await getAuthenticatedXero();

  // Load entity type from the tenant record so the tax engine uses correct rates
  const tenant = await resolveTenant(tenantId);
  const entityType = (tenant.entityType as EntityType | null) ?? null;

  if (!options.forceRefresh) {
    const entry = cache.get(tenantId);
    // Invalidate cache if entity type changed since last fetch
    if (entry && entry.expiresAt > Date.now() && entry.data.entityType === entityType) {
      return { tenantId, result: entry.data, cached: true };
    }
  }

  const result = await fetchAndAnalyse(xero, tenantId, entityType);
  cache.set(tenantId, { data: result, expiresAt: Date.now() + TTL_MS });
  return { tenantId, result, cached: false };
}

export function invalidateAnalysisCache(tenantId: string): void {
  cache.delete(tenantId);
}
