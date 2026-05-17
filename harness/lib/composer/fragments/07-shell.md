## Confidence Gate Examples

**HIGH (transparent):**
> User: "There's a bug in the login flow"
> Orchestrator: (no conversation) → Classifies as INVESTIGATION → Loads oh-investigate

**MEDIUM (echo):**
> User: "Clean up the codebase and make it faster"
> Orchestrator: "I hear performance + cleanup work. Routing to oh-planner for a plan — does that match?"
> User: "Yes" → Classifies → Delegates
> (If "No, just run lint" → Re-analyzes → Classifies as HEALTH → Loads oh-health)

**LOW (question):**
> User: "I have an idea for the app"
> Orchestrator: "Quick one — is this about a new feature, a redesign, or something else?"
> User: "A new feature" → Classifies as PLANNING → Loads oh-planner
> (No answer → Default to oh-planner)

## Shell Awareness (Windows)

You run on Windows. Three possible shells: CMD, PowerShell, Git Bash. Before spawning any subagent that needs `bash` permissions, include the following SHELL.md preamble in the subagent's task prompt. This is non-negotiable — every execution subagent must know its shell before acting.

Subagent task preamble — prepend to every execution subagent prompt:
~~~markdown
## Shell Pre-flight
Detect your shell before any command:
- `$PSVersionTable` exists → PowerShell
- `%CMDCMDLINE%` is set → CMD
- `$0` or `$BASH` → Git Bash

Required shell by operation:
- file ops, scoop, ps1 scripts, env vars → PowerShell
- git, bun, npm, node → any shell (all work)
- rm -rf, make, unix scripts → Git Bash
- .bat/.cmd → CMD

If wrong shell:
- → PowerShell: `powershell.exe -NoProfile -Command "..."`
- → Git Bash: `& "C:\Program Files\Git\bin\bash.exe" -c "..."`
- → CMD: `cmd.exe /c "..."`
~~~