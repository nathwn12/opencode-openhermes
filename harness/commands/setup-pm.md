---
description: Configure package manager preference for OpenHermes
agent: OpenHermes
subtask: true
---

# Setup Package Manager Command

Configure your preferred package manager: $ARGUMENTS

## Your Task

Set up package manager preference for the project or globally.

## Detection Order

1. **Environment variable**: `OPENHERMES_PACKAGE_MANAGER`
2. **Project config**: `.opencode/package-manager.json`
3. **package.json**: `packageManager` field
4. **Lock file**: Auto-detect from lock files
5. **Global config**: `~/.config/opencode/package-manager.json`
6. **Fallback**: First available

## Configuration Options

### Option 1: Environment Variable
```bash
$env:OPENHERMES_PACKAGE_MANAGER="pnpm"
```

### Option 2: Project Config
```bash
# Create .opencode/package-manager.json
echo '{"packageManager": "pnpm"}' | Out-File -Encoding utf8 .opencode/package-manager.json
```

### Option 3: package.json
```json
{
  "packageManager": "pnpm@8.0.0"
}
```

### Option 4: Global Config
```bash
# Create ~/.config/opencode/package-manager.json
echo '{"packageManager": "yarn"}' | Out-File -Encoding utf8 ~/.config/opencode/package-manager.json
```

## Supported Package Managers

| Manager | Lock File | Commands |
|---------|-----------|----------|
| npm | package-lock.json | `npm install`, `npm run` |
| pnpm | pnpm-lock.yaml | `pnpm install`, `pnpm run` |
| yarn | yarn.lock | `yarn install`, `yarn run` |
| bun | bun.lockb | `bun install`, `bun run` |

## Verification

Check current setting by inspecting detection order from top down.

---

**TIP**: For consistency across team, add `packageManager` field to package.json.
