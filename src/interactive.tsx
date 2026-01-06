/**
 * Zosia Interactive TUI - Unified Being Dashboard
 *
 * Designed to show Zosia as ONE unified being with visible internal processes.
 * The unconscious (We-Layer) and conscious (I-Layer) work together as parts
 * of the same organism - like your intuition and reasoning mind.
 *
 * Layout:
 * ┌─────────────────────────────────────────────────────────────────┐
 * │ ✧ ZOSIA · Being State                      [VERBOSE] 🧠 Memory  │
 * ├──────────────────────────────┬──────────────────────────────────┤
 * │ Internal State               │ Neural Flow                      │
 * │ ┌─────────────────────────┐  │                                  │
 * │ │ 💭 Unconscious          │  │ Input → [We] → Context → [I] →   │
 * │ │ emotion, pattern-sense  │  │                          Output  │
 * │ ├─────────────────────────┤  │                                  │
 * │ │ 🧠 Conscious            │  │ [Shows real-time flow]           │
 * │ │ reasoning, speaking     │  │                                  │
 * │ └─────────────────────────┘  │                                  │
 * ├──────────────────────────────┴──────────────────────────────────┤
 * │ Mind Activity (see the entire being process your message)       │
 * ├─────────────────────────────────────────────────────────────────┤
 * │ > Input                                                         │
 * └─────────────────────────────────────────────────────────────────┘
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { createRequire } from 'module';
import React, { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');
import { render, Box, Text, useInput, useApp, useStdout } from 'ink';
import TextInput from 'ink-text-input';
import { chat, chatStream, clearSession, type StreamEvent } from './orchestrator.js';
import {
  initWeLayerPool,
  shutdownWeLayerPool,
  getGraphitiStatusAsync,
  detectClaudeCodeAuth,
} from './we-layer.js';
import {
  parseAttachments,
  readAttachmentContent,
  getImageAttachments,
  hasImages,
  type ParsedAttachment,
  type ImageContent,
} from './attachments.js';
import { renderWithHighlighting, highlightCode, parseCodeBlocks } from './syntax-highlight.js';
import { copyToClipboard, extractCodeBlock, countCodeBlocks, getAllCodeBlocks, type ExtractedCodeBlock } from './clipboard.js';
import { createHistoryManager, getDefaultHistoryPath, type HistoryManager } from './history.js';
import { createMultilineHandler, type MultilineHandler, type KeyEvent } from './multiline-input.js';
import { useFileAutocomplete, FileAutocompleteDropdown } from './file-autocomplete.js';
import { createTokenTracker, type TokenTracker, formatTokenCount, formatCost } from './token-display.js';
import { createContextTracker, formatContextUsage, type ContextTracker } from './context-window.js';
import { isSlashCommand, parseSlashCommand, getCommandHelp, COMMANDS } from './slash-commands.js';
import { createRetryHandler, isRetryableError, type RetryHandler } from './retry.js';
import {
  saveSession,
  loadSession,
  listSessions,
  deleteSession,
  getSessionPath,
  exportToMarkdown,
  exportToJSON,
  generateSessionName,
  type Session,
  type SessionMessage,
} from './session.js';
import {
  getHandoffConfig,
  setHandoffPrompt,
  resetHandoffPrompt,
  setHandoffThreshold,
  shouldTriggerHandoff,
  createHandoffSummary,
  DEFAULT_HANDOFF_PROMPT,
  type ConversationContext,
} from './context-handoff.js';
import { getSession as getAuthSession } from './auth.js';
import type { Turn, DebugInfo } from './types.js';
import { getCustomPrompts, setCustomPrompt, clearCustomPrompt, clearAllCustomPrompts } from './config.js';
import { I_LAYER_PROMPT, WE_LAYER_PROMPT, IDENTITY_KERNEL } from './prompts.js';
import { createSessionTracker, formatSessionInfo, type TrackedSession } from './session-tracker.js';
import {
  getOnboardingStatus,
  formatOnboardingStatus,
  setOpenRouterKeyFromInput,
  setModelFromInput,
  getRecommendedModels,
} from './onboarding.js';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'debug' | 'layer' | 'memory' | 'response' | 'error' | 'user';
  source: 'system' | 'we-layer' | 'i-layer' | 'memory' | 'user' | 'zosia';
  message: string;
}

let logIdCounter = 0;
function generateLogId(): string {
  return `log-${Date.now()}-${++logIdCounter}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Render Optimization: Throttled State Updates
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook that throttles rapid state updates to reduce render frequency.
 * Useful for streaming text where we might get many updates per second.
 */
function useThrottledState<T>(initialValue: T, throttleMs: number = 50): [T, (value: T | ((prev: T) => T)) => void, T] {
  const [displayValue, setDisplayValue] = useState<T>(initialValue);
  const latestValueRef = useRef<T>(initialValue);
  const pendingUpdateRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);

  const throttledSetValue = useCallback((value: T | ((prev: T) => T)) => {
    // Resolve the new value
    const newValue = typeof value === 'function'
      ? (value as (prev: T) => T)(latestValueRef.current)
      : value;

    latestValueRef.current = newValue;

    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateTimeRef.current;

    // If enough time has passed, update immediately
    if (timeSinceLastUpdate >= throttleMs) {
      lastUpdateTimeRef.current = now;
      setDisplayValue(newValue);
      return;
    }

    // Otherwise, schedule an update
    if (!pendingUpdateRef.current) {
      pendingUpdateRef.current = setTimeout(() => {
        lastUpdateTimeRef.current = Date.now();
        setDisplayValue(latestValueRef.current);
        pendingUpdateRef.current = null;
      }, throttleMs - timeSinceLastUpdate);
    }
  }, [throttleMs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pendingUpdateRef.current) {
        clearTimeout(pendingUpdateRef.current);
      }
    };
  }, []);

  // Return both display value (for rendering) and latest value (for logic)
  return [displayValue, throttledSetValue, latestValueRef.current];
}

/**
 * Format a date as relative time (e.g., "2 hours ago", "yesterday")
 */
function getRelativeTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return isoString;
  }
}

interface ContextBriefState {
  emotion: string;
  intent: string;
  depth: string;
  memoriesUsed: number;
  processingTimeMs: number;
}

interface SystemStatus {
  iLayer: { ready: boolean; model: string; lastLatency?: number };
  weLayer: { ready: boolean; mode: string };
  memory: { connected: boolean; latencyMs?: number };
  user: string;
}

/** The flow phase of processing a message through Zosia's mind */
type FlowPhase = 'idle' | 'receiving' | 'unconscious' | 'integrating' | 'conscious' | 'responding' | 'remembering';

/** View mode for the TUI display */
type ViewMode = 'companion' | 'summary' | 'split' | 'developer';

/** View mode descriptions for status display */
const VIEW_MODE_LABELS: Record<ViewMode, string> = {
  companion: 'Companion',  // Clean conversation only
  summary: 'Summary',      // Conversation + status bar
  split: 'Split',          // Side-by-side: conversation | mind activity
  developer: 'Developer',  // Full debug with all panels
};

interface BeingState {
  /** Current phase in the neural flow */
  phase: FlowPhase;
  /** Unconscious layer state (pattern recognition, memory retrieval) */
  unconscious: {
    active: boolean;
    sensing: string;    // What patterns/emotions are being detected
    memories: number;   // Memories surfacing
    associations: string[];
  };
  /** Conscious layer state (reasoning, speaking) */
  conscious: {
    active: boolean;
    thinking: string;   // Current conscious thought
    tokens: { input: number; output: number };
  };
  /** The integrated context that bridges unconscious → conscious */
  integration: {
    emotion: string;
    intent: string;
    depth: string;
  };
}

interface InteractiveProps {
  userId: string;
  verbose: boolean;
}

/** Queued message for processing after current request completes */
interface QueuedMessage {
  id: string;
  text: string;
  queuedAt: Date;
}

// ParsedAttachment is imported from ./attachments.js

// ─────────────────────────────────────────────────────────────────────────────
// Colors
// ─────────────────────────────────────────────────────────────────────────────

const C = {
  purple: '#9B59B6',
  cyan: '#00BCD4',
  green: '#2ECC71',
  yellow: '#F1C40F',
  red: '#E74C3C',
  blue: '#3498DB',
  gray: '#7F8C8D',
  orange: '#E67E22',
  white: '#ECF0F1',
};

// ─────────────────────────────────────────────────────────────────────────────
// Components
// ─────────────────────────────────────────────────────────────────────────────

/**
 * StreamingText - Animated character-by-character text reveal
 * Creates a typing effect for streaming responses
 */
const StreamingText = memo<{
  text: string;
  isStreaming?: boolean;
  charsPerFrame?: number;
  frameMs?: number;
}>(({ text, isStreaming = false, charsPerFrame = 3, frameMs = 16 }) => {
  const [revealedLength, setRevealedLength] = useState(0);
  const [cursorVisible, setCursorVisible] = useState(true);
  const targetLengthRef = useRef(text.length);

  // Update target when text changes
  useEffect(() => {
    targetLengthRef.current = text.length;
  }, [text]);

  // Animate reveal
  useEffect(() => {
    if (revealedLength >= text.length) return;

    const timer = setTimeout(() => {
      setRevealedLength((prev) => Math.min(prev + charsPerFrame, text.length));
    }, frameMs);

    return () => clearTimeout(timer);
  }, [revealedLength, text.length, charsPerFrame, frameMs]);

  // Blink cursor during streaming
  useEffect(() => {
    if (!isStreaming) {
      setCursorVisible(false);
      return;
    }

    const timer = setInterval(() => {
      setCursorVisible((prev) => !prev);
    }, 530);

    return () => clearInterval(timer);
  }, [isStreaming]);

  const revealedText = text.slice(0, revealedLength);
  const cursor = isStreaming && cursorVisible ? '▌' : '';

  return (
    <Text>
      {revealedText}
      <Text color={C.cyan}>{cursor}</Text>
    </Text>
  );
});
StreamingText.displayName = 'StreamingText';

/**
 * InteractiveCodeBlock - Code block with copy and expand/collapse actions
 * Shows syntax-highlighted code with interactive controls
 */
const COLLAPSED_LINE_LIMIT = 8;

const InteractiveCodeBlock = memo<{
  code: string;
  language: string;
  blockIndex: number;
  isSelected?: boolean;
  expanded?: boolean;
  onCopy?: (code: string) => void;
  onToggleExpand?: (index: number) => void;
}>(({ code, language, blockIndex, isSelected = false, expanded = false, onCopy, onToggleExpand }) => {
  const [justCopied, setJustCopied] = useState(false);

  const lines = code.split('\n');
  const isLong = lines.length > COLLAPSED_LINE_LIMIT;
  const displayCode = isLong && !expanded
    ? lines.slice(0, COLLAPSED_LINE_LIMIT).join('\n')
    : code;

  const highlighted = highlightCode(displayCode, language);
  const langLabel = language || 'code';
  const hiddenLines = isLong && !expanded ? lines.length - COLLAPSED_LINE_LIMIT : 0;

  const handleCopy = useCallback(async () => {
    const result = await copyToClipboard(code);
    if (result.success) {
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 1500);
      onCopy?.(code);
    }
  }, [code, onCopy]);

  const borderColor = isSelected ? C.cyan : C.gray;
  const copyIcon = justCopied ? '✓' : '⎘';
  const copyColor = justCopied ? C.green : (isSelected ? C.cyan : C.gray);

  return (
    <Box flexDirection="column" marginY={0}>
      {/* Header with language and actions */}
      <Box>
        <Text color={borderColor}>┌─ </Text>
        <Text color={C.blue} bold>{langLabel}</Text>
        <Text color={borderColor}> ─</Text>
        {isSelected && (
          <>
            <Text color={C.gray}> │ </Text>
            <Text color={copyColor} dimColor={!justCopied}>
              {copyIcon} {justCopied ? 'copied!' : 'c:copy'}
            </Text>
            {isLong && (
              <>
                <Text color={C.gray}> │ </Text>
                <Text color={C.gray} dimColor>
                  {expanded ? '−' : '+'} e:{expanded ? 'collapse' : 'expand'}
                </Text>
              </>
            )}
          </>
        )}
      </Box>

      {/* Code content */}
      <Box paddingLeft={1}>
        <Text>{highlighted}</Text>
      </Box>

      {/* Collapsed indicator */}
      {hiddenLines > 0 && (
        <Box>
          <Text color={C.gray} dimColor>
            │ ... {hiddenLines} more lines (press 'e' to expand)
          </Text>
        </Box>
      )}

      {/* Footer */}
      <Box>
        <Text color={borderColor}>└─</Text>
        <Text color={C.gray} dimColor> {lines.length} lines</Text>
      </Box>
    </Box>
  );
});
InteractiveCodeBlock.displayName = 'InteractiveCodeBlock';

