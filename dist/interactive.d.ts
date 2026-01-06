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
import React from 'react';
interface InteractiveProps {
    userId: string;
    verbose: boolean;
}
declare const InteractiveApp: React.FC<InteractiveProps>;
export declare function launchInteractive(options?: {
    userId?: string;
    verbose?: boolean;
}): Promise<void>;
export default InteractiveApp;
//# sourceMappingURL=interactive.d.ts.map