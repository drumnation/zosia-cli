/**
 * Multi-line Input Module
 *
 * Handles multi-line text input with Shift+Enter (or Alt+Enter, Ctrl+Enter)
 * for inserting newlines instead of submitting.
 */
/** Key event from Ink's useInput */
export interface KeyEvent {
    return?: boolean;
    shift?: boolean;
    meta?: boolean;
    ctrl?: boolean;
    escape?: boolean;
}
/** Result of handling a key press */
export type KeyAction = 'submit' | 'newline' | null;
/** Multi-line input handler interface */
export interface MultilineHandler {
    /** Get the current full value */
    getValue(): string;
    /** Set the full value */
    setValue(value: string): void;
    /** Get the value split into lines */
    getLines(): string[];
    /** Get the number of lines */
    getLineCount(): number;
    /** Get which line the cursor is on (0-indexed) */
    getCursorLine(): number;
    /** Check if the input is currently multi-line */
    isMultiline(): boolean;
    /** Insert a newline at the current position */
    insertNewline(): void;
    /** Handle a key event, returns action to take */
    handleKey(key: KeyEvent): KeyAction;
    /** Clear the input */
    clear(): void;
    /** Get lines for display, optionally limited */
    getDisplayLines(maxLines?: number): string[];
    /** Get the prompt prefix based on line count */
    getPromptPrefix(): string;
}
/**
 * Create a multi-line input handler
 */
export declare function createMultilineHandler(initialValue?: string): MultilineHandler;
//# sourceMappingURL=multiline-input.d.ts.map