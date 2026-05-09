agent: OpenHermes-ohc

Manage conversation context with OpenHermes dynamic context pruning.

## Usage

`/ohc [subcommand]`

## Subcommands

- `/ohc` — Show available OHC commands
- `/ohc context` — Show token usage breakdown by category
- `/ohc stats` — Cumulative pruning statistics across all sessions
- `/ohc sweep [n]` — Prune tools since last user message (optional count)
- `/ohc manual [on|off]` — Toggle manual mode
- `/ohc compress [focus]` — Trigger compress tool execution
- `/ohc decompress [id]` — Restore a compression by block ID
- `/ohc recompress [id]` — Re-apply a decompressed block
