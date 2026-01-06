# Zosia CLI Feature Roadmap

## ✅ Completed Features

| Feature | Tests | Description |
|---------|-------|-------------|
| SSE/Streaming responses | 31 | Real-time token streaming |
| Message queue | Integrated | Type while processing |
| Cancel thinking (Escape) | Manual | Abort mid-response |
| File attachments | 36 | Parse and read file references |
| Syntax highlighting | 23 | Code blocks with language detection |
| Clipboard integration | 23 | Copy responses and code blocks |
| History navigation | 30 | Up/Down arrows, persistent history |
| Multi-line input | 28 | Shift+Enter, paste support |
| Token/cost display | 32 | Per-message and session totals |
| Context window indicator | 24 | Usage %, warnings, thresholds |
| Slash commands | 49 | /help, /clear, /copy, /save, /load, /exit, /handoff, /export, /sessions |
| Session save/load | 69 | Persist, resume, export conversations |
| Retry on error | 32 | Exponential backoff, retryable errors |
| Context handoff | 23 | Seamless continuation when context full |
| **Export formats** | Included | **Markdown and JSON with metadata** |
| **Session management** | Included | **List, delete, auto-naming** |
| **Graphiti memory** | Included | **Temporal knowledge graph, recall, persistence** |
| **Image/Vision support** | 31 | **Multimodal input, auto vision model selection** |

**Total: 348 tests passing**

## 🔄 Remaining Features

### Priority 2: Advanced

#### Tool Use Display
- [ ] Show tool calls as they happen
- [ ] Collapsible tool results
- [ ] Tool permission prompts

### Priority 3: Power User

#### Vim Keybindings
- [ ] Optional vim mode for input
- [ ] j/k navigation in history
- [ ] Custom keybinding config

#### Theme Support
- [ ] Light/dark theme toggle
- [ ] Custom color schemes
- [ ] High contrast mode

## Implementation Notes

### Context Handoff (Just Completed)
The handoff system compresses conversations when approaching context limit:
- Triggers at configurable threshold (default 80%)
- LLM generates natural memory summary
- Last user message preserved for seamless continuation
- No visible break in conversation flow

### Slash Commands Available
```
/help [command]      - Show help
/clear               - Clear display
/exit, /q, /quit     - Exit app
/copy [block]        - Copy to clipboard
/save <file>         - Save session
/load <file>         - Load session
/sessions, /ss       - List/manage saved sessions
/retry               - Retry last message
/export <fmt> <file> - Export conversation (md/json)
/handoff [cmd]       - Configure context handoff
```

## Technical Debt

- [ ] Improve test coverage for edge cases
- [ ] Add integration tests for full conversation flows
- [ ] Performance optimization for long sessions
- [ ] Better error messages for common issues
