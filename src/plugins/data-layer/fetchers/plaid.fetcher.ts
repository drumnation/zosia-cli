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

import type {
  FinancialData,
  FinancialBalances,
  FinancialTransaction,
  FinancialPatterns,
} from '../types.js';

// ============================================================================
// Configuration
// ============================================================================

const PLAID_API_BASE = 'https://production.plaid.com';

interface PlaidFetcherConfig {
  clientId: string;
  secret: string;
  accessToken: string; // Item access token
  debug?: boolean;
}

// ============================================================================
// API Response Types (from Plaid API)
// ============================================================================

interface PlaidAccount {
  account_id: string;
  name: string;
  official_name: string | null;
  type: 'depository' | 'credit' | 'loan' | 'investment' | 'other';
  subtype: string;
  balances: {
    current: number | null;
    available: number | null;
    limit: number | null;
  };
}

interface PlaidTransaction {
  transaction_id: string;
  account_id: string;
  amount: number; // Positive for debits, negative for credits
  date: string;
  name: string;
  merchant_name: string | null;
  category: string[] | null;
  pending: boolean;
}

interface PlaidAccountsResponse {
  accounts: PlaidAccount[];
  item: { item_id: string };
}

interface PlaidTransactionsResponse {
  accounts: PlaidAccount[];
  transactions: PlaidTransaction[];
  total_transactions: number;
}

// ============================================================================
// Category Analysis
// ============================================================================

const CATEGORY_MAPPINGS: Record<string, string> = {
  // Plaid categories to simplified categories
  'Food and Drink': 'food',
  'Travel': 'travel',
  'Transportation': 'transportation',
  'Shops': 'shopping',
  'Recreation': 'entertainment',
  'Service': 'services',
  'Transfer': 'transfer',
  'Payment': 'payment',
  'Healthcare': 'healthcare',
  'Community': 'community',
};

function simplifyCategory(plaidCategories: string[] | null): string {
  if (!plaidCategories || plaidCategories.length === 0) {
    return 'other';
  }

  const topCategory = plaidCategories[0];
  return CATEGORY_MAPPINGS[topCategory] || 'other';
}

// ============================================================================
// Fetcher Implementation
// ============================================================================

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
export function makePlaidFetcher(config: PlaidFetcherConfig): () => Promise<FinancialData> {
  const { clientId, secret, accessToken, debug = false } = config;

  return async (): Promise<FinancialData> => {
    if (debug) {
      console.log('[PlaidFetcher] Fetching data from Plaid API (weekly refresh)...');
    }

    try {
      // Calculate date range (last 30 days for spending patterns)
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      // Fetch accounts and transactions in parallel
      const [accountsResponse, transactionsResponse] = await Promise.all([
        fetch(`${PLAID_API_BASE}/accounts/get`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: clientId,
            secret: secret,
            access_token: accessToken,
          }),
        }),
        fetch(`${PLAID_API_BASE}/transactions/get`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: clientId,
            secret: secret,
            access_token: accessToken,
            start_date: startDate,
            end_date: endDate,
            options: {
              count: 100, // Limit to recent transactions
              offset: 0,
            },
          }),
        }),
      ]);

      if (!accountsResponse.ok) {
        throw new Error(`Plaid accounts error: ${accountsResponse.status}`);
      }

      // Transactions endpoint may return 400 if no transactions
      const accountsData = (await accountsResponse.json()) as PlaidAccountsResponse;

      let transactionsData: PlaidTransactionsResponse | null = null;
      if (transactionsResponse.ok) {
        transactionsData = (await transactionsResponse.json()) as PlaidTransactionsResponse;
      }

      // Transform data
      const balances = aggregateBalances(accountsData.accounts);
      const recentTransactions = transformTransactions(
        transactionsData?.transactions || []
      );
      const patterns = analyzePatterns(
        transactionsData?.transactions || [],
        balances
      );

      if (debug) {
        console.log(
          `[PlaidFetcher] Checking: $${balances.checking}, ` +
            `Credit: $${Math.abs(balances.credit)}`
        );
      }

      return {
        balances,
        recentTransactions,
        patterns,
        fetchedAt: new Date(),
      };
    } catch (error) {
      if (debug) {
        console.error('[PlaidFetcher] Error:', error);
      }
      throw error;
    }
  };
}

