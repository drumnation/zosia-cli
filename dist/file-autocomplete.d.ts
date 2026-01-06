/**
 * File Autocomplete Component
 *
 * Shows a fuzzy file search dropdown when user types "@".
 * Navigate with up/down arrows, select with Tab or Enter.
 */
import React from 'react';
import { type SearchResult } from './fuzzy-file-search.js';
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
export declare function useFileAutocomplete(value: string, onUpdate: (newValue: string) => void, options?: {
    maxResults?: number;
    enabled?: boolean;
}): FileAutocompleteState & {
    handleKeyPress: (key: {
        upArrow?: boolean;
        downArrow?: boolean;
        tab?: boolean;
        return?: boolean;
        escape?: boolean;
    }) => boolean;
    selectCurrent: () => void;
    dismiss: () => void;
};
export declare const FileAutocompleteDropdown: React.FC<{
    results: SearchResult[];
    selectedIndex: number;
    query: string;
    visible: boolean;
}>;
export default FileAutocompleteDropdown;
//# sourceMappingURL=file-autocomplete.d.ts.map