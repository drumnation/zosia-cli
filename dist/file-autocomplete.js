import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * File Autocomplete Component
 *
 * Shows a fuzzy file search dropdown when user types "@".
 * Navigate with up/down arrows, select with Tab or Enter.
 */
import { useState, useEffect, useCallback } from 'react';
import { Box, Text } from 'ink';
import { detectAtSearch, searchFiles, replaceAtQuery, formatFileEntry, } from './fuzzy-file-search.js';
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
export function useFileAutocomplete(value, onUpdate, options = {}) {
    const { maxResults = 8, enabled = true } = options;
    const [state, setState] = useState({
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
        if (!state.visible || state.results.length === 0)
            return;
        const selected = state.results[state.selectedIndex];
        if (!selected)
            return;
        const newValue = replaceAtQuery(value, state.atPosition, state.query, selected.file.path);
        onUpdate(newValue);
        setState((prev) => ({ ...prev, visible: false, results: [] }));
    }, [state, value, onUpdate]);
    // Dismiss autocomplete
    const dismiss = useCallback(() => {
        setState((prev) => ({ ...prev, visible: false }));
    }, []);
    // Handle keyboard navigation
    const handleKeyPress = useCallback((key) => {
        if (!state.visible)
            return false;
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
    }, [state, selectCurrent, dismiss]);
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
export const FileAutocompleteDropdown = ({ results, selectedIndex, query, visible }) => {
    if (!visible) {
        return null;
    }
    return (_jsxs(Box, { flexDirection: "column", borderStyle: "round", borderColor: C.purple, paddingX: 1, marginBottom: 0, children: [_jsxs(Box, { children: [_jsx(Text, { color: C.purple, bold: true, children: "@ File Search" }), _jsx(Text, { color: C.gray, children: " \u00B7 " }), _jsx(Text, { color: C.cyan, children: query || '...' }), _jsx(Text, { color: C.gray, children: " \u00B7 " }), _jsx(Text, { dimColor: true, children: "Tab to select \u00B7 Esc to cancel" })] }), results.length === 0 ? (_jsx(Box, { marginTop: 0, children: _jsx(Text, { dimColor: true, italic: true, children: query ? 'No matching files' : 'Type to search files...' }) })) : (_jsx(Box, { flexDirection: "column", marginTop: 0, children: results.map((result, index) => {
                    const isSelected = index === selectedIndex;
                    const displayText = formatFileEntry(result.file, 60);
                    return (_jsxs(Box, { children: [_jsx(Text, { color: isSelected ? C.yellow : C.gray, children: isSelected ? '▸ ' : '  ' }), _jsx(Text, { color: isSelected ? C.white : C.gray, bold: isSelected, children: displayText }), result.file.dir && !isSelected && (_jsxs(Text, { dimColor: true, children: [" (", result.file.dir, ")"] }))] }, result.file.path));
                }) }))] }));
};
// ─────────────────────────────────────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────────────────────────────────────
export default FileAutocompleteDropdown;
