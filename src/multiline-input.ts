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
  meta?: boolean;    // Alt key on most terminals
  ctrl?: boolean;
  escape?: boolean;  // Some terminals send escape for Alt combinations
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
export function createMultilineHandler(initialValue: string = ''): MultilineHandler {
  let value = initialValue;

  const getLines = (): string[] => {
    // Split on newlines, preserving empty strings for blank lines
    return value.split('\n');
  };

  const getLineCount = (): number => {
    return getLines().length;
  };

  const isMultiline = (): boolean => {
    return value.includes('\n');
  };

  return {
    getValue(): string {
      return value;
    },

    setValue(newValue: string): void {
      value = newValue;
    },

    getLines,
    getLineCount,

    getCursorLine(): number {
      // For simplicity, assume cursor is at the end (last line)
      return Math.max(0, getLineCount() - 1);
    },

    isMultiline,

    insertNewline(): void {
      value = value + '\n';
    },

    handleKey(key: KeyEvent): KeyAction {
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

    clear(): void {
      value = '';
    },

    getDisplayLines(maxLines?: number): string[] {
      const lines = getLines();

      if (maxLines === undefined || lines.length <= maxLines) {
        return lines;
      }

      // Show the last N lines (most recent input)
      return lines.slice(-maxLines);
    },

    getPromptPrefix(): string {
      if (!isMultiline()) {
        return '>';
      }
      return `[${getLineCount()}]`;
    },
  };
}
