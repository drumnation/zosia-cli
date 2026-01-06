# Zosia CLI

> Your AI companion with memory and continuity

[![Version](https://img.shields.io/badge/version-0.1.0-purple.svg)](https://github.com/drumnation/zosia-cli)
[![Node](https://img.shields.io/badge/node-%3E%3D18-green.svg)](https://nodejs.org)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Zosia is an AI companion CLI with a dual-consciousness architecture. She combines a **conscious mind** (OpenRouter models) for direct responses with an **unconscious mind** (Claude Code) for deeper pattern recognition and memory.

## Quick Install

```bash
# Install directly from GitHub
npm install -g github:drumnation/zosia-cli
```

## Features

- **Dual-Layer Architecture**: Conscious (I-Layer) + Unconscious (We-Layer) working together
- **Persistent Memory**: Temporal knowledge graph via Graphiti for continuity across sessions
- **Multiple Interfaces**: Interactive TUI, chat REPL, or single-shot print mode
- **Vision Support**: Attach images to your messages for visual understanding
- **Free Tier Friendly**: Works with free OpenRouter models out of the box
- **Auto-Updates**: Get notified when new versions are available

## Requirements

- Node.js 18 or higher
- OpenRouter API key (free tier available at [openrouter.ai](https://openrouter.ai))
- Optional: Claude Code for unconscious layer (`npm install -g @anthropic-ai/claude-code`)

## Setup

After installing, run the setup wizard:

```bash
zosia setup
```

Or configure manually:

```bash
# Set your OpenRouter key
zosia config openrouter-key YOUR_KEY

# Choose a model (optional - defaults to free Gemma 2)
zosia config model google/gemma-2-9b-it:free
```

## Usage

### Interactive TUI (Default)

Just run `zosia` to launch the full interactive dashboard:

```bash
zosia
```

The TUI shows:
- Zosia's internal state (unconscious sensing, conscious reasoning)
- Real-time processing flow
- Memory status
- Token usage and costs

### Chat Mode

For a simpler readline-based chat:

```bash
zosia chat
```

### Single Message (Print Mode)

For scripts and pipes:

```bash
zosia -p "What's the weather like today?"
```

### Debug Mode

See the I-Layer and We-Layer activity:

```bash
zosia -d
zosia -p "Hello" --debug
```

### With Images

Attach images using `@` syntax:

```bash
zosia -p "What's in this image? @./screenshot.png"
```

## Commands

| Command | Description |
|---------|-------------|
| `zosia` | Launch interactive TUI |
| `zosia chat` | Start chat REPL |
| `zosia setup` | Run setup wizard |
| `zosia status` | Check system health |
| `zosia config show` | View configuration |
| `zosia config model <id>` | Set conscious mind model |
| `zosia config models` | List available models |
| `zosia config models --free` | List free models |
| `zosia login` | Authenticate with Appwrite |
| `zosia whoami` | Show current user |

### Slash Commands (in TUI/Chat)

| Command | Description |
|---------|-------------|
| `/help` | Show available commands |
| `/status` | Check system status |
| `/clear` | Clear conversation history |
| `/debug` | Toggle debug mode |
| `/copy` | Copy last response |
| `/copy code` | Copy code blocks |
| `/session save` | Save current session |
| `/session load` | Load a saved session |
| `/onboarding` | Check setup status |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Zosia CLI                                │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐   ┌────────────────────────────────┐  │
│  │   Conscious Mind    │   │       Unconscious Mind         │  │
│  │     (I-Layer)       │   │         (We-Layer)             │  │
│  │                     │   │                                │  │
│  │  OpenRouter Models  │◄──│  Claude Code Agents            │  │
│  │  Direct Responses   │   │  Memory Retrieval              │  │
│  │  Personality        │   │  Emotion Classification        │  │
│  │                     │   │  Intent Recognition            │  │
│  └─────────────────────┘   └────────────────────────────────┘  │
│                                       │                         │
│                                       ▼                         │
│                            ┌──────────────────┐                 │
│                            │ Graphiti Memory  │                 │
│                            │ Temporal Graph   │                 │
│                            └──────────────────┘                 │
└─────────────────────────────────────────────────────────────────┘
```

## Recommended Models

### Free (Great for Getting Started)

- `google/gemma-2-9b-it:free` - Best free option, good quality
- `meta-llama/llama-3.1-8b-instruct:free` - Fast and capable

### Paid (Higher Quality)

- `anthropic/claude-3-haiku` - Fast, affordable ($0.25/1M tokens)
- `anthropic/claude-3.5-sonnet` - High quality ($3/1M tokens)
- `openai/gpt-4o-mini` - Great value ($0.15/1M tokens)

## Environment Variables

| Variable | Description |
|----------|-------------|
| `OPENROUTER_API_KEY` | Your OpenRouter API key |
| `GRAPHITI_URL` | Memory server URL (default: `http://91.99.27.146:8000`) |
| `ANTHROPIC_API_KEY` | For Claude Code unconscious layer |
| `ZOSIA_DEBUG` | Enable debug output |

## Updating

Zosia will notify you when updates are available. To update:

```bash
npm install -g github:drumnation/zosia-cli
```

## Troubleshooting

### "OpenRouter API key not found"

Run `zosia config openrouter-key YOUR_KEY` or set `OPENROUTER_API_KEY` in your environment.

### "Memory (Graphiti) not connected"

This is optional. Zosia works without memory, just without persistence across sessions.

### "Claude Code not authenticated"

For the full unconscious layer experience, install and authenticate Claude Code:

```bash
npm install -g @anthropic-ai/claude-code
claude login
```

## License

MIT

## Author

Dave Mieloch <dave@brain-garden.io>
