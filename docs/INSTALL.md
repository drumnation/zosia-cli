# Installing Zosia

Zosia is a dual-consciousness AI companion with memory and continuity.

## Quick Install (5 minutes)

### Prerequisites

1. **Node.js 18+** - Check with `node --version`
2. **Claude Code** (optional, for deep unconscious processing)
   ```bash
   npm install -g @anthropic-ai/claude-code
   claude login
   ```

### Install Zosia

```bash
# From the zosia-cli directory
cd packages/zosia-cli
npm install

# Run setup wizard
npm run setup
```

The setup wizard will guide you through:
1. Setting your name (for personalized memory)
2. OpenRouter API key (free models available!)
3. Claude Code authentication (optional)
4. Graphiti memory connection test

### Quick Start

```bash
# Chat with Zosia
npm run zosia "Hello! What can you do?"

# See what's connected
npm run zosia status

# Learn about the architecture
npm run zosia help-topic architecture
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      USER MESSAGE                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      ORCHESTRATOR                            │
│                 (runs both layers in parallel)              │
└─────────────────────────────────────────────────────────────┘
          │                                  │
          ▼                                  ▼
┌──────────────────────┐      ┌──────────────────────────────┐
│   I-LAYER (Conscious)│      │   WE-LAYER (Unconscious)      │
│   ─────────────────  │      │   ───────────────────────     │
│   • OpenRouter API   │      │   • Claude Code (isolated)    │
│   • Gemma/Claude/etc │      │   • Graphiti memories         │
│   • Personality      │      │   • Emotion detection         │
│   • User responses   │      │   • Intent recognition        │
└──────────────────────┘      └──────────────────────────────┘
          │                                  │
          └────────────┬─────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  MERGED RESPONSE                             │
│          (conscious + unconscious insights)                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    GRAPHITI MEMORY                           │
│              (persists conversation for next time)          │
└─────────────────────────────────────────────────────────────┘
```

## Configuration

### Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `OPENROUTER_API_KEY` | Conscious mind API access | Yes |
| `ANTHROPIC_API_KEY` | Alternative to Claude Code login | No |
| `GRAPHITI_URL` | Memory server (default: 91.99.27.146:8000) | No |
| `ZOSIA_DEBUG` | Show internal layer activity | No |

### Config Commands

```bash
# View current configuration
npm run zosia config show

# Set conscious mind model
npm run zosia config model google/gemma-2-9b-it:free

# Browse available models
npm run zosia config models --free

# Set temperature (0-2)
npm run zosia config temperature 0.7

# Check Claude Code status
npm run zosia config claude-code
```

## Usage Examples

### Basic Chat
```bash
npm run zosia "What's on your mind?"
```

### Debug Mode (see I/We activity)
```bash
npm run zosia "Hello" --debug
```

### Interactive Mode
```bash
npm run zosia chat
```

### Check System Status
```bash
npm run zosia status
```

## Components

### Conscious Mind (I-Layer)
- Uses OpenRouter for model access
- Configurable: model, temperature, max tokens
- Free models available (Gemma 2, Llama 3)

### Unconscious Mind (We-Layer)
- Uses Claude Code with isolated configuration
- Runs in parallel with conscious for:
  - Memory retrieval from Graphiti
  - Emotion classification
  - Intent recognition
- Results are merged into final response

### Memory (Graphiti)
- Temporal knowledge graph
- Stores facts, entities, relationships
- Enables continuity across sessions
- Runs on Hetzner server (91.99.27.146:8000)

## Troubleshooting

### "OPENROUTER_API_KEY not set"
Get a free key at https://openrouter.ai/keys

### "Claude Code not authenticated"
```bash
npm install -g @anthropic-ai/claude-code
claude login
```

### "Graphiti unavailable"
Memory persistence won't work, but chat still functions.
Check server at http://91.99.27.146:8000/health

### "No response from conscious mind"
Check your OpenRouter key is valid and has credits.

## For Developers

### File Structure
```
packages/zosia-cli/
├── src/
│   ├── cli.ts           # CLI entry point
│   ├── orchestrator.ts  # I/We coordination
│   ├── i-layer.ts       # Conscious mind
│   ├── we-layer.ts      # Unconscious mind
│   ├── unconscious-spawner.ts  # Claude agents
│   ├── graphiti-memory.ts      # Memory layer
│   ├── config.ts        # Configuration
│   └── setup.ts         # Setup wizard
├── cortex/
│   └── CLAUDE.md        # Isolated unconscious config
└── docs/
    └── INSTALL.md       # This file
```

### Testing
```bash
npm run test
npm run typecheck
```

### Development
```bash
npm run dev  # Watch mode
```