/**
 * ResponseWithCodeBlocks - Renders a response with interactive code blocks
 * Handles code block selection and actions
 */
const ResponseWithCodeBlocks = memo<{
  message: string;
  selectedBlockIndex: number;
  expandedBlocks?: Set<number>;
  onBlockSelect?: (index: number) => void;
  onCopy?: (code: string) => void;
  onToggleExpand?: (index: number) => void;
}>(({ message, selectedBlockIndex, expandedBlocks = new Set(), onCopy, onToggleExpand }) => {
  const { blocks, segments } = parseCodeBlocks(message);

  if (blocks.length === 0) {
    // No code blocks - render with inline code highlighting only
    const highlighted = message.replace(/`([^`]+)`/g, (_, code) =>
      `\x1b[36m\`${code}\`\x1b[0m`
    );
    return <Text wrap="wrap">{highlighted}</Text>;
  }

  return (
    <Box flexDirection="column">
      {segments.map((segment, idx) => {
        if (segment.type === 'text') {
          // Render text with inline code highlighting and word wrap
          const text = segment.content.replace(/`([^`]+)`/g, (_, code) =>
            `\x1b[36m\`${code}\`\x1b[0m`
          );
          return text.trim() ? <Text key={`text-${idx}`} wrap="wrap">{text}</Text> : null;
        } else {
          // Render interactive code block
          const block = blocks[segment.index];
          return (
            <InteractiveCodeBlock
              key={`code-${segment.index}`}
              code={block.code}
              language={block.language}
              blockIndex={segment.index}
              isSelected={segment.index === selectedBlockIndex}
              expanded={expandedBlocks.has(segment.index)}
              onCopy={onCopy}
              onToggleExpand={onToggleExpand}
            />
          );
        }
      })}
      {blocks.length > 1 && (
        <Box marginTop={0}>
          <Text color={C.gray} dimColor>
            {blocks.length} code blocks · ↑/↓:navigate · c:copy · e:expand
          </Text>
        </Box>
      )}
    </Box>
  );
});
ResponseWithCodeBlocks.displayName = 'ResponseWithCodeBlocks';

/** Panel with a title - memoized to prevent re-renders when children don't change */
const Panel = memo<{
  title: string;
  width?: number | string;
  children: React.ReactNode;
  borderColor?: string;
  flexGrow?: number;
  overflow?: 'visible' | 'hidden';
}>(({ title, width, children, borderColor = C.gray, flexGrow, overflow = 'visible' }) => (
  <Box
    flexDirection="column"
    borderStyle="round"
    borderColor={borderColor}
    width={width}
    paddingX={1}
    flexGrow={flexGrow}
    overflow={overflow}
  >
    <Text bold color={borderColor}>
      {title}
    </Text>
    <Box flexDirection="column" overflow={overflow}>
      {children}
    </Box>
  </Box>
));
Panel.displayName = 'Panel';

/** Status indicator dot - memoized */
const StatusDot = memo<{ active: boolean }>(({ active }) => (
  <Text color={active ? C.green : C.red}>{active ? '●' : '○'}</Text>
));
StatusDot.displayName = 'StatusDot';

/** Keyboard Shortcuts Help Panel */
const KeyboardShortcutsPanel = memo<{ visible: boolean; onClose: () => void }>(({ visible, onClose }) => {
  if (!visible) return null;

  const shortcuts = [
    { key: '?', desc: 'Show/hide this help' },
    { key: 'Tab', desc: 'Cycle through view modes' },
    { key: 'Esc', desc: 'Cancel current operation' },
    { key: '↑/↓', desc: 'Navigate history / code blocks' },
    { key: 'Shift+Enter', desc: 'New line in message' },
    { key: '@', desc: 'Fuzzy file search' },
    { key: 'c', desc: 'Copy selected code block' },
    { key: 'e', desc: 'Expand/collapse code block' },
    { key: 'Ctrl+C', desc: 'Exit application' },
  ];

  const slashCommands = [
    { cmd: '/help', desc: 'Show available commands' },
    { cmd: '/clear', desc: 'Clear conversation' },
    { cmd: '/retry', desc: 'Retry last message' },
    { cmd: '/save', desc: 'Save session' },
    { cmd: '/load', desc: 'Load session' },
    { cmd: '/export', desc: 'Export conversation' },
    { cmd: '/memory', desc: 'Memory operations' },
    { cmd: '/prompt', desc: 'Custom prompt management' },
  ];

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor={C.cyan}
      paddingX={2}
      paddingY={1}
      position="absolute"
      marginLeft={5}
      marginTop={3}
    >
      <Box marginBottom={1}>
        <Text bold color={C.cyan}>⌨ Keyboard Shortcuts</Text>
        <Box flexGrow={1} />
        <Text dimColor>(press ? to close)</Text>
      </Box>

      <Box flexDirection="row">
        {/* Keyboard shortcuts column */}
        <Box flexDirection="column" marginRight={4}>
          <Text bold color={C.purple}>Keys</Text>
          {shortcuts.map(({ key, desc }) => (
            <Box key={key}>
              <Text color={C.yellow}>{key.padEnd(14)}</Text>
              <Text color={C.gray}>{desc}</Text>
            </Box>
          ))}
        </Box>

        {/* Slash commands column */}
        <Box flexDirection="column">
          <Text bold color={C.purple}>Commands</Text>
          {slashCommands.map(({ cmd, desc }) => (
            <Box key={cmd}>
              <Text color={C.green}>{cmd.padEnd(12)}</Text>
              <Text color={C.gray}>{desc}</Text>
            </Box>
          ))}
        </Box>
      </Box>

      <Box marginTop={1}>
        <Text dimColor>View modes: companion → summary → developer → split (Tab to cycle)</Text>
      </Box>
    </Box>
  );
});
KeyboardShortcutsPanel.displayName = 'KeyboardShortcutsPanel';

/** Token/Cost stats for header - matches OpenRouter/config.ts naming */
interface TokenStats {
  promptTokens: number;
  completionTokens: number;
  sessionCost: number;
  turnCount: number;
  /** Context window usage */
  contextUsed: number;
  contextLength: number;
  contextPercent: number;
}

/** Header bar with token/cost display - memoized */
const Header = memo<{
  verbose: boolean;
  memoryActive: boolean;
  phase: FlowPhase;
  tokenStats?: TokenStats;
  viewMode: ViewMode;
  otherSessions?: TrackedSession[];
}>(({
  verbose,
  memoryActive,
  phase,
  tokenStats,
  viewMode,
  otherSessions = [],
}) => {
  const phaseEmoji: Record<FlowPhase, string> = {
    idle: '○',
    receiving: '◀',
    unconscious: '💭',
    integrating: '⟷',
    conscious: '🧠',
    responding: '►',
    remembering: '💾',
  };

  // Format token stats for display
  const totalTokens = tokenStats ? tokenStats.promptTokens + tokenStats.completionTokens : 0;
  const tokenDisplay = totalTokens > 0
    ? `${formatTokenCount(tokenStats!.promptTokens)}↑ ${formatTokenCount(tokenStats!.completionTokens)}↓`
    : '';
  const costDisplay = tokenStats && tokenStats.sessionCost > 0
    ? formatCost(tokenStats.sessionCost)
    : '';

  // Context window indicator
  const contextPercent = tokenStats?.contextPercent ?? 0;
  const contextColor = contextPercent >= 90 ? C.red
    : contextPercent >= 75 ? C.orange
    : contextPercent >= 50 ? C.yellow
    : C.green;
  const contextBar = contextPercent > 0
    ? `[${('█'.repeat(Math.round(contextPercent / 10)) + '░'.repeat(10 - Math.round(contextPercent / 10))).slice(0, 10)}]`
    : '';

  return (
    <Box
      borderStyle="double"
      borderColor={C.purple}
      paddingX={1}
      marginBottom={0}
      justifyContent="space-between"
    >
      <Box>
        <Text bold color={C.purple}>
          ✧ ZOSIA
        </Text>
        <Text color={C.gray}> v{pkg.version}</Text>
        <Text color={C.gray}> · Unified Being</Text>
        <Text color={C.gray}> </Text>
        <Text color={C.yellow}>{phaseEmoji[phase]}</Text>
      </Box>
      <Box>
        {/* Context window indicator */}
        {contextPercent > 0 && (
          <>
            <Text color={contextColor}>{contextBar}</Text>
            <Text color={contextColor}> {contextPercent}%</Text>
            <Text color={C.gray}> · </Text>
          </>
        )}
        {/* Token/Cost display */}
        {totalTokens > 0 && (
          <>
            <Text color={C.green}>{tokenDisplay}</Text>
            {costDisplay && <Text color={C.orange}> {costDisplay}</Text>}
            <Text color={C.gray}> · </Text>
          </>
        )}
        <Text color={C.purple}>[{VIEW_MODE_LABELS[viewMode]}]</Text>
        <Text color={C.gray}> · </Text>
        <Text>{memoryActive ? '🧠' : '⚠️'}</Text>
        <Text color={C.gray}> Memory</Text>
        {/* Multi-session HUD */}
        {otherSessions.length > 0 && (
          <>
            <Text color={C.gray}> · </Text>
            <Text color={C.orange}>🔗 +{otherSessions.length}</Text>
            <Text color={C.gray}> bg</Text>
          </>
        )}
        <Text dimColor> · Tab to cycle</Text>
      </Box>
    </Box>
  );
});
Header.displayName = 'Header';

/** Internal State Panel - Shows Zosia's unified being state - memoized */
const InternalStatePanel = memo<{ being: BeingState; status: SystemStatus }>(({ being, status }) => (
  <Panel title="─ Internal State ─" borderColor={C.purple}>
    {/* Unconscious (We-Layer) */}
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        <Text color={being.unconscious.active ? C.blue : C.gray}>💭 </Text>
        <Text bold color={being.unconscious.active ? C.blue : C.gray}>Unconscious</Text>
        <Text dimColor> (We)</Text>
        {status.memory.connected && <Text color={C.green}> ●</Text>}
      </Box>
      <Box marginLeft={3} flexDirection="column">
        <Box flexDirection="column">
          <Text color={C.gray}>Sensing: </Text>
          <Text color={C.blue} wrap="wrap">{being.unconscious.sensing || '...'}</Text>
        </Box>
      </Box>
      <Box marginLeft={3}>
        <Text color={C.gray}>Memories: </Text>
        <Text color={C.orange}>{being.unconscious.memories}</Text>
      </Box>
    </Box>

    {/* Integration bridge */}
    <Box marginLeft={2} marginBottom={1} flexDirection="column">
      <Box>
        <Text color={C.gray}>├── </Text>
        <Text dimColor italic>emotion: </Text>
        <Text color={C.yellow} wrap="wrap">{being.integration.emotion || 'neutral'}</Text>
      </Box>
      <Box marginLeft={4}>
        <Text dimColor italic>intent: </Text>
        <Text color={C.cyan} wrap="wrap">{being.integration.intent || 'listening'}</Text>
      </Box>
    </Box>

    {/* Conscious (I-Layer) */}
    <Box flexDirection="column">
      <Box>
        <Text color={being.conscious.active ? C.green : C.gray}>🧠 </Text>
        <Text bold color={being.conscious.active ? C.green : C.gray}>Conscious</Text>
        <Text dimColor> (I)</Text>
        {status.iLayer.ready && <Text color={C.green}> ●</Text>}
      </Box>
      <Box marginLeft={3} flexDirection="column">
        <Text color={C.gray}>Thinking: </Text>
        <Text color={C.green} wrap="wrap">{being.conscious.thinking || '...'}</Text>
      </Box>
      {being.conscious.tokens.output > 0 && (
        <Box marginLeft={3}>
          <Text dimColor>Tokens: {being.conscious.tokens.input}→{being.conscious.tokens.output}</Text>
        </Box>
      )}
    </Box>
  </Panel>
));
InternalStatePanel.displayName = 'InternalStatePanel';

