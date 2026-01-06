/**
 * File Autocomplete Component
 *
 * Shows a fuzzy file search dropdown when user types "@".
 * Navigate with up/down arrows, select with Tab or Enter.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import {
  detectAtSearch,
  searchFiles,
  replaceAtQuery,
  formatFileEntry,
  type FuzzySearchState,
  type SearchResult,
} from './fuzzy-file-search.js';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface FileAutocompleteProps {
  /** Current input value */
  value: string;
  /** Callback when input should be updated (with selected file) */
  onSelect: (newValue: string) => void;
  /** Maximum number of results to show */
  maxResults?: number;
  /** Whether autocomplete is enabled */
  enabled?: boolean;
}

export interface FileAutocompleteState {
  /** Whether the autocomplete dropdown is visible */
  visible: boolean;
  /** Search results to display */
  results: SearchResult[];
  /** Currently highlighted result index */
  selectedIndex: number;
  /** The search query (after @) */
  query: string;
  /** Position of @ in the input */
  atPosition: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Colors
// ─────────────────────────────────────────────────────────────────────────────

const C = {
  purple: '#9B59B6',
  cyan: '#00BCD4',
  green: '#2ECC71',
  yellow: '#F1C40F',
  gray: '#7F8C8D',
  blue: '#3498DB',
  white: '#ECF0F1',
};

// ─────────────────────────────────────────────────────────────────────────────
// Hook: useFileAutocomplete
// ─────────────────────────────────────────────────────────────────────────────

export function useFileAutocomplete(
  value: string,
  onUpdate: (newValue: string) => void,
  options: { maxResults?: number; enabled?: boolean } = {}
): FileAutocompleteState & {
  handleKeyPress: (key: { upArrow?: boolean; downArrow?: boolean; tab?: boolean; return?: boolean; escape?: boolean }) => boolean;
  selectCurrent: () => void;
  dismiss: () => void;
} {
  const { maxResults = 8, enabled = true } = options;

  const [state, setState] = useState<FileAutocompleteState>({
    visible: false,
    results: [],
    selectedIndex: 0,
    query: '',
    atPosition: -1,
  });

  // Detect @ search trigger when value changes
  useEffect(() => {
    if (!enabled) {
      setState((prev) => ({ ...prev, visible: false }));
      return;
    }

    const searchState = detectAtSearch(value);

    if (!searchState) {
      setState((prev) => ({ ...prev, visible: false, results: [], query: '' }));
      return;
    }

    // Perform search
    const doSearch = async () => {
      const results = await searchFiles(searchState.query, process.cwd(), maxResults);
      setState({
        visible: true,
        results,
        selectedIndex: 0,
        query: searchState.query,
        atPosition: searchState.atPosition,
      });
    };

    doSearch();
  }, [value, enabled, maxResults]);

  // Select current result
  const selectCurrent = useCallback(() => {
    if (!state.visible || state.results.length === 0) return;

    const selected = state.results[state.selectedIndex];
    if (!selected) return;

    const newValue = replaceAtQuery(
      value,
      state.atPosition,
      state.query,
      selected.file.path
    );

    onUpdate(newValue);
    setState((prev) => ({ ...prev, visible: false, results: [] }));
  }, [state, value, onUpdate]);

  // Dismiss autocomplete
  const dismiss = useCallback(() => {
    setState((prev) => ({ ...prev, visible: false }));
  }, []);

  // Handle keyboard navigation
  const handleKeyPress = useCallback(
    (key: { upArrow?: boolean; downArrow?: boolean; tab?: boolean; return?: boolean; escape?: boolean }): boolean => {
      if (!state.visible) return false;

      if (key.escape) {
        dismiss();
        return true;
      }

      if (key.upArrow) {
        setState((prev) => ({
          ...prev,
          selectedIndex: Math.max(0, prev.selectedIndex - 1),
        }));
        return true;
      }

      if (key.downArrow) {
        setState((prev) => ({
          ...prev,
          selectedIndex: Math.min(prev.results.length - 1, prev.selectedIndex + 1),
        }));
        return true;
      }

      if (key.tab) {
        selectCurrent();
        return true;
      }

      // Don't consume Enter - let it submit if no results or not in @ mode
      // But if we have results and @ is active, select on Enter
      if (key.return && state.results.length > 0) {
        selectCurrent();
        return true;
      }

      return false;
    },
    [state, selectCurrent, dismiss]
  );

  return {
    ...state,
    handleKeyPress,
    selectCurrent,
    dismiss,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Component: FileAutocompleteDropdown
// ─────────────────────────────────────────────────────────────────────────────

export const FileAutocompleteDropdown: React.FC<{
  results: SearchResult[];
  selectedIndex: number;
  query: string;
  visible: boolean;
}> = ({ results, selectedIndex, query, visible }) => {
  if (!visible) {
    return null;
  }

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={C.purple}
      paddingX={1}
      marginBottom={0}
    >
      {/* Header */}
      <Box>
        <Text color={C.purple} bold>
          @ File Search
        </Text>
        <Text color={C.gray}> · </Text>
        <Text color={C.cyan}>{query || '...'}</Text>
        <Text color={C.gray}> · </Text>
        <Text dimColor>Tab to select · Esc to cancel</Text>
      </Box>

      {/* Results */}
      {results.length === 0 ? (
        <Box marginTop={0}>
          <Text dimColor italic>
            {query ? 'No matching files' : 'Type to search files...'}
          </Text>
        </Box>
      ) : (
        <Box flexDirection="column" marginTop={0}>
          {results.map((result, index) => {
            const isSelected = index === selectedIndex;
            const displayText = formatFileEntry(result.file, 60);

            return (
              <Box key={result.file.path}>
                <Text color={isSelected ? C.yellow : C.gray}>
                  {isSelected ? '▸ ' : '  '}
                </Text>
                <Text
                  color={isSelected ? C.white : C.gray}
                  bold={isSelected}
                >
                  {displayText}
                </Text>
                {/* Show directory hint for clarity */}
                {result.file.dir && !isSelected && (
                  <Text dimColor> ({result.file.dir})</Text>
                )}
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────────────────────────────────────

export default FileAutocompleteDropdown;
