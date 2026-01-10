/**
 * Gmail Data Fetcher
 *
 * Priority: Medium - "Communication context for relationship awareness"
 *
 * Fetches recent emails and patterns from Gmail API.
 * Rate limit: Every 4 hours (via cache TTL)
 */

import type { GmailData, GmailMessage, GmailPatterns } from '../types.js';

// ============================================================================
// Configuration
// ============================================================================

const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1';

interface GmailFetcherConfig {
  accessToken: string;
  userId?: string; // Defaults to 'me'
  maxResults?: number;
  debug?: boolean;
}

// ============================================================================
// API Response Types (from Gmail API)
// ============================================================================

interface GmailApiMessage {
  id: string;
  threadId: string;
}

interface GmailApiMessageDetail {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  payload: {
    headers: Array<{ name: string; value: string }>;
  };
  internalDate: string;
}

interface GmailApiMessagesResponse {
  messages: GmailApiMessage[];
  nextPageToken?: string;
  resultSizeEstimate: number;
}

interface GmailApiLabelsResponse {
  labels: Array<{
    id: string;
    name: string;
    messagesUnread: number;
    messagesTotal: number;
  }>;
}

// ============================================================================
// Fetcher Implementation
// ============================================================================

/**
 * Create a Gmail data fetcher
 *
 * @example
 * ```typescript
 * const fetcher = makeGmailFetcher({
 *   accessToken: await brainCreds.get('gmail_token'),
 *   debug: true,
 * });
 *
 * const data = await fetcher();
 * console.log(`Unread: ${data.unreadCount}, Important: ${data.importantCount}`);
 * ```
 */