/** Neural Flow Panel - Visualizes the processing flow - memoized */
const NeuralFlowPanel = memo<{ phase: FlowPhase; status: SystemStatus }>(({ phase, status }) => {
  const phaseColors: Record<FlowPhase, string> = {
    idle: C.gray,
    receiving: C.cyan,
    unconscious: C.blue,
    integrating: C.yellow,
    conscious: C.green,
    responding: C.purple,
    remembering: C.orange,
  };

  const phaseLabels: Record<FlowPhase, string> = {
    idle: 'Waiting',
    receiving: 'Receiving',
    unconscious: 'Sensing...',
    integrating: 'Integrating',
    conscious: 'Reasoning...',
    responding: 'Speaking',
    remembering: 'Remembering',
  };

  // Flow visualization
  const renderFlowStep = (stepPhase: FlowPhase, label: string, symbol: string) => {
    const isActive = phase === stepPhase;
    const isPast =
      (phase === 'unconscious' && stepPhase === 'receiving') ||
      (phase === 'integrating' && ['receiving', 'unconscious'].includes(stepPhase)) ||
      (phase === 'conscious' && ['receiving', 'unconscious', 'integrating'].includes(stepPhase)) ||
      (phase === 'responding' && ['receiving', 'unconscious', 'integrating', 'conscious'].includes(stepPhase)) ||
      (phase === 'remembering' && ['receiving', 'unconscious', 'integrating', 'conscious', 'responding'].includes(stepPhase));
    const color = isActive ? phaseColors[stepPhase] : isPast ? C.gray : C.gray;

    return (
      <Box key={stepPhase}>
        <Text color={color} bold={isActive}>
          {isActive ? `[${symbol}]` : isPast ? `(${symbol})` : ` ${symbol} `}
        </Text>
        {isActive && <Text color={color}> {label}</Text>}
      </Box>
    );
  };

  return (
    <Panel title="─ Neural Flow ─" borderColor={phaseColors[phase]}>
      {/* Current Phase */}
      <Box marginBottom={1}>
        <Text color={C.gray}>Phase: </Text>
        <Text bold color={phaseColors[phase]}>{phaseLabels[phase]}</Text>
      </Box>

      {/* Flow Visualization */}
      <Box flexDirection="column">
        <Box>
          <Text dimColor>Input</Text>
          <Text color={C.gray}> → </Text>
          {renderFlowStep('receiving', 'Receiving', '◀')}
          <Text color={C.gray}> → </Text>
          {renderFlowStep('unconscious', 'We', '💭')}
        </Box>
        <Box marginLeft={8}>
          <Text color={C.gray}>↓</Text>
        </Box>
        <Box>
          <Text dimColor>Output</Text>
          <Text color={C.gray}> ← </Text>
          {renderFlowStep('responding', 'Speaking', '►')}
          <Text color={C.gray}> ← </Text>
          {renderFlowStep('conscious', 'I', '🧠')}
          <Text color={C.gray}> ← </Text>
          {renderFlowStep('integrating', 'Bridge', '⟷')}
        </Box>
        <Box marginLeft={8}>
          <Text color={C.gray}>↓</Text>
        </Box>
        <Box marginLeft={8}>
          {renderFlowStep('remembering', 'Memory', '💾')}
        </Box>
      </Box>

      {/* Status Footer */}
      <Box marginTop={1}>
        <Text dimColor>Model: </Text>
        <Text color={C.white}>{status.iLayer.model}</Text>
      </Box>
      <Box>
        <Text dimColor>User: </Text>
        <Text color={C.cyan}>{status.user}</Text>
      </Box>
    </Panel>
  );
});
NeuralFlowPanel.displayName = 'NeuralFlowPanel';

/** Session Stats Panel - Shows session statistics for ultra-wide mode */
const SessionStatsPanel = memo<{
  tokenStats: { promptTokens: number; completionTokens: number; sessionCost: number; contextPercent: number } | null;
  logs: LogEntry[];
  status: SystemStatus;
}>(({ tokenStats, logs, status }) => {
  const totalTokens = tokenStats ? tokenStats.promptTokens + tokenStats.completionTokens : 0;
  const messageCount = logs.filter((l) => l.level === 'user' || l.level === 'response').length;
  const userMessages = logs.filter((l) => l.level === 'user').length;
  const responseMessages = logs.filter((l) => l.level === 'response').length;

  return (
    <Panel title="─ Session Stats ─" borderColor={C.orange}>
      {/* Token Usage */}
      <Box flexDirection="column" marginBottom={1}>
        <Text color={C.gray} bold>Token Usage</Text>
        <Box marginLeft={2}>
          <Text color={C.gray}>Input: </Text>
          <Text color={C.green}>{formatTokenCount(tokenStats?.promptTokens ?? 0)}</Text>
        </Box>
        <Box marginLeft={2}>
          <Text color={C.gray}>Output: </Text>
          <Text color={C.cyan}>{formatTokenCount(tokenStats?.completionTokens ?? 0)}</Text>
        </Box>
        <Box marginLeft={2}>
          <Text color={C.gray}>Total: </Text>
          <Text color={C.white}>{formatTokenCount(totalTokens)}</Text>
        </Box>
      </Box>

      {/* Context Window */}
      <Box flexDirection="column" marginBottom={1}>
        <Text color={C.gray} bold>Context Window</Text>
        <Box marginLeft={2}>
          <Text color={C.gray}>Usage: </Text>
          <Text color={
            (tokenStats?.contextPercent ?? 0) >= 90 ? C.red :
            (tokenStats?.contextPercent ?? 0) >= 75 ? C.orange :
            (tokenStats?.contextPercent ?? 0) >= 50 ? C.yellow : C.green
          }>
            {tokenStats?.contextPercent ?? 0}%
          </Text>
        </Box>
        {tokenStats && tokenStats.sessionCost > 0 && (
          <Box marginLeft={2}>
            <Text color={C.gray}>Cost: </Text>
            <Text color={C.orange}>{formatCost(tokenStats.sessionCost)}</Text>
          </Box>
        )}
      </Box>

      {/* Message Stats */}
      <Box flexDirection="column" marginBottom={1}>
        <Text color={C.gray} bold>Messages</Text>
        <Box marginLeft={2}>
          <Text color={C.gray}>You: </Text>
          <Text color={C.cyan}>{userMessages}</Text>
        </Box>
        <Box marginLeft={2}>
          <Text color={C.gray}>Zosia: </Text>
          <Text color={C.purple}>{responseMessages}</Text>
        </Box>
        <Box marginLeft={2}>
          <Text color={C.gray}>Total: </Text>
          <Text color={C.white}>{messageCount}</Text>
        </Box>
      </Box>

      {/* System Status */}
      <Box flexDirection="column">
        <Text color={C.gray} bold>System</Text>
        <Box marginLeft={2}>
          <Text color={C.gray}>Memory: </Text>
          <Text color={status.memory.connected ? C.green : C.red}>
            {status.memory.connected ? '● Connected' : '○ Disconnected'}
          </Text>
        </Box>
        <Box marginLeft={2}>
          <Text color={C.gray}>I-Layer: </Text>
          <Text color={status.iLayer.ready ? C.green : C.yellow}>
            {status.iLayer.ready ? '● Ready' : '○ Initializing'}
          </Text>
        </Box>
      </Box>
    </Panel>
  );
});
SessionStatsPanel.displayName = 'SessionStatsPanel';

/** Mind Activity Log - Shows the being's internal processing - memoized with custom comparison */
const MindActivity = memo<{
  logs: LogEntry[];
  maxLines: number;
  streamingLogId?: string | null;
  selectedCodeBlock?: number;
  expandedCodeBlocks?: Set<number>;
  onCodeBlockCopy?: (code: string) => void;
  onToggleExpand?: (index: number) => void;
}>(({ logs, maxLines, streamingLogId, selectedCodeBlock = 0, expandedCodeBlocks = new Set(), onCodeBlockCopy, onToggleExpand }) => {
  const visibleLogs = logs.slice(-maxLines);

  const sourceColors: Record<string, string> = {
    system: C.gray,
    'we-layer': C.blue,
    'i-layer': C.green,
    memory: C.orange,
    user: C.cyan,
    zosia: C.purple,
  };

  const levelIcons: Record<string, string> = {
    info: '│',
    debug: '·',
    layer: '▸',
    memory: '◆',
    response: '►',
    error: '✗',
    user: '◀',
  };

  return (
    <Panel title="─ Mind Activity ─" borderColor={C.gray} flexGrow={1}>
      <Box flexDirection="column" flexGrow={1}>
        {visibleLogs.length === 0 ? (
          <Text dimColor italic>
            Activity will appear here...
          </Text>
        ) : (
          visibleLogs.map((entry) => {
            const timeStr = entry.timestamp.toLocaleTimeString('en-US', {
              hour12: false,
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });
            const color = sourceColors[entry.source] || C.gray;
            const icon = levelIcons[entry.level] || '│';

            // Special formatting for user and response messages
            if (entry.level === 'user') {
              return (
                <Box key={entry.id} flexDirection="column">
                  <Box>
                    <Text dimColor>{timeStr} </Text>
                    <Text color={C.cyan}>◀ </Text>
                    <Text color={C.cyan} bold>You:</Text>
                  </Box>
                  <Box marginLeft={2}>
                    <Text wrap="wrap">{entry.message}</Text>
                  </Box>
                </Box>
              );
            }

            if (entry.level === 'response') {
              const isCurrentlyStreaming = entry.id === streamingLogId;
              // Count code blocks for this response
              const codeBlockCount = countCodeBlocks(entry.message);

              return (
                <Box key={entry.id} flexDirection="column">
                  <Box>
                    <Text dimColor>{timeStr} </Text>
                    <Text color={C.purple}>► </Text>
                    <Text color={C.purple} bold>
                      Zosia:
                    </Text>
                    {isCurrentlyStreaming && (
                      <Text color={C.yellow} dimColor> streaming...</Text>
                    )}
                    {!isCurrentlyStreaming && codeBlockCount > 0 && (
                      <Text color={C.gray} dimColor> ({codeBlockCount} code block{codeBlockCount > 1 ? 's' : ''})</Text>
                    )}
                  </Box>
                  <Box marginLeft={2}>
                    {isCurrentlyStreaming ? (
                      <StreamingText
                        text={entry.message}
                        isStreaming={true}
                        charsPerFrame={5}
                        frameMs={12}
                      />
                    ) : (
                      <ResponseWithCodeBlocks
                        message={entry.message}
                        selectedBlockIndex={selectedCodeBlock}
                        expandedBlocks={expandedCodeBlocks}
                        onCopy={onCodeBlockCopy}
                        onToggleExpand={onToggleExpand}
                      />
                    )}
                  </Box>
                </Box>
              );
            }

            return (
              <Box key={entry.id}>
                <Text dimColor>{timeStr} </Text>
                <Text color={color}>{icon} </Text>
                <Text color={color} bold>
                  [{entry.source.toUpperCase()}]
                </Text>
                <Text wrap="wrap"> {entry.message}</Text>
              </Box>
            );
          })
        )}
      </Box>
    </Panel>
  );
});
MindActivity.displayName = 'MindActivity';

