/**
 * Multi-line Input Module
 *
 * Handles multi-line text input with Shift+Enter (or Alt+Enter, Ctrl+Enter)
 * for inserting newlines instead of submitting.
 */
/**
 * Create a multi-line input handler
 */
export function createMultilineHandler(initialValue = '') {
    let value = initialValue;
    const getLines = () => {
        // Split on newlines, preserving empty strings for blank lines
        return value.split('\n');
    };
    const getLineCount = () => {
        return getLines().length;
    };
    const isMultiline = () => {
        return value.includes('\n');
    };
    return {
        getValue() {
            return value;
        },
        setValue(newValue) {
            value = newValue;
        },
        getLines,
        getLineCount,
        getCursorLine() {
            // For simplicity, assume cursor is at the end (last line)
            return Math.max(0, getLineCount() - 1);
        },
        isMultiline,
        insertNewline() {
            value = value + '\n';
        },
        handleKey(key) {
            // Only handle Enter key
            if (!key.return) {
                return null;
            }
            // Any modifier + Enter = newline
            if (key.shift || key.meta || key.ctrl || key.escape) {
                return 'newline';
            }
            // Plain Enter = submit
            return 'submit';
        },
        clear() {
            value = '';
        },
        getDisplayLines(maxLines) {
            const lines = getLines();
            if (maxLines === undefined || lines.length <= maxLines) {
                return lines;
            }
            // Show the last N lines (most recent input)
            return lines.slice(-maxLines);
        },
        getPromptPrefix() {
            if (!isMultiline()) {
                return '>';
            }
            return `[${getLineCount()}]`;
        },
    };
}
