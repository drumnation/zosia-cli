/**
 * Plaid/Financial Data Fetcher
 *
 * Priority 3: Financial context is important but doesn't need to be real-time
 *
 * User requirement: "Don't hit Plaid more than once a day. Probably once a week.
 * We don't really need up to date financial data, you know, but like generally
 * correct is where we want to be."
 *
 * Fetches balances and recent transactions from Plaid API.
 * Rate limit: WEEKLY (via cache TTL)
 */
import type { FinancialData } from '../types.js';
interface PlaidFetcherConfig {
    clientId: string;
    secret: string;
    accessToken: string;
    debug?: boolean;
}
/**
 * Create a Plaid financial data fetcher
 *
 * IMPORTANT: This should only be called WEEKLY due to Plaid rate limits
 * and the user's explicit requirement to minimize API calls.
 *
 * @example
 * ```typescript
 * const fetcher = makePlaidFetcher({
 *   clientId: await brainCreds.get('plaid_client_id'),
 *   secret: await brainCreds.get('plaid_secret'),
 *   accessToken: await brainCreds.get('plaid_access_token'),
 *   debug: true,
 * });
 *
 * const data = await fetcher();
 * console.log(`Checking balance: $${data.balances.checking}`);
 * ```
 */
export declare function makePlaidFetcher(config: PlaidFetcherConfig): () => Promise<FinancialData>;
/**
 * Create a mock Plaid fetcher for development/testing
 */
export declare function makeMockPlaidFetcher(options?: {
    checkingBalance?: number;
    budgetStatus?: 'on-track' | 'over' | 'under';
    spendingTrend?: 'normal' | 'elevated' | 'reduced';
}): () => Promise<FinancialData>;
export {};
//# sourceMappingURL=plaid.fetcher.d.ts.map