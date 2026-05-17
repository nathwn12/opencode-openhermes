// ---------------------------------------------------------------------------
// Test fixtures: disposable temp directories, mock filesystem, waitFor polls
// ---------------------------------------------------------------------------

import fs from "node:fs"
import os from "node:os"
import path from "node:path"

// ---------------------------------------------------------------------------
// Disposable directory handles
// ---------------------------------------------------------------------------

export class DirHandle {
  constructor(
    public readonly path: string,
    private readonly cleanup?: (dir: string) => Promise<void>,
  ) {}

  async [Symbol.asyncDispose](): Promise<void> {
    if (this.cleanup) {
      await this.cleanup(this.path)
    } else {
      await fs.promises.rm(this.path, { recursive: true, force: true })
    }
  }

  toString(): string {
    return this.path
  }
}

export class DirHandleSync {
  constructor(
    public readonly path: string,
    private readonly cleanup?: (dir: string) => void,
  ) {}

  [Symbol.dispose](): void {
    if (this.cleanup) {
      this.cleanup(this.path)
    } else {
      fs.rmSync(this.path, { recursive: true, force: true })
    }
  }

  toString(): string {
    return this.path
  }
}

// ---------------------------------------------------------------------------
// tmpdir — creates disposable temp directory (async)
// ---------------------------------------------------------------------------

/**
 * Create a temp directory with optional init/dispose hooks.
 *
 * Supports `await using` for automatic cleanup:
 * ```ts
 * await using dir = await tmpdir()
 * // dir.path is the temp directory path
 * // auto-cleaned when scope exits
 * ```
 */
export async function tmpdir(options?: {
  prefix?: string
  init?: (dir: string) => Promise<void>
  dispose?: (dir: string) => Promise<void>
}): Promise<DirHandle> {
  const prefix = options?.prefix ?? "oh-test-"
  const dirPath = fs.mkdtempSync(path.join(os.tmpdir(), prefix))

  if (options?.init) {
    await options.init(dirPath)
  }

  return new DirHandle(dirPath, options?.dispose)
}

// ---------------------------------------------------------------------------
// tmpdirSync — creates disposable temp directory (sync)
// ---------------------------------------------------------------------------

/**
 * Sync version of tmpdir. Supports `using` for automatic cleanup:
 * ```ts
 * using dir = tmpdirSync()
 * ```
 */
export function tmpdirSync(options?: {
  prefix?: string
  dispose?: (dir: string) => void
}): DirHandleSync {
  const prefix = options?.prefix ?? "oh-test-"
  const dirPath = fs.mkdtempSync(path.join(os.tmpdir(), prefix))
  return new DirHandleSync(dirPath, options?.dispose)
}

// ---------------------------------------------------------------------------
// createMockFs — creates a file tree from a structure object
// ---------------------------------------------------------------------------

/**
 * Create files on disk from a `{ "path/to/file": "content" }` map.
 * Handles Windows paths correctly via `path.resolve`.
 */
export async function createMockFs(
  baseDir: string,
  structure: Record<string, string>,
): Promise<void> {
  for (const [filePath, content] of Object.entries(structure)) {
    const fullPath = path.resolve(baseDir, filePath)
    await fs.promises.mkdir(path.dirname(fullPath), { recursive: true })
    await fs.promises.writeFile(fullPath, content, "utf8")
  }
}

// ---------------------------------------------------------------------------
// waitFor — polls a condition until true or timeout
// ---------------------------------------------------------------------------

/**
 * Poll a condition function until it returns true or the timeout expires.
 * Rejects with a clear error message on timeout.
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  options?: {
    timeout?: number
    interval?: number
    label?: string
  },
): Promise<void> {
  const timeout = options?.timeout ?? 5_000
  const interval = options?.interval ?? 50
  const label = options?.label ?? "condition"
  const start = Date.now()

  while (true) {
    const result = await condition()
    if (result) return

    if (Date.now() - start >= timeout) {
      throw new Error(
        `waitFor timed out after ${timeout}ms: ${label}`,
      )
    }

    await new Promise(resolve => setTimeout(resolve, interval))
  }
}