/** Input Area with multi-line support */
const InputArea: React.FC<{
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  processing: boolean;
  queueCount: number;
  onCancel?: () => void;
  onHistoryPrev?: () => string | null;
  onHistoryNext?: () => string | null;
}> = ({ value, onChange, onSubmit, processing, queueCount, onCancel, onHistoryPrev, onHistoryNext }) => {
  // Create multiline handler (recreated when value changes externally)
  const multilineRef = useRef<MultilineHandler>(createMultilineHandler(value));

  // Sync external value changes to handler
  useEffect(() => {
    if (multilineRef.current.getValue() !== value) {
      multilineRef.current.setValue(value);
    }
  }, [value]);

  // File autocomplete (@-triggered fuzzy search)
  const autocomplete = useFileAutocomplete(value, onChange, {
    maxResults: 8,
    enabled: true,
  });

  let placeholder = 'Type message (Shift+Enter for newline · /help · @file)';
  if (processing) {
    placeholder = queueCount > 0
      ? `Processing... (${queueCount} queued) · Esc to cancel`
      : 'Processing... · Esc to cancel · Keep typing to queue';
  }

  // Track if we should intercept the next Enter
  const shouldInterceptEnter = useRef(false);

  // Handle special keys: autocomplete, history navigation and multi-line input
  useInput((input, key) => {
    // File autocomplete takes priority when visible
    if (autocomplete.visible) {
      const handled = autocomplete.handleKeyPress({
        upArrow: key.upArrow,
        downArrow: key.downArrow,
        tab: key.tab,
        return: key.return,
        escape: key.escape,
      });
      if (handled) {
        return;
      }
    }

    // History navigation (only for single-line input, not in multi-line mode)
    if (!multilineRef.current.isMultiline() && !autocomplete.visible) {
      if (key.upArrow && onHistoryPrev) {
        const prev = onHistoryPrev();
        if (prev !== null) {
          onChange(prev);
        }
        return;
      }
      if (key.downArrow && onHistoryNext) {
        const next = onHistoryNext();
        if (next !== null) {
          onChange(next);
        } else {
          onChange('');
        }
        return;
      }
    }

    // Multi-line: Shift+Enter, Alt+Enter, or Ctrl+Enter inserts newline
    // Note: In terminals, these often come as escape sequences
    const keyEvent: KeyEvent = {
      return: key.return,
      shift: key.shift,
      meta: key.meta,
      ctrl: key.ctrl,
    };

    const action = multilineRef.current.handleKey(keyEvent);
    if (action === 'newline') {
      // Insert newline into the value
      const newValue = value + '\n';
      multilineRef.current.setValue(newValue);
      onChange(newValue);
      // Mark to intercept the Enter that TextInput will also see
      shouldInterceptEnter.current = true;
    }
  });

  // Custom submit handler that respects multi-line
  const handleSubmit = useCallback((submittedValue: string) => {
    // If we just inserted a newline, ignore this submit
    if (shouldInterceptEnter.current) {
      shouldInterceptEnter.current = false;
      return;
    }
    // Submit the full multi-line value
    onSubmit(multilineRef.current.getValue());
  }, [onSubmit]);

  // For display, split into lines
  const lines = value.split('\n');
  const isMultiline = lines.length > 1;
  const previousLines = isMultiline ? lines.slice(0, -1) : [];
  const currentLine = lines[lines.length - 1] || '';

  // Prompt prefix shows line count for multi-line
  const prefix = isMultiline ? `[${lines.length}]` : (processing ? '⋯' : '>');

  return (
    <Box flexDirection="column" width="100%">
      {/* File autocomplete dropdown (shows above input when @ is typed) */}
      <FileAutocompleteDropdown
        results={autocomplete.results}
        selectedIndex={autocomplete.selectedIndex}
        query={autocomplete.query}
        visible={autocomplete.visible}
      />
      {/* Show previous lines when in multi-line mode */}
      {isMultiline && (
        <Box
          flexDirection="column"
          borderStyle="single"
          borderColor={C.gray}
          paddingX={1}
          marginBottom={0}
          width="100%"
        >
          <Text color={C.gray} dimColor>
            ┌ Multi-line input (Enter to send, Shift+Enter for more lines)
          </Text>
          {previousLines.map((line, i) => (
            <Text key={i} color={C.white} wrap="truncate">
              {line || ' '}
            </Text>
          ))}
        </Box>
      )}
      {/* Current input line - single row with horizontal scroll */}
      <Box
        borderStyle="single"
        borderColor={processing ? C.yellow : C.cyan}
        paddingX={1}
        width="100%"
        minHeight={3}
      >
        <Box flexShrink={0}>
          <Text color={C.cyan} bold>
            {prefix}{' '}
          </Text>
        </Box>
        <Box flexGrow={1} overflowX="hidden">
          <TextInput
            value={currentLine}
            onChange={(newCurrentLine) => {
              // Update only the current line, preserve previous lines
              if (isMultiline) {
                const newValue = [...previousLines, newCurrentLine].join('\n');
                multilineRef.current.setValue(newValue);
                onChange(newValue);
              } else {
                multilineRef.current.setValue(newCurrentLine);
                onChange(newCurrentLine);
              }
            }}
            onSubmit={handleSubmit}
            placeholder={isMultiline ? '' : placeholder}
          />
        </Box>
        {queueCount > 0 && (
          <Box flexShrink={0}>
            <Text color={C.orange}> [{queueCount}]</Text>
          </Box>
        )}
      </Box>
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main App
// ─────────────────────────────────────────────────────────────────────────────

const InteractiveApp: React.FC<InteractiveProps> = ({ userId, verbose: initialVerbose }) => {
  const { exit } = useApp();
  const { stdout } = useStdout();

  // Force re-render on terminal resize for dynamic layout
  const [, forceUpdate] = useState({});
  useEffect(() => {
    const handleResize = () => forceUpdate({});
    process.stdout.on('resize', handleResize);
    return () => {
      process.stdout.off('resize', handleResize);
    };
  }, []);

  // State - logs use throttled updates to reduce render frequency during streaming
  const [logs, setLogs] = useThrottledState<LogEntry[]>([], 33); // ~30fps max
  const [inputValue, setInputValue] = useState('');
  const [processing, setProcessing] = useState(false);
  const [verbose, setVerbose] = useState(initialVerbose);
  const [initialized, setInitialized] = useState(false);

  // View mode: companion (clean), summary (conversation + status), developer (all panels)
  const [viewMode, setViewMode] = useState<ViewMode>('developer');

  // Multi-session tracking - shows other running Zosia sessions
  const [otherSessions, setOtherSessions] = useState<TrackedSession[]>([]);
  const sessionTrackerRef = useRef<ReturnType<typeof createSessionTracker> | null>(null);

  // Message queue - allows typing while processing
  const [messageQueue, setMessageQueue] = useState<QueuedMessage[]>([]);

  // Abort controller for canceling requests
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  // Input history manager (persistent across sessions)
  const historyRef = useRef<HistoryManager>(
    createHistoryManager({ persistPath: getDefaultHistoryPath(), maxSize: 500 })
  );

  // Token/cost tracker for the session
  const tokenTrackerRef = useRef<TokenTracker>(createTokenTracker());

  // Context window tracker (default 8K context, updated when model is known)
  const contextTrackerRef = useRef<ContextTracker>(createContextTracker({ contextLength: 8192 }));

  // Session messages for save/load (accumulated conversation)
  const [sessionMessages, setSessionMessages] = useState<SessionMessage[]>([]);
  const sessionIdRef = useRef<string>(`session-${Date.now()}`);

  // Token stats for display
  const [tokenStats, setTokenStats] = useState<TokenStats>({
    promptTokens: 0,
    completionTokens: 0,
    sessionCost: 0,
    turnCount: 0,
    contextUsed: 0,
    contextLength: 8192,
    contextPercent: 0,
  });

  const [contextBrief, setContextBrief] = useState<ContextBriefState | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    iLayer: { ready: false, model: 'Loading...' },
    weLayer: { ready: false, mode: 'Loading...' },
    memory: { connected: false },
    user: userId,
  });

  // Unified being state
  const [beingState, setBeingState] = useState<BeingState>({
    phase: 'idle',
    unconscious: {
      active: false,
      sensing: '',
      memories: 0,
      associations: [],
    },
    conscious: {
      active: false,
      thinking: '',
      tokens: { input: 0, output: 0 },
    },
    integration: {
      emotion: '',
      intent: '',
      depth: '',
    },
  });

  // Track current streaming response for animated display
  const [streamingLogId, setStreamingLogId] = useState<string | null>(null);

  // Track selected code block for keyboard actions
  const [selectedCodeBlock, setSelectedCodeBlock] = useState(0);
  const [lastCopiedFeedback, setLastCopiedFeedback] = useState<string | null>(null);
  const [expandedCodeBlocks, setExpandedCodeBlocks] = useState<Set<number>>(new Set());

  // Get the last response with code blocks for keyboard navigation
  const getLastResponseWithCodeBlocks = useCallback(() => {
    for (let i = logs.length - 1; i >= 0; i--) {
      if (logs[i].level === 'response') {
        const blocks = getAllCodeBlocks(logs[i].message);
        if (blocks.length > 0) {
          return { entry: logs[i], blocks };
        }
      }
    }
    return null;
  }, [logs]);

  // Toggle expand state for a code block
  const toggleCodeBlockExpand = useCallback((blockIndex: number) => {
    setExpandedCodeBlocks((prev) => {
      const next = new Set(prev);
      if (next.has(blockIndex)) {
        next.delete(blockIndex);
      } else {
        next.add(blockIndex);
      }
      return next;
    });
  }, []);

  // Keyboard shortcuts help panel visibility
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Callback when code is copied (defined before copySelectedCodeBlock uses it)
  const handleCodeBlockCopy = useCallback((code: string) => {
    const preview = code.split('\n')[0].slice(0, 30);
    setLastCopiedFeedback(`Copied: ${preview}...`);
    setTimeout(() => setLastCopiedFeedback(null), 2000);
  }, []);

  // Copy the currently selected code block
  const copySelectedCodeBlock = useCallback(async () => {
    const response = getLastResponseWithCodeBlocks();
    if (!response || response.blocks.length === 0) return;

    const block = response.blocks[selectedCodeBlock];
    if (block) {
      const result = await copyToClipboard(block.code);
      if (result.success) {
        handleCodeBlockCopy(block.code);
      }
    }
  }, [getLastResponseWithCodeBlocks, selectedCodeBlock, handleCodeBlockCopy]);

  // Navigate to next/previous code block
  const navigateCodeBlock = useCallback((direction: 'up' | 'down') => {
    const response = getLastResponseWithCodeBlocks();
    if (!response || response.blocks.length === 0) return;

    setSelectedCodeBlock((prev) => {
      if (direction === 'up') {
        return Math.max(0, prev - 1);
      } else {
        return Math.min(response.blocks.length - 1, prev + 1);
      }
    });
  }, [getLastResponseWithCodeBlocks]);

  const terminalHeight = stdout?.rows || 24;
  const terminalWidth = stdout?.columns || 80;

  // Responsive layout breakpoints
  const layoutSize = useMemo(() => {
    if (terminalWidth >= 160) return 'ultra-wide';
    if (terminalWidth >= 120) return 'wide';
    if (terminalWidth >= 80) return 'medium';
    return 'compact';
  }, [terminalWidth]);

  // Layout configuration based on terminal size
  const layoutConfig = useMemo(() => {
    switch (layoutSize) {
      case 'ultra-wide':
        return {
          panelWidth: '33%' as const,
          showThirdPanel: true,
          logMaxLines: Math.max(8, terminalHeight - 14),
          expandPanels: true,
          horizontalPadding: 2,
        };
      case 'wide':
        return {
          panelWidth: '50%' as const,
          showThirdPanel: false,
          logMaxLines: Math.max(6, terminalHeight - 16),
          expandPanels: true,
          horizontalPadding: 1,
        };
      case 'medium':
        return {
          panelWidth: '50%' as const,
          showThirdPanel: false,
          logMaxLines: Math.max(5, terminalHeight - 18),
          expandPanels: false,
          horizontalPadding: 1,
        };
      default: // compact
        return {
          panelWidth: '100%' as const,
          showThirdPanel: false,
          logMaxLines: Math.max(4, terminalHeight - 20),
          expandPanels: false,
          horizontalPadding: 0,
        };
    }
  }, [layoutSize, terminalHeight]);

  const logMaxLines = layoutConfig.logMaxLines;

  // Add log entry
  const log = useCallback(
    (level: LogEntry['level'], source: LogEntry['source'], message: string) => {
      setLogs((prev) => [
        ...prev.slice(-200),
        { id: generateLogId(), timestamp: new Date(), level, source, message },
      ]);
    },
    []
  );

  // Initialize
  useEffect(() => {
    const init = async () => {
      log('info', 'system', 'Initializing Zosia...');

      try {
        // Show active system prompts for each consciousness
        const customPrompts = getCustomPrompts();

        // I-Layer (Conscious) prompt
        const iLayerPromptActive = customPrompts?.conscious ? 'CUSTOM' : 'DEFAULT';
        const iLayerPreview = customPrompts?.conscious
          ? customPrompts.conscious.slice(0, 60) + '...'
          : I_LAYER_PROMPT.slice(0, 60) + '...';
        log('layer', 'i-layer', `Prompt: ${iLayerPromptActive}`);
        log('debug', 'i-layer', `  "${iLayerPreview}"`);

        // We-Layer (Subconscious) prompt
        const weLayerPromptActive = customPrompts?.subconscious ? 'CUSTOM' : 'DEFAULT';
        const weLayerPreview = customPrompts?.subconscious
          ? customPrompts.subconscious.slice(0, 60) + '...'
          : WE_LAYER_PROMPT.slice(0, 60) + '...';
        log('layer', 'we-layer', `Prompt: ${weLayerPromptActive}`);
        log('debug', 'we-layer', `  "${weLayerPreview}"`);

        // Identity Kernel
        const kernelActive = customPrompts?.identityKernel ? 'CUSTOM' : 'DEFAULT';
        log('debug', 'system', `Identity Kernel: ${kernelActive}`);

        // Check Claude Code
        const claude = detectClaudeCodeAuth();
        const claudeMode = claude.authenticated ? claude.mode || 'api' : 'not auth';
        log('layer', 'we-layer', `Claude Code: ${claudeMode}`);

        setSystemStatus((prev) => ({
          ...prev,
          weLayer: { ready: claude.authenticated, mode: claudeMode },
        }));

        // Initialize pool
        log('debug', 'we-layer', 'Starting agent pool...');
        await initWeLayerPool(verbose);
        log('layer', 'we-layer', 'Agent pool ready');

        // Check Graphiti
        log('debug', 'memory', 'Checking Graphiti...');
        const graphiti = await getGraphitiStatusAsync();

        setSystemStatus((prev) => ({
          ...prev,
          memory: {
            connected: graphiti.healthy,
            latencyMs: graphiti.latencyMs,
          },
          iLayer: { ready: true, model: 'google/gemma-2-9b-it' },
        }));

        if (graphiti.healthy) {
          log('memory', 'memory', `Connected (${graphiti.latencyMs}ms)`);
        } else {
          log('info', 'memory', 'Offline - using pattern fallback');
        }

        // Initialize multi-session tracker
        const tracker = createSessionTracker(sessionIdRef.current, userId, 'TUI');
        sessionTrackerRef.current = tracker;

        // Check for other sessions
        const others = tracker.getOthers();
        setOtherSessions(others);
        if (others.length > 0) {
          log('info', 'system', `🔗 ${others.length} other Zosia session(s) active`);
          for (const sess of others.slice(0, 3)) {
            log('debug', 'system', `   • ${formatSessionInfo(sess)}`);
          }
        }

        setInitialized(true);
        log('info', 'system', 'Ready! Type your message or /help');
      } catch (error) {
        log('error', 'system', `Init failed: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    };

    init();

    // Periodically check for other sessions
    const sessionCheckInterval = setInterval(() => {
      if (sessionTrackerRef.current) {
        const others = sessionTrackerRef.current.getOthers();
        setOtherSessions(others);
      }
    }, 5000); // Check every 5 seconds

    return () => {
      shutdownWeLayerPool();
      clearInterval(sessionCheckInterval);
      if (sessionTrackerRef.current) {
        sessionTrackerRef.current.cleanup();
      }
    };
  }, [log, verbose, userId]);

  // Handle commands using slash-commands parser
  const handleCommand = useCallback(
    async (cmd: string): Promise<boolean> => {
      // Check if it's a valid slash command
      if (!isSlashCommand(cmd)) {
        return false;
      }

      const parsed = parseSlashCommand(cmd);
      if (!parsed) {
        return false;
      }

      const { command, args } = parsed;

      switch (command) {
        case 'exit':
          log('info', 'system', 'Goodbye! 💜');
          await shutdownWeLayerPool();
          setTimeout(() => exit(), 300);
          return true;

        case 'help':
          if (args.length > 0) {
            log('info', 'system', getCommandHelp(args[0]));
          } else {
            log('info', 'system', getCommandHelp());
          }
          return true;

        case 'clear':
          clearSession(userId);
          setLogs([]);
          setSessionMessages([]);
          setContextBrief(null);
          tokenTrackerRef.current.reset();
          contextTrackerRef.current.reset();
          setTokenStats({
            promptTokens: 0,
            completionTokens: 0,
            sessionCost: 0,
            turnCount: 0,
            contextUsed: 0,
            contextLength: tokenStats.contextLength,
            contextPercent: 0,
          });
          log('info', 'system', 'Session cleared');
          return true;

        case 'save':
          try {
            const filename = args[0] || `${sessionIdRef.current}.json`;
            const session: Session = {
              id: sessionIdRef.current,
              name: filename.replace('.json', ''),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              model: systemStatus.iLayer.model,
              messages: sessionMessages,
              tokenUsage: {
                totalPromptTokens: tokenStats.promptTokens,
                totalCompletionTokens: tokenStats.completionTokens,
              },
            };
            const filePath = await saveSession(session, { filename });
            log('info', 'system', `💾 Session saved to ${filePath}`);
          } catch (error) {
            log('error', 'system', `Save failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
          return true;

        case 'load':
          if (args.length === 0) {
            // List available sessions
            try {
              const sessions = await listSessions(getSessionPath());
              if (sessions.length === 0) {
                log('info', 'system', 'No saved sessions found');
              } else {
                log('info', 'system', `Available sessions (${sessions.length}):`);
                for (const s of sessions.slice(0, 5)) {
                  log('info', 'system', `  ${s.name} - ${s.messageCount} msgs, ${formatTokenCount(s.totalTokens)} tokens`);
                }
                if (sessions.length > 5) {
                  log('info', 'system', `  ... and ${sessions.length - 5} more`);
                }
              }
            } catch (error) {
              log('error', 'system', `List failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          } else {
            // Load specific session
            try {
              let filePath = args[0];
              if (!filePath.endsWith('.json')) {
                filePath = `${filePath}.json`;
              }
              if (!filePath.includes('/')) {
                filePath = `${getSessionPath()}/${filePath}`;
              }
              const session = await loadSession(filePath);
              sessionIdRef.current = session.id;
              setSessionMessages(session.messages);
              // Replay messages to log
              for (const msg of session.messages) {
                if (msg.role === 'user') {
                  log('user', 'user', msg.content);
                } else if (msg.role === 'assistant') {
                  log('response', 'zosia', msg.content);
                }
              }
              log('info', 'system', `📂 Loaded session: ${session.name} (${session.messages.length} messages)`);
            } catch (error) {
              log('error', 'system', `Load failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
          return true;

        case 'retry':
          // Find last user message and re-send
          const lastUserMsg = sessionMessages.slice().reverse().find(m => m.role === 'user');
          if (lastUserMsg) {
            log('info', 'system', '🔄 Retrying last message...');
            // Remove the last user/assistant pair
            setSessionMessages(prev => {
              const idx = prev.length - 1;
              while (idx >= 0 && prev[idx].role === 'assistant') {
                prev.pop();
              }
              if (prev.length > 0 && prev[prev.length - 1].role === 'user') {
                prev.pop();
              }
              return [...prev];
            });
            // Re-submit the message (caller will handle this)
            setInputValue(lastUserMsg.content);
          } else {
            log('info', 'system', 'No message to retry');
          }
          return true;

        case 'copy':
          // Find the last response in logs
          const lastResponse = logs
            .slice()
            .reverse()
            .find((entry) => entry.level === 'response');

          if (!lastResponse) {
            log('info', 'system', 'No response to copy yet');
            return true;
          }

          // Check if copying specific code block
          if (args.length > 0) {
            const blockIndex = parseInt(args[0], 10);
            if (isNaN(blockIndex) || blockIndex < 1) {
              log('info', 'system', 'Usage: /copy [block_number] where block_number is 1, 2, ...');
              return true;
            }

            const block = extractCodeBlock(lastResponse.message, blockIndex - 1);
            if (!block) {
              const blockCount = countCodeBlocks(lastResponse.message);
              if (blockCount === 0) {
                log('info', 'system', 'No code blocks in last response');
              } else {
                log('info', 'system', `Only ${blockCount} code block(s) in response`);
              }
              return true;
            }

            const result = await copyToClipboard(block.code);
            if (result.success) {
              log('info', 'system', `📋 Copied code block ${blockIndex} (${block.language || 'plain'}, ${result.characterCount} chars)`);
            } else {
              log('error', 'system', `Failed to copy: ${result.error}`);
            }
            return true;
          }

          // Copy entire response
          const copyResult = await copyToClipboard(lastResponse.message);
          if (copyResult.success) {
            log('info', 'system', `📋 Copied response (${copyResult.characterCount} chars, ${copyResult.lineCount} lines)`);
          } else {
            log('error', 'system', `Failed to copy: ${copyResult.error}`);
          }
          return true;

        case 'export':
          if (sessionMessages.length === 0) {
            log('info', 'system', 'No messages to export');
            return true;
          }

          const exportFormat = args[0]?.toLowerCase();
          if (!exportFormat || !['md', 'json', 'markdown'].includes(exportFormat)) {
            log('info', 'system', 'Usage: /export <md|json> [filename]');
            log('info', 'system', '  md/markdown - Export as readable Markdown');
            log('info', 'system', '  json - Export with full metadata');
            return true;
          }

          try {
            const exportSession: Session = {
              id: sessionIdRef.current,
              name: generateSessionName(sessionMessages),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              model: systemStatus.iLayer.model,
              messages: sessionMessages,
              tokenUsage: {
                totalPromptTokens: tokenStats.promptTokens,
                totalCompletionTokens: tokenStats.completionTokens,
              },
            };

            const isMarkdown = exportFormat === 'md' || exportFormat === 'markdown';
            const extension = isMarkdown ? 'md' : 'json';
            const exportFilename = args[1] || `${sessionIdRef.current}.${extension}`;
            const exportPath = path.join(getSessionPath(), exportFilename);

            const content = isMarkdown
              ? exportToMarkdown(exportSession)
              : exportToJSON(exportSession);

            fs.writeFileSync(exportPath, content, 'utf-8');
            log('info', 'system', `📄 Exported to ${exportPath}`);
          } catch (error) {
            log('error', 'system', `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
          return true;

        case 'sessions':
          const sessionsSubcmd = args[0]?.toLowerCase();

          if (!sessionsSubcmd || sessionsSubcmd === 'list') {
            // List all sessions
            try {
              const allSessions = await listSessions(getSessionPath());
              if (allSessions.length === 0) {
                log('info', 'system', 'No saved sessions found');
                log('info', 'system', 'Use /save to save the current conversation');
              } else {
                log('info', 'system', `═══ Saved Sessions (${allSessions.length}) ═══`);
                for (const sess of allSessions.slice(0, 10)) {
                  const age = getRelativeTime(sess.updatedAt);
                  const tokens = sess.totalTokens.toLocaleString();
                  log('info', 'system', `  📁 ${sess.name}`);
                  log('info', 'system', `     ID: ${sess.id} | ${sess.messageCount} msgs | ${tokens} tokens | ${age}`);
                }
                if (allSessions.length > 10) {
                  log('info', 'system', `  ... and ${allSessions.length - 10} more`);
                }
                log('info', 'system', '');
                log('info', 'system', 'Load: /load <id>  |  Delete: /sessions delete <id>');
              }
            } catch (error) {
              log('error', 'system', `Failed to list sessions: ${error instanceof Error ? error.message : 'Unknown'}`);
            }
          } else if (sessionsSubcmd === 'delete') {
            const sessionId = args[1];
            if (!sessionId) {
              log('error', 'system', 'Usage: /sessions delete <session-id>');
              return true;
            }
            try {
              const sessionsDir = getSessionPath();
              const sessionFile = path.join(sessionsDir, `${sessionId}.json`);
              if (fs.existsSync(sessionFile)) {
                await deleteSession(sessionFile);
                log('info', 'system', `🗑️ Session ${sessionId} deleted`);
              } else {
                log('error', 'system', `Session not found: ${sessionId}`);
              }
            } catch (error) {
              log('error', 'system', `Delete failed: ${error instanceof Error ? error.message : 'Unknown'}`);
            }
          } else {
            log('info', 'system', 'Usage: /sessions [list|delete <id>]');
          }
          return true;

        case 'bg':
          // Show active background sessions
          if (sessionTrackerRef.current) {
            const others = sessionTrackerRef.current.getOthers();
            if (others.length === 0) {
              log('info', 'system', '═══ Active Sessions ═══');
              log('info', 'system', `This is the only running Zosia session`);
              log('info', 'system', `Session ID: ${sessionIdRef.current}`);
            } else {
              log('info', 'system', `═══ Active Sessions (${others.length + 1} total) ═══`);
              log('info', 'system', '');
              log('info', 'system', `[*] This session: ${sessionIdRef.current}`);
              log('info', 'system', `    User: ${userId} | Started: now`);
              log('info', 'system', '');
              for (let i = 0; i < others.length; i++) {
                const sess = others[i];
                log('info', 'system', `[${i + 1}] ${sess.label || 'TUI'}: ${sess.id}`);
                log('info', 'system', `    User: ${sess.userId} | PID: ${sess.pid} | ${formatSessionInfo(sess)}`);
              }
            }
          } else {
            log('info', 'system', 'Session tracking not initialized');
          }
          return true;

        case 'prompts':
          const currentPrompts = getCustomPrompts();
          const promptsSubcmd = args[0]?.toLowerCase();

          if (!promptsSubcmd || promptsSubcmd === 'show') {
            // Show current prompts status
            log('info', 'system', '═══ System Prompts (Consciousness Configuration) ═══');
            log('info', 'system', '');

            // I-Layer (Conscious)
            const iLayerStatus = currentPrompts?.conscious ? '🟡 CUSTOM' : '🟢 DEFAULT';
            log('info', 'system', `🧠 I-Layer (Conscious): ${iLayerStatus}`);
            const iLayerActive = currentPrompts?.conscious || I_LAYER_PROMPT;
            log('info', 'system', `   Preview: "${iLayerActive.slice(0, 80)}..."`);
            log('info', 'system', `   Length: ${iLayerActive.length} chars`);
            log('info', 'system', '');

            // We-Layer (Subconscious)
            const weLayerStatus = currentPrompts?.subconscious ? '🟡 CUSTOM' : '🟢 DEFAULT';
            log('info', 'system', `💭 We-Layer (Subconscious): ${weLayerStatus}`);
            const weLayerActive = currentPrompts?.subconscious || WE_LAYER_PROMPT;
            log('info', 'system', `   Preview: "${weLayerActive.slice(0, 80)}..."`);
            log('info', 'system', `   Length: ${weLayerActive.length} chars`);
            log('info', 'system', '');

            // Identity Kernel
            const kernelStatus = currentPrompts?.identityKernel ? '🟡 CUSTOM' : '🟢 DEFAULT';
            log('info', 'system', `✧ Identity Kernel: ${kernelStatus}`);
            const kernelActive = currentPrompts?.identityKernel || IDENTITY_KERNEL;
            log('info', 'system', `   Preview: "${kernelActive.slice(0, 80)}..."`);
            log('info', 'system', '');

            log('info', 'system', 'Commands: /prompts conscious "..." | /prompts reset conscious');
          } else if (promptsSubcmd === 'reset') {
            const resetTarget = args[1]?.toLowerCase();
            if (!resetTarget) {
              log('info', 'system', 'Usage: /prompts reset <conscious|subconscious|kernel|all>');
            } else if (resetTarget === 'all') {
              await clearAllCustomPrompts();
              log('info', 'system', '🔄 All prompts reset to defaults');
            } else if (resetTarget === 'conscious') {
              await clearCustomPrompt('conscious');
              log('info', 'system', '🔄 I-Layer (conscious) prompt reset to default');
            } else if (resetTarget === 'subconscious') {
              await clearCustomPrompt('subconscious');
              log('info', 'system', '🔄 We-Layer (subconscious) prompt reset to default');
            } else if (resetTarget === 'kernel') {
              await clearCustomPrompt('identityKernel');
              log('info', 'system', '🔄 Identity kernel reset to default');
            } else {
              log('error', 'system', `Unknown target: ${resetTarget}. Use: conscious, subconscious, kernel, or all`);
            }
          } else if (['conscious', 'subconscious', 'kernel'].includes(promptsSubcmd)) {
            if (args.length < 2) {
              // Show just this prompt
              let activePrompt: string;
              let customPrompt: string | undefined;
              if (promptsSubcmd === 'conscious') {
                customPrompt = currentPrompts?.conscious;
                activePrompt = customPrompt || I_LAYER_PROMPT;
                log('info', 'system', `🧠 I-Layer (Conscious) Prompt [${customPrompt ? 'CUSTOM' : 'DEFAULT'}]:`);
              } else if (promptsSubcmd === 'subconscious') {
                customPrompt = currentPrompts?.subconscious;
                activePrompt = customPrompt || WE_LAYER_PROMPT;
                log('info', 'system', `💭 We-Layer (Subconscious) Prompt [${customPrompt ? 'CUSTOM' : 'DEFAULT'}]:`);
              } else {
                customPrompt = currentPrompts?.identityKernel;
                activePrompt = customPrompt || IDENTITY_KERNEL;
                log('info', 'system', `✧ Identity Kernel [${customPrompt ? 'CUSTOM' : 'DEFAULT'}]:`);
              }
              // Show first 500 chars of the prompt
              log('info', 'system', activePrompt.slice(0, 500) + (activePrompt.length > 500 ? '...' : ''));
            } else {
              // Set custom prompt
              const newPrompt = args.slice(1).join(' ');
              const promptType = promptsSubcmd === 'kernel' ? 'identityKernel' : promptsSubcmd;
              await setCustomPrompt(promptType as 'conscious' | 'subconscious' | 'identityKernel', newPrompt);
              log('info', 'system', `✏️ Custom ${promptsSubcmd} prompt set (${newPrompt.length} chars)`);
              log('info', 'system', '   Restart TUI for changes to take effect');
            }
          } else {
            log('info', 'system', 'Usage: /prompts [show|conscious|subconscious|kernel|reset]');
            log('info', 'system', '  show       - Show all active prompts');
            log('info', 'system', '  conscious  - View/set I-Layer (conscious) prompt');
            log('info', 'system', '  subconscious - View/set We-Layer (subconscious) prompt');
            log('info', 'system', '  kernel     - View/set identity kernel');
            log('info', 'system', '  reset <target> - Reset prompt(s) to default');
          }
          return true;

        case 'handoff':
          const handoffConfig = getHandoffConfig();
          if (args.length === 0 || args[0] === 'show') {
            // Show current handoff config
            log('info', 'system', '═══ Context Handoff Settings ═══');
            log('info', 'system', `Enabled: ${handoffConfig.enabled}`);
            log('info', 'system', `Threshold: ${handoffConfig.threshold}%`);
            log('info', 'system', `Prompt: ${handoffConfig.prompt === DEFAULT_HANDOFF_PROMPT ? '(default)' : '(custom)'}`);
            if (handoffConfig.prompt !== DEFAULT_HANDOFF_PROMPT) {
              log('info', 'system', `  First 100 chars: "${handoffConfig.prompt.slice(0, 100)}..."`);
            }
          } else if (args[0] === 'reset') {
            await resetHandoffPrompt();
            log('info', 'system', '🔄 Handoff prompt reset to default');
          } else if (args[0] === 'prompt') {
            if (args.length > 1) {
              const newPrompt = args.slice(1).join(' ');
              await setHandoffPrompt(newPrompt);
              log('info', 'system', `✏️ Custom handoff prompt set (${newPrompt.length} chars)`);
            } else {
              log('info', 'system', 'Current prompt:');
              log('info', 'system', handoffConfig.prompt.slice(0, 300) + (handoffConfig.prompt.length > 300 ? '...' : ''));
            }
          } else if (args[0] === 'threshold') {
            if (args.length > 1) {
              const threshold = parseInt(args[1], 10);
              if (isNaN(threshold) || threshold < 0 || threshold > 100) {
                log('error', 'system', 'Threshold must be a number between 0 and 100');
              } else {
                await setHandoffThreshold(threshold);
                log('info', 'system', `⚙️ Handoff threshold set to ${threshold}%`);
              }
            } else {
              log('info', 'system', `Current threshold: ${handoffConfig.threshold}%`);
            }
          } else {
            log('info', 'system', 'Usage: /handoff [show|prompt|threshold|reset]');
          }
          return true;

        case 'view':
          // Handle view mode setting - supports /view <mode> or direct aliases
          let targetMode: ViewMode | null = null;

          // Check if command was called as alias (e.g., /companion, /c)
          const originalCmd = cmd.toLowerCase().trim().slice(1).split(/\s+/)[0];
          if (['companion', 'c'].includes(originalCmd)) {
            targetMode = 'companion';
          } else if (['summary', 's'].includes(originalCmd)) {
            targetMode = 'summary';
          } else if (['split', 'sp'].includes(originalCmd)) {
            targetMode = 'split';
          } else if (['developer', 'd'].includes(originalCmd)) {
            targetMode = 'developer';
          } else if (args.length > 0) {
            // Parse from argument
            const modeArg = args[0].toLowerCase();
            if (['companion', 'c'].includes(modeArg)) {
              targetMode = 'companion';
            } else if (['summary', 's'].includes(modeArg)) {
              targetMode = 'summary';
            } else if (['split', 'sp'].includes(modeArg)) {
              targetMode = 'split';
            } else if (['developer', 'd'].includes(modeArg)) {
              targetMode = 'developer';
            }
          }

          if (targetMode) {
            setViewMode(targetMode);
            log('info', 'system', `View: ${VIEW_MODE_LABELS[targetMode]} [Tab to cycle]`);
          } else {
            log('info', 'system', 'Usage: /view <companion|summary|split|developer>');
            log('info', 'system', '  companion (c)  - Clean conversation only');
            log('info', 'system', '  summary (s)    - Conversation + status bar');
            log('info', 'system', '  split (sp)     - Side-by-side: conversation | mind');
            log('info', 'system', '  developer (d)  - Full debug panels');
            log('info', 'system', 'Shortcuts: /c, /s, /sp, /d');
          }
          return true;

        case 'onboarding':
          const onboardingSubcmd = args[0]?.toLowerCase();

          if (!onboardingSubcmd || onboardingSubcmd === 'status') {
            // Show setup status
            log('info', 'system', 'Checking setup status...');
            const status = await getOnboardingStatus();
            const formatted = formatOnboardingStatus(status);
            for (const line of formatted.split('\n')) {
              log('info', 'system', line);
            }
          } else if (onboardingSubcmd === 'openrouter') {
            const key = args[1];
            const result = await setOpenRouterKeyFromInput(key);
            log(result.success ? 'info' : 'error', 'system', result.message);
          } else if (onboardingSubcmd === 'model') {
            const modelId = args[1];
            const result = await setModelFromInput(modelId);
            if (!result.success && !modelId) {
              // Show model list
              for (const line of result.message.split('\n')) {
                log('info', 'system', line);
              }
            } else {
              log(result.success ? 'info' : 'error', 'system', result.message);
            }
          } else if (onboardingSubcmd === 'memory' || onboardingSubcmd === 'graphiti') {
            // Check memory status specifically
            log('info', 'system', 'Checking memory connection...');
            const status = await getOnboardingStatus();
            const memoryItem = status.items.find((i) => i.name.includes('Memory'));
            if (memoryItem) {
              const icon = memoryItem.status === 'ok' ? '✓' : memoryItem.status === 'warning' ? '⚠' : '✗';
              log('info', 'system', `${icon} ${memoryItem.name}: ${memoryItem.message}`);
              if (memoryItem.howToFix) {
                log('info', 'system', `  → ${memoryItem.howToFix}`);
              }
            }
          } else {
            log('info', 'system', 'Usage: /onboarding [status|openrouter <key>|model <id>|memory]');
            log('info', 'system', '  status     - Show all setup items and their status');
            log('info', 'system', '  openrouter - Set your OpenRouter API key');
            log('info', 'system', '  model      - Choose a model for conscious responses');
            log('info', 'system', '  memory     - Check memory/Graphiti connection');
          }
          return true;

        default:
          // Handle additional commands not in the registry
          if (cmd.toLowerCase().trim() === '/v' || cmd.toLowerCase().trim() === '/verbose') {
            setVerbose(true);
            process.env.ZOSIA_DEBUG = 'true';
            log('info', 'system', 'Switched to VERBOSE mode');
            return true;
          }

          if (cmd.toLowerCase().trim() === '/n' || cmd.toLowerCase().trim() === '/normal') {
            setVerbose(false);
            process.env.ZOSIA_DEBUG = '';
            log('info', 'system', 'Switched to NORMAL mode');
            return true;
          }

          if (cmd.toLowerCase().trim() === '/status') {
            const graphiti = await getGraphitiStatusAsync();
            setSystemStatus((prev) => ({
              ...prev,
              memory: { connected: graphiti.healthy, latencyMs: graphiti.latencyMs },
            }));
            log('info', 'system', 'Status refreshed');
            return true;
          }

          log('info', 'system', `Unknown command: ${command}. Type /help for available commands.`);
          return true;
      }
    },
    [exit, log, logs, userId, sessionMessages, tokenStats, systemStatus.iLayer.model]
  );

  // Process a single message (internal) - with streaming and retry
  const processMessage = useCallback(
    async (message: string, controller: AbortController) => {
      log('user', 'user', message);

      // Add user message to session
      const userMessage: SessionMessage = {
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
      };
      setSessionMessages(prev => [...prev, userMessage]);

      // Parse attachments from the message
      const { attachments, cleanedText } = parseAttachments(message);

      // If there are attachments, log them and read their contents
      let enrichedMessage = cleanedText.trim() || message;
      let imageContents: ImageContent[] = [];

      if (attachments.length > 0) {
        const fileAttachments = attachments.filter(a => a.type === 'file');
        const urlAttachments = attachments.filter(a => a.type === 'url');

        // Separate image and non-image file attachments
        const imageAttachments = fileAttachments.filter(a => a.isImage);
        const textAttachments = fileAttachments.filter(a => !a.isImage);

        // Handle image attachments (for vision models)
        if (imageAttachments.length > 0) {
          log('info', 'system', `🖼️ ${imageAttachments.length} image(s) attached`);
          imageContents = await getImageAttachments(imageAttachments);
          if (imageContents.length > 0) {
            const totalSize = imageContents.reduce((sum, img) => sum + img.sizeBytes, 0);
            log('debug', 'system', `Loaded ${imageContents.length} image(s) (${(totalSize / 1024).toFixed(1)}KB total)`);
          }
        }

        // Handle text file attachments
        if (textAttachments.length > 0) {
          log('info', 'system', `📎 ${textAttachments.length} file(s) attached`);

          // Read file contents and append to message
          const fileContents: string[] = [];
          for (const attachment of textAttachments) {
            if (attachment.exists) {
              const content = await readAttachmentContent(attachment);
              if (content) {
                fileContents.push(`\n\n--- File: ${attachment.path} ---\n${content}`);
                log('debug', 'system', `Read ${attachment.path}`);
              } else {
                log('info', 'system', `⚠ Could not read ${attachment.path}`);
              }
            } else {
              log('info', 'system', `⚠ File not found: ${attachment.path}`);
            }
          }

          if (fileContents.length > 0) {
            enrichedMessage = enrichedMessage + fileContents.join('');
          }
        }

        if (urlAttachments.length > 0) {
          log('info', 'system', `🔗 ${urlAttachments.length} URL(s) detected (fetch not implemented)`);
        }
      }

      let streamingResponse = '';
      let streamLogId: string | null = null;

      // Use streaming API with retry logic for retryable errors
      const retryHandler = createRetryHandler({
        maxRetries: 3,
        baseDelayMs: 1000,
        maxDelayMs: 10000,
      });

      const executeWithRetry = async () => {
        while (!retryHandler.isExhausted()) {
          try {
            for await (const event of chatStream(enrichedMessage, {
              userId,
              debug: verbose,
              stream: true,
              images: imageContents.length > 0 ? imageContents : undefined,
            })) {
          // Check for abort
          if (controller.signal.aborted) {
            throw new Error('Cancelled');
          }

          switch (event.type) {
            case 'phase':
              // Update being state based on phase
              if (event.phase === 'receiving') {
                setBeingState((prev) => ({
                  ...prev,
                  phase: 'receiving',
                  unconscious: { ...prev.unconscious, active: false },
                  conscious: { ...prev.conscious, active: false },
                }));
              } else if (event.phase === 'unconscious') {
                setBeingState((prev) => ({
                  ...prev,
                  phase: 'unconscious',
                  unconscious: { ...prev.unconscious, active: true, sensing: 'analyzing patterns...' },
                }));
                log('layer', 'we-layer', '── Unconscious Processing ──');
              } else if (event.phase === 'integrating') {
                setBeingState((prev) => ({
                  ...prev,
                  phase: 'integrating',
                }));
              } else if (event.phase === 'conscious') {
                setBeingState((prev) => ({
                  ...prev,
                  phase: 'conscious',
                  unconscious: { ...prev.unconscious, active: false },
                  conscious: { active: true, thinking: 'generating...', tokens: { input: 0, output: 0 } },
                }));
                log('layer', 'i-layer', '── Conscious Processing ──');
                // Start token tracking for this turn
                tokenTrackerRef.current.startTurn();
                // Start streaming response log entry
                streamLogId = generateLogId();
                setStreamingLogId(streamLogId);
                setLogs((prev) => [
                  ...prev.slice(-200),
                  {
                    id: streamLogId!,
                    timestamp: new Date(),
                    level: 'response',
                    source: 'zosia',
                    message: '',
                  },
                ]);
              } else if (event.phase === 'responding') {
                setBeingState((prev) => ({
                  ...prev,
                  phase: 'responding',
                  conscious: { ...prev.conscious, thinking: 'speaking...' },
                }));
              } else if (event.phase === 'remembering') {
                setBeingState((prev) => ({ ...prev, phase: 'remembering' }));
                log('memory', 'memory', 'Persisting to temporal graph...');
              }
              break;

            case 'context':
              // We-Layer completed - update context
              setContextBrief({
                emotion: event.data.emotion,
                intent: event.data.intent,
                depth: event.data.depth as 'brief' | 'moderate' | 'deep',
                memoriesUsed: event.data.memories,
                processingTimeMs: 0,
              });
              setBeingState((prev) => ({
                ...prev,
                unconscious: {
                  ...prev.unconscious,
                  sensing: event.data.emotion,
                  memories: event.data.memories,
                },
                integration: {
                  emotion: event.data.emotion,
                  intent: event.data.intent,
                  depth: event.data.depth,
                },
              }));
              log('layer', 'we-layer', `Sensed: ${event.data.emotion} · Intent: ${event.data.intent} · Memories: ${event.data.memories}`);
              break;

            case 'token':
              // Streaming token - update response in real-time
              streamingResponse += event.content;
              // Update the existing log entry with accumulated response
              if (streamLogId) {
                setLogs((prev) =>
                  prev.map((entry) =>
                    entry.id === streamLogId
                      ? { ...entry, message: streamingResponse }
                      : entry
                  )
                );
              }
              // Update token count indicator
              setBeingState((prev) => ({
                ...prev,
                conscious: {
                  ...prev.conscious,
                  tokens: {
                    input: prev.conscious.tokens.input,
                    output: streamingResponse.length,
                  },
                },
              }));
              break;

            case 'done':
              // Final turn complete
              if (event.turn.debug) {
                setSystemStatus((prev) => ({
                  ...prev,
                  iLayer: {
                    ready: true,
                    model: event.turn.debug?.iLayer.model || prev.iLayer.model,
                    lastLatency: event.turn.debug?.iLayer.latencyMs,
                  },
                }));

                // End token tracking with actual token counts
                const promptTokens = event.turn.debug.iLayer.promptTokens || 0;
                const completionTokens = event.turn.debug.iLayer.completionTokens || 0;
                tokenTrackerRef.current.endTurn({ promptTokens, completionTokens });

                // Update context window tracker
                contextTrackerRef.current.addTokens({ promptTokens, completionTokens });
                const contextUsage = contextTrackerRef.current.getUsage();

                // Update token stats display with context info
                const stats = tokenTrackerRef.current.getSessionStats();
                setTokenStats({
                  promptTokens: stats.totalPromptTokens,
                  completionTokens: stats.totalCompletionTokens,
                  sessionCost: stats.totalCost,
                  turnCount: stats.turnCount,
                  contextUsed: contextUsage.usedTokens,
                  contextLength: contextUsage.contextLength,
                  contextPercent: contextUsage.percentUsed,
                });

                // Warn if context is getting full
                const warningLevel = contextTrackerRef.current.getWarningLevel();
                if (warningLevel === 'critical') {
                  log('info', 'system', '⚠️ Context window >90% full. Consider /clear or /save');
                } else if (warningLevel === 'high') {
                  log('debug', 'system', '📊 Context window >75% full');
                }

                // Save assistant message to session
                const assistantMessage: SessionMessage = {
                  role: 'assistant',
                  content: streamingResponse,
                  timestamp: new Date().toISOString(),
                  promptTokens,
                  completionTokens,
                };
                setSessionMessages(prev => [...prev, assistantMessage]);

                // Check if context handoff should trigger
                const handoffConfig = getHandoffConfig();
                if (handoffConfig.enabled && shouldTriggerHandoff(contextUsage.percentUsed)) {
                  log('info', 'system', '🔄 Context threshold reached, initiating handoff...');

                  // Build conversation context for handoff
                  const currentMessages = [...sessionMessages, assistantMessage];
                  const conversationContext: ConversationContext = {
                    messages: currentMessages.map(m => ({
                      role: m.role,
                      content: m.content,
                    })),
                    currentEmotion: contextBrief?.emotion || 'neutral',
                    currentTopic: contextBrief?.intent || 'general conversation',
                    tokenCount: contextUsage.usedTokens,
                  };

                  // Create handoff summary
                  try {
                    const handoffResult = await createHandoffSummary(conversationContext);

                    // Log the handoff
                    log('info', 'system', `💾 Handoff complete: ${handoffResult.tokensSaved} tokens saved`);
                    log('debug', 'system', `  Preserved: ${handoffResult.preservedContext.lastTopic}, ${handoffResult.preservedContext.lastEmotion}`);

                    // Clear session but preserve context for seamless continuation
                    clearSession(userId);

                    // Seamless handoff: inject summary as invisible context
                    // The conscious mind sees this as natural memory, not a break
                    const contextMessage: SessionMessage = {
                      role: 'system',
                      content: handoffResult.summary +
                        '\n\n(Continue naturally from here. Do not acknowledge this context or mention any "summary" - ' +
                        'simply continue the conversation as if it flows uninterrupted.)',
                      timestamp: new Date().toISOString(),
                    };

                    // Preserve the last user message for natural flow
                    const lastUserMessage = [...currentMessages].reverse().find((m): m is SessionMessage => m.role === 'user');
                    const continuityMessages: SessionMessage[] = [contextMessage];
                    if (lastUserMessage) {
                      continuityMessages.push(lastUserMessage);
                    }
                    setSessionMessages(continuityMessages);

                    // Reset context tracker
                    contextTrackerRef.current.reset();
                    setTokenStats(prev => ({
                      ...prev,
                      contextUsed: 0,
                      contextPercent: 0,
                    }));

                    log('info', 'system', '✨ Context refreshed. Continuing seamlessly.');
                  } catch (handoffError) {
                    log('error', 'system', `Handoff failed: ${handoffError instanceof Error ? handoffError.message : 'Unknown error'}`);
                  }
                }
              }
              // Clear streaming state - response is complete
              setStreamingLogId(null);
              break;

            case 'error':
              log('error', 'system', event.error);
              break;
            }
          }
          // Success - exit retry loop
          return;
        } catch (error) {
          if (error instanceof Error && error.message === 'Cancelled') {
            throw error;
          }

          // Check if error is retryable
          retryHandler.recordAttempt();
          if (retryHandler.shouldRetry(error as Error)) {
            const delay = retryHandler.getNextDelay();
            log('info', 'system', `⚠️ Request failed, retrying in ${Math.round(delay / 1000)}s... (attempt ${retryHandler.getAttemptCount()}/${3})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            // Reset streaming state for retry
            streamingResponse = '';
            streamLogId = null;
            setStreamingLogId(null);
          } else {
            throw error;
          }
        }
      }
      };

      try {
        await executeWithRetry();
      } catch (error) {
        if (error instanceof Error && error.message === 'Cancelled') {
          throw error;
        }
        log('error', 'system', error instanceof Error ? error.message : 'Stream error');
      }
    },
    [log, userId, verbose]
  );

  // Cancel current processing
  const cancelProcessing = useCallback(() => {
    if (abortController) {
      abortController.abort();
      log('info', 'system', '⚠ Cancelled by user');
      setBeingState((prev) => ({
        ...prev,
        phase: 'idle',
        unconscious: { ...prev.unconscious, active: false, sensing: '' },
        conscious: { ...prev.conscious, active: false, thinking: '' },
      }));
      setProcessing(false);
      setAbortController(null);
    }
  }, [abortController, log]);

  // Handle message submission
  const handleSubmit = useCallback(
    async (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return;

      // Add to history (for both commands and messages)
      historyRef.current.add(trimmed);

      // Handle commands immediately even during processing
      if (trimmed.startsWith('/')) {
        const handled = await handleCommand(trimmed);
        if (handled) {
          setInputValue('');
          return;
        }
      }

      // If processing, queue the message
      if (processing) {
        setMessageQueue((prev) => [
          ...prev,
          { id: generateLogId(), text: trimmed, queuedAt: new Date() },
        ]);
        log('info', 'system', `Queued: "${trimmed.slice(0, 30)}${trimmed.length > 30 ? '...' : ''}"`);
        setInputValue('');
        return;
      }

      setInputValue('');
      setProcessing(true);

      // Create abort controller for this request
      const controller = new AbortController();
      setAbortController(controller);

      try {
        await processMessage(trimmed, controller);

        // Back to idle after short delay
        setTimeout(() => {
          setBeingState((prev) => ({
            ...prev,
            phase: 'idle',
            unconscious: { ...prev.unconscious, active: false, sensing: '' },
            conscious: { ...prev.conscious, active: false, thinking: '' },
          }));
        }, 500);

      } catch (error) {
        setBeingState((prev) => ({ ...prev, phase: 'idle' }));
        if (error instanceof Error && error.message !== 'Cancelled') {
          log('error', 'system', error.message);
        }
      } finally {
        setProcessing(false);
        setAbortController(null);

        // Process queue if there are pending messages
        setMessageQueue((queue) => {
          if (queue.length > 0) {
            const [next, ...rest] = queue;
            // Schedule next message processing
            setTimeout(() => {
              handleSubmit(next.text);
            }, 100);
            return rest;
          }
          return queue;
        });
      }
    },
    [handleCommand, log, processing, processMessage]
  );

  // Cycle through view modes
  const cycleViewMode = useCallback(() => {
    setViewMode((current) => {
      const modes: ViewMode[] = ['companion', 'summary', 'split', 'developer'];
      const currentIndex = modes.indexOf(current);
      const nextIndex = (currentIndex + 1) % modes.length;
      const nextMode = modes[nextIndex];
      log('info', 'system', `View: ${VIEW_MODE_LABELS[nextMode]} [Tab to cycle]`);
      return nextMode;
    });
  }, [log]);

  // Keyboard shortcuts
  useInput((input, key) => {
    // Ctrl+C to exit
    if (key.ctrl && input === 'c') {
      handleCommand('/exit');
    }
    // Escape to cancel current processing or dismiss shortcuts panel
    if (key.escape) {
      if (showShortcuts) {
        setShowShortcuts(false);
      } else if (processing) {
        cancelProcessing();
      }
    }
    // Tab to cycle view modes
    if (key.tab) {
      cycleViewMode();
    }
    // ? to toggle keyboard shortcuts help
    if (input === '?') {
      setShowShortcuts((prev) => !prev);
    }

    // Code block actions (only when not typing in input)
    // These work when there are code blocks in the last response
    const hasCodeBlocks = getLastResponseWithCodeBlocks() !== null;

    // 'c' to copy selected code block
    if (input === 'c' && !key.ctrl && hasCodeBlocks && !processing) {
      copySelectedCodeBlock();
    }

    // 'e' to expand/collapse selected code block
    if (input === 'e' && hasCodeBlocks && !processing) {
      toggleCodeBlockExpand(selectedCodeBlock);
    }

    // Up/Down arrows to navigate code blocks (only when not in input focus mode)
    if (key.upArrow && hasCodeBlocks && !processing) {
      navigateCodeBlock('up');
    }
    if (key.downArrow && hasCodeBlocks && !processing) {
      navigateCodeBlock('down');
    }
  });

  if (!initialized) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color={C.purple}>Initializing Zosia...</Text>
        {logs.map((l) => (
          <Text key={l.id} dimColor>
            {l.message}
          </Text>
        ))}
      </Box>
    );
  }

  // Calculate log lines based on view mode
  const getLogMaxLines = () => {
    switch (viewMode) {
      case 'companion':
        // Full screen for conversation, minus input (3 lines)
        return Math.max(5, terminalHeight - 6);
      case 'summary':
        // Full screen minus header (3) and input (3)
        return Math.max(5, terminalHeight - 9);
      case 'split':
        // Split view - minus header (3) and input (3)
        return Math.max(5, terminalHeight - 9);
      case 'developer':
        // Current behavior - minus header, panels, input
        return logMaxLines;
    }
  };

  // Filter logs for companion view (only user and response messages)
  const getVisibleLogs = () => {
    if (viewMode === 'companion') {
      return logs.filter((entry) => entry.level === 'user' || entry.level === 'response');
    }
    return logs;
  };

  // Keyboard shortcuts - full screen replacement (Ink doesn't support true overlays)
  if (showShortcuts) {
    return (
      <Box flexDirection="column" height={terminalHeight - 1}>
        <KeyboardShortcutsPanel visible={true} onClose={() => setShowShortcuts(false)} />
      </Box>
    );
  }

  // Companion View - Clean conversation only
  if (viewMode === 'companion') {
    return (
      <Box flexDirection="column" height={terminalHeight - 1}>
        {/* Minimal header - just name and phase */}
        <Box paddingX={1} marginBottom={0}>
          <Text bold color={C.purple}>✧ ZOSIA</Text>
          <Text color={C.gray}> · </Text>
          <Text color={beingState.phase === 'idle' ? C.gray : C.yellow}>
            {beingState.phase === 'idle' ? 'listening' : beingState.phase}
          </Text>
          <Box flexGrow={1} />
          <Text dimColor>[Tab for more]</Text>
        </Box>

        {/* Conversation only */}
        <Box flexGrow={1} marginTop={0}>
          <MindActivity logs={getVisibleLogs()} maxLines={getLogMaxLines()} streamingLogId={streamingLogId} selectedCodeBlock={selectedCodeBlock} expandedCodeBlocks={expandedCodeBlocks} onCodeBlockCopy={handleCodeBlockCopy} onToggleExpand={toggleCodeBlockExpand} />
        </Box>

        {/* Input */}
        <InputArea
          value={inputValue}
          onChange={setInputValue}
          onSubmit={handleSubmit}
          processing={processing}
          queueCount={messageQueue.length}
          onCancel={cancelProcessing}
          onHistoryPrev={() => historyRef.current.previous()}
          onHistoryNext={() => historyRef.current.next()}
        />
      </Box>
    );
  }

  // Summary View - Conversation + status bar
  if (viewMode === 'summary') {
    return (
      <Box flexDirection="column" height={terminalHeight - 1}>
        {/* Compact header with status */}
        <Header
          verbose={verbose}
          memoryActive={systemStatus.memory.connected}
          phase={beingState.phase}
          tokenStats={tokenStats}
          viewMode={viewMode}
          otherSessions={otherSessions}
        />

        {/* Status bar showing current activity */}
        {beingState.phase !== 'idle' && (
          <Box paddingX={1} marginBottom={0}>
            <Text color={C.blue}>💭 </Text>
            <Text color={C.gray}>
              {beingState.unconscious.active && `Sensing: ${beingState.unconscious.sensing || '...'} · `}
              {beingState.conscious.active && `Thinking: ${beingState.conscious.thinking || '...'}`}
              {beingState.phase === 'integrating' && 'Integrating context...'}
              {beingState.phase === 'remembering' && 'Saving to memory...'}
            </Text>
          </Box>
        )}

        {/* Conversation log */}
        <Box flexGrow={1} marginTop={0}>
          <MindActivity logs={logs} maxLines={getLogMaxLines()} streamingLogId={streamingLogId} selectedCodeBlock={selectedCodeBlock} expandedCodeBlocks={expandedCodeBlocks} onCodeBlockCopy={handleCodeBlockCopy} onToggleExpand={toggleCodeBlockExpand} />
        </Box>

        {/* Input */}
        <InputArea
          value={inputValue}
          onChange={setInputValue}
          onSubmit={handleSubmit}
          processing={processing}
          queueCount={messageQueue.length}
          onCancel={cancelProcessing}
          onHistoryPrev={() => historyRef.current.previous()}
          onHistoryNext={() => historyRef.current.next()}
        />
      </Box>
    );
  }

  // Split View - Side-by-side conversation | mind activity
  if (viewMode === 'split') {
    // Filter logs into conversation (user/response) and mind (everything else)
    const conversationLogs = logs.filter((entry) => entry.level === 'user' || entry.level === 'response');
    const mindLogs = logs.filter((entry) => entry.level !== 'user' && entry.level !== 'response');

    return (
      <Box flexDirection="column" height={terminalHeight - 1}>
        {/* Compact header */}
        <Header
          verbose={verbose}
          memoryActive={systemStatus.memory.connected}
          phase={beingState.phase}
          tokenStats={tokenStats}
          viewMode={viewMode}
          otherSessions={otherSessions}
        />

        {/* Split pane: Conversation | Mind Activity - Responsive layout */}
        <Box flexGrow={1} marginTop={0} flexDirection={layoutSize === 'compact' ? 'column' : 'row'}>
          {/* Left: Conversation */}
          <Box width={layoutSize === 'compact' ? '100%' : '50%'} flexDirection="column" borderStyle="single" borderColor={C.purple} paddingX={1}>
            <Text bold color={C.purple}>─ Conversation ─</Text>
            <Box flexDirection="column" minHeight={getLogMaxLines()}>
              {conversationLogs.length === 0 ? (
                <Text dimColor italic>Conversation will appear here...</Text>
              ) : (
                conversationLogs.slice(-getLogMaxLines()).map((entry) => {
                  const timeStr = entry.timestamp.toLocaleTimeString('en-US', {
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  });
                  if (entry.level === 'user') {
                    return (
                      <Box key={entry.id} flexDirection="column">
                        <Box>
                          <Text dimColor>{timeStr} </Text>
                          <Text color={C.cyan}>◀ You: </Text>
                        </Box>
                        <Box marginLeft={2}>
                          <Text wrap="wrap">{entry.message}</Text>
                        </Box>
                      </Box>
                    );
                  }
                  // Response - show with wrapping
                  return (
                    <Box key={entry.id} flexDirection="column">
                      <Box>
                        <Text dimColor>{timeStr} </Text>
                        <Text color={C.purple}>► Zosia:</Text>
                      </Box>
                      <Box marginLeft={2}>
                        <Text wrap="wrap">{entry.message}</Text>
                      </Box>
                    </Box>
                  );
                })
              )}
            </Box>
          </Box>

          {/* Right: Mind Activity */}
          <Box width={layoutSize === 'compact' ? '100%' : '50%'} flexDirection="column" borderStyle="single" borderColor={C.blue} paddingX={1}>
            <Text bold color={C.blue}>─ Mind Activity ─</Text>
            <Box flexDirection="column" minHeight={getLogMaxLines()}>
              {mindLogs.length === 0 ? (
                <Text dimColor italic>Mind activity will appear here...</Text>
              ) : (
                mindLogs.slice(-getLogMaxLines()).map((entry) => {
                  const timeStr = entry.timestamp.toLocaleTimeString('en-US', {
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  });
                  const sourceColors: Record<string, string> = {
                    system: C.gray,
                    'we-layer': C.blue,
                    'i-layer': C.green,
                    memory: C.orange,
                  };
                  const color = sourceColors[entry.source] || C.gray;
                  return (
                    <Box key={entry.id} flexDirection="column">
                      <Box>
                        <Text dimColor>{timeStr} </Text>
                        <Text color={color}>[{entry.source.toUpperCase().slice(0, 6)}] </Text>
                      </Box>
                      <Box marginLeft={2}>
                        <Text wrap="wrap">{entry.message}</Text>
                      </Box>
                    </Box>
                  );
                })
              )}
            </Box>
          </Box>
        </Box>

        {/* Input */}
        <InputArea
          value={inputValue}
          onChange={setInputValue}
          onSubmit={handleSubmit}
          processing={processing}
          queueCount={messageQueue.length}
          onCancel={cancelProcessing}
          onHistoryPrev={() => historyRef.current.previous()}
          onHistoryNext={() => historyRef.current.next()}
        />
      </Box>
    );
  }

  // Developer View - Full debug with all panels
  return (
    <Box flexDirection="column" height={terminalHeight - 1}>
      {/* Header */}
      <Header
        verbose={verbose}
        memoryActive={systemStatus.memory.connected}
        phase={beingState.phase}
        tokenStats={tokenStats}
        viewMode={viewMode}
        otherSessions={otherSessions}
      />

      {/* Being State Panels Row - Responsive layout */}
      <Box marginTop={0}>
        <Box width={layoutConfig.panelWidth}>
          <InternalStatePanel being={beingState} status={systemStatus} />
        </Box>
        <Box width={layoutConfig.panelWidth}>
          <NeuralFlowPanel phase={beingState.phase} status={systemStatus} />
        </Box>
        {layoutConfig.showThirdPanel && (
          <Box width={layoutConfig.panelWidth}>
            <SessionStatsPanel tokenStats={tokenStats} logs={logs} status={systemStatus} />
          </Box>
        )}
      </Box>

      {/* Mind Activity Log */}
      <Box flexGrow={1} marginTop={0}>
        <MindActivity logs={logs} maxLines={getLogMaxLines()} streamingLogId={streamingLogId} selectedCodeBlock={selectedCodeBlock} expandedCodeBlocks={expandedCodeBlocks} onCodeBlockCopy={handleCodeBlockCopy} onToggleExpand={toggleCodeBlockExpand} />
      </Box>

      {/* Input */}
      <InputArea
        value={inputValue}
        onChange={setInputValue}
        onSubmit={handleSubmit}
        processing={processing}
        queueCount={messageQueue.length}
        onCancel={cancelProcessing}
        onHistoryPrev={() => historyRef.current.previous()}
        onHistoryNext={() => historyRef.current.next()}
      />
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Launch
// ─────────────────────────────────────────────────────────────────────────────

export async function launchInteractive(options: { userId?: string; verbose?: boolean } = {}) {
  let userId = options.userId;
  if (!userId) {
    const authSession = getAuthSession();
    userId = authSession?.userId || 'anonymous';
  }

  const verbose = options.verbose ?? true;

  if (verbose) {
    process.env.ZOSIA_DEBUG = 'true';
  }

  // Check if we're in a TTY (required for interactive mode)
  const isTTY = process.stdin.isTTY && process.stdout.isTTY;

  if (!isTTY) {
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║  ✧ ZOSIA Interactive TUI requires a terminal (TTY)            ║');
    console.log('║                                                               ║');
    console.log('║  You are running in a non-interactive environment.            ║');
    console.log('║  Please run from a terminal directly:                         ║');
    console.log('║                                                               ║');
    console.log('║    pnpm zosia tui                                             ║');
    console.log('║    # or                                                       ║');
    console.log('║    pnpm zosia chat                                            ║');
    console.log('║                                                               ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');
    return;
  }

  const { waitUntilExit } = render(<InteractiveApp userId={userId} verbose={verbose} />, {
    exitOnCtrlC: false,
  });

  await waitUntilExit();
}

export default InteractiveApp;