// ============================================================================
// Data Transformers
// ============================================================================

function aggregateBalances(accounts: PlaidAccount[]): FinancialBalances {
  let checking = 0;
  let savings = 0;
  let credit = 0;

  for (const account of accounts) {
    const balance = account.balances.current || 0;

    if (account.type === 'depository') {
      if (account.subtype === 'checking') {
        checking += balance;
      } else if (account.subtype === 'savings') {
        savings += balance;
      }
    } else if (account.type === 'credit') {
      // Credit balances are typically positive (amount owed)
      // We store as negative to indicate debt
      credit -= balance;
    }
  }

  return { checking, savings, credit };
}

function transformTransactions(
  transactions: PlaidTransaction[]
): FinancialTransaction[] {
  // Filter out pending and transfer transactions, take most recent
  return transactions
    .filter((t) => !t.pending && simplifyCategory(t.category) !== 'transfer')
    .slice(0, 20)
    .map((t) => ({
      description: t.merchant_name || t.name,
      amount: t.amount, // Positive = money spent, negative = money received
      category: simplifyCategory(t.category),
      date: new Date(t.date),
    }));
}

function analyzePatterns(
  transactions: PlaidTransaction[],
  balances: FinancialBalances
): FinancialPatterns {
  // Calculate spending by category
  const categoryTotals: Record<string, number> = {};
  let totalSpending = 0;

  for (const t of transactions) {
    if (t.amount > 0 && !t.pending) {
      // Positive = spending
      const category = simplifyCategory(t.category);
      categoryTotals[category] = (categoryTotals[category] || 0) + t.amount;
      totalSpending += t.amount;
    }
  }

  // Determine spending trend
  // Compare first half of month to second half
  const midDate = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
  let firstHalfSpending = 0;
  let secondHalfSpending = 0;

  for (const t of transactions) {
    if (t.amount > 0 && !t.pending) {
      const txDate = new Date(t.date);
      if (txDate > midDate) {
        secondHalfSpending += t.amount;
      } else {
        firstHalfSpending += t.amount;
      }
    }
  }

  let spendingTrend: 'normal' | 'elevated' | 'reduced' = 'normal';
  if (secondHalfSpending > firstHalfSpending * 1.3) {
    spendingTrend = 'elevated';
  } else if (secondHalfSpending < firstHalfSpending * 0.7) {
    spendingTrend = 'reduced';
  }

  // Find unusual spending categories (higher than typical)
  const avgCategorySpend = totalSpending / Object.keys(categoryTotals).length || 0;
  const unusualCategories = Object.entries(categoryTotals)
    .filter(([, amount]) => amount > avgCategorySpend * 2)
    .map(([category]) => category);

  // Simple budget status based on checking balance
  // This is a rough heuristic - could be made more sophisticated
  let budgetStatus: 'on-track' | 'over' | 'under' = 'on-track';
  if (balances.checking < 500) {
    budgetStatus = 'over';
  } else if (balances.checking > 5000) {
    budgetStatus = 'under';
  }

  return {
    spendingTrend,
    unusualCategories,
    budgetStatus,
  };
}

// ============================================================================
// Mock Implementation for Development
// ============================================================================

/**
 * Create a mock Plaid fetcher for development/testing
 */
export function makeMockPlaidFetcher(options?: {
  checkingBalance?: number;
  budgetStatus?: 'on-track' | 'over' | 'under';
  spendingTrend?: 'normal' | 'elevated' | 'reduced';
}): () => Promise<FinancialData> {
  return async (): Promise<FinancialData> => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    return {
      balances: {
        checking: options?.checkingBalance ?? 2500,
        savings: 5000,
        credit: -800,
      },
      recentTransactions: [
        {
          description: 'Whole Foods',
          amount: 127.45,
          category: 'food',
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        },
        {
          description: 'Amazon',
          amount: 45.99,
          category: 'shopping',
          date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        },
        {
          description: 'Spotify Premium',
          amount: 15.99,
          category: 'entertainment',
          date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        },
      ],
      patterns: {
        spendingTrend: options?.spendingTrend ?? 'normal',
        unusualCategories: [],
        budgetStatus: options?.budgetStatus ?? 'on-track',
      },
      fetchedAt: new Date(),
    };
  };
}