export function makeGmailFetcher(config: GmailFetcherConfig): () => Promise<GmailData> {
  const { accessToken, userId = 'me', maxResults = 20, debug = false } = config;

  return async (): Promise<GmailData> => {
    if (debug) {
      console.log('[GmailFetcher] Fetching data from Gmail API...');
    }

    try {
      // Fetch recent messages and labels in parallel
      const [messagesResponse, labelsResponse] = await Promise.all([
        fetch(
          `${GMAIL_API_BASE}/users/${userId}/messages?maxResults=${maxResults}&labelIds=INBOX`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        ),
        fetch(`${GMAIL_API_BASE}/users/${userId}/labels`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }),
      ]);

      if (!messagesResponse.ok || !labelsResponse.ok) {
        throw new Error(
          `Gmail API error: messages=${messagesResponse.status}, labels=${labelsResponse.status}`
        );
      }

      const [messagesData, labelsData] = await Promise.all([
        messagesResponse.json() as Promise<GmailApiMessagesResponse>,
        labelsResponse.json() as Promise<GmailApiLabelsResponse>,
      ]);

      // Fetch details for each message
      const messageDetails = await Promise.all(
        (messagesData.messages || []).slice(0, maxResults).map(async (msg) => {
          const detailResponse = await fetch(
            `${GMAIL_API_BASE}/users/${userId}/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );
          return detailResponse.json() as Promise<GmailApiMessageDetail>;
        })
      );

      // Transform to our format
      const recentMessages = messageDetails.map(transformMessage);

      // Extract label stats
      const inboxLabel = labelsData.labels.find((l) => l.id === 'INBOX');
      const importantLabel = labelsData.labels.find((l) => l.id === 'IMPORTANT');

      const unreadCount = inboxLabel?.messagesUnread ?? 0;
      const importantCount = importantLabel?.messagesUnread ?? 0;

      const patterns = detectPatterns(recentMessages, unreadCount);

      if (debug) {
        console.log(`[GmailFetcher] Unread: ${unreadCount}, Important: ${importantCount}`);
      }

      return {
        recentMessages,
        unreadCount,
        importantCount,
        patterns,
        fetchedAt: new Date(),
      };
    } catch (error) {
      if (debug) {
        console.error('[GmailFetcher] Error:', error);
      }
      throw error;
    }
  };
}

// ============================================================================
// Data Transformers
// ============================================================================

function transformMessage(raw: GmailApiMessageDetail): GmailMessage {
  const headers = raw.payload?.headers || [];
  const getHeader = (name: string) =>
    headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

  return {
    id: raw.id,
    threadId: raw.threadId,
    subject: getHeader('Subject'),
    from: getHeader('From'),
    snippet: raw.snippet,
    date: new Date(parseInt(raw.internalDate, 10)),
    isUnread: raw.labelIds?.includes('UNREAD') ?? false,
    labels: raw.labelIds || [],
  };
}

function detectPatterns(messages: GmailMessage[], unreadCount: number): GmailPatterns {
  // Calculate email volume
  let emailVolume: 'low' | 'normal' | 'high' = 'normal';
  if (unreadCount > 50) emailVolume = 'high';
  else if (unreadCount < 10) emailVolume = 'low';

  // Find top senders
  const senderCounts = new Map<string, number>();
  for (const msg of messages) {
    // Extract email or name from "Name <email@domain.com>" format
    const sender = msg.from.replace(/<.*>/, '').trim() || msg.from;
    senderCounts.set(sender, (senderCounts.get(sender) || 0) + 1);
  }

  const topSenders = Array.from(senderCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([sender]) => sender);

  // Count important unread
  const importantUnread = messages.filter(
    (m) => m.isUnread && m.labels.includes('IMPORTANT')
  ).length;

  // Estimate emails needing response (heuristic: unread + not from known services)
  const responseNeeded = messages.filter((m) => {
    if (!m.isUnread) return false;
    // Exclude obvious automated emails
    const automatedPatterns = [
      'noreply',
      'no-reply',
      'donotreply',
      'notification',
      'alert',
      'mailer-daemon',
    ];
    const fromLower = m.from.toLowerCase();
    return !automatedPatterns.some((p) => fromLower.includes(p));
  }).length;

  return {
    unreadCount,
    importantUnread,
    topSenders,
    emailVolume,
    responseNeeded,
  };
}

// ============================================================================
// Mock Implementation for Development
// ============================================================================

/**
 * Create a mock Gmail fetcher for development/testing
 */
export function makeMockGmailFetcher(options?: {
  unreadCount?: number;
  importantCount?: number;
  emailVolume?: 'low' | 'normal' | 'high';
}): () => Promise<GmailData> {
  return async (): Promise<GmailData> => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

    const mockMessages: GmailMessage[] = [
      {
        id: 'msg-001',
        threadId: 'thread-001',
        subject: 'Project Update - Q4 Planning',
        from: 'Sarah Chen <sarah@company.com>',
        snippet: 'Hi! Just wanted to follow up on our discussion about the Q4 roadmap...',
        date: now,
        isUnread: true,
        labels: ['INBOX', 'UNREAD', 'IMPORTANT'],
      },
      {
        id: 'msg-002',
        threadId: 'thread-002',
        subject: 'Re: Weekend plans?',
        from: 'Mom',
        snippet: 'Looking forward to seeing you and the kids this Sunday!',
        date: yesterday,
        isUnread: true,
        labels: ['INBOX', 'UNREAD', 'CATEGORY_PERSONAL'],
      },
      {
        id: 'msg-003',
        threadId: 'thread-003',
        subject: 'GitHub: [brain-garden] PR #47 merged',
        from: 'GitHub <noreply@github.com>',
        snippet: 'Your pull request has been merged successfully...',
        date: yesterday,
        isUnread: false,
        labels: ['INBOX', 'CATEGORY_UPDATES'],
      },
      {
        id: 'msg-004',
        threadId: 'thread-004',
        subject: 'Invoice #12345 - Due in 7 days',
        from: 'billing@service.com',
        snippet: 'Your monthly invoice is now available...',
        date: twoDaysAgo,
        isUnread: true,
        labels: ['INBOX', 'UNREAD'],
      },
      {
        id: 'msg-005',
        threadId: 'thread-005',
        subject: 'Team standup notes',
        from: 'Alex <alex@company.com>',
        snippet: 'Notes from today\'s standup: 1. API refactor on track...',
        date: twoDaysAgo,
        isUnread: false,
        labels: ['INBOX'],
      },
    ];

    const unreadCount = options?.unreadCount ?? 12;
    const importantCount = options?.importantCount ?? 3;

    return {
      recentMessages: mockMessages,
      unreadCount,
      importantCount,
      patterns: {
        unreadCount,
        importantUnread: 1,
        topSenders: ['Sarah Chen', 'Mom', 'Alex', 'GitHub', 'billing@service.com'],
        emailVolume: options?.emailVolume ?? 'normal',
        responseNeeded: 3,
      },
      fetchedAt: new Date(),
    };
  };
}
