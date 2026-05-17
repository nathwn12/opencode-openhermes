// ---------------------------------------------------------------------------
// ShellDetectHook — PreToolUse, priority=80, phase=EARLY
//
// Before sub-agent calls that need CLI, inject SHELL.md preamble.
// Detect platform, add appropriate shell context.
// ---------------------------------------------------------------------------

import { HookPhase, HookResult } from "../types.ts";
import type { HookContext, PreToolUseHook } from "../types.ts";
import { getHarnessDir } from "../../../../lib/harness-resolver.ts";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export const shellDetectHook: PreToolUseHook = {
  metadata: {
    name: "shell-detect",
    priority: 80,
    phase: HookPhase.EARLY,
    dependencies: [],
    errorHandling: "isolate",
  },

  async execute(context: HookContext) {
    const platform = os.platform();
    const isWindows = platform === "win32";

    // Detect shell type
    let shellType = "unknown";
    if (isWindows) {
      // On Windows: detect PowerShell, CMD, or Git Bash
      const comSpec = process.env.COMSPEC ?? "";
      if (process.env.PSModulePath || process.env.PSExecutionPolicy) {
        shellType = "powershell";
      } else if (comSpec.toLowerCase().includes("cmd")) {
        shellType = "cmd";
      } else {
        // Could be Git Bash
        shellType = process.env.BASH ? "bash" : "powershell";
      }
    } else {
      shellType = "bash";
    }

    // Try to load SHELL.md
    let shellPreamble = "";
    try {
      const shellDocPath = path.join(getHarnessDir(), "instructions", "SHELL.md");
      await fs.promises.access(shellDocPath);
      shellPreamble = (await fs.promises.readFile(shellDocPath, "utf8")).trim();
    } catch {
      // If SHELL.md can't be read, provide minimal preamble
      shellPreamble = "";
    }

    return {
      result: HookResult.CONTINUE,
      modifiedContext: {
        _shellPlatform: platform,
        _shellType: shellType,
        _shellPreamble: shellPreamble || getDefaultPreamble(shellType, platform),
      },
    };
  },
};

function getDefaultPreamble(shellType: string, _platform: string): string {
  if (shellType === "powershell") {
    return [
      "## Shell Environment",
      "",
      "Detected: PowerShell on Windows",
      "- File ops, scoop installs, ps1 scripts, env vars → PowerShell",
      "- git, bun, npm, node → any shell (all work)",
      "- rm -rf, make, unix scripts → Git Bash",
      "",
    ].join("\n");
  }
  if (shellType === "cmd") {
    return [
      "## Shell Environment",
      "",
      "Detected: CMD on Windows",
      "- .bat/.cmd scripts → CMD",
      "- git, bun, npm, node → any shell",
      "",
    ].join("\n");
  }
  return [
    "## Shell Environment",
    "",
    `Detected: ${shellType}`,
    "- Standard POSIX shell commands available",
    "",
  ].join("\n");
}
