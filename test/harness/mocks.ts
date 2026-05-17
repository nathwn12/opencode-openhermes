// ---------------------------------------------------------------------------
// Test mocks — console, process.exit, in-memory FS, event emitter,
//              abort controller
// ---------------------------------------------------------------------------

import path from "node:path"

// ---------------------------------------------------------------------------
// Console mock
// ---------------------------------------------------------------------------

export interface ConsoleMock {
  restore(): void
  getLogs(): unknown[][]
  getErrors(): unknown[][]
  getWarns(): unknown[][]
  getInfos(): unknown[][]
}

/**
 * Replace console.log/error/warn/info with captured arrays.
 * Returns helpers to inspect captured calls and restore originals.
 */
export function mockConsole(): ConsoleMock {
  const original = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
  }

  const logs: unknown[][] = []
  const errors: unknown[][] = []
  const warns: unknown[][] = []
  const infos: unknown[][] = []

  console.log = (...args: unknown[]) => {
    logs.push(args)
  }
  console.error = (...args: unknown[]) => {
    errors.push(args)
  }
  console.warn = (...args: unknown[]) => {
    warns.push(args)
  }
  console.info = (...args: unknown[]) => {
    infos.push(args)
  }

  return {
    restore() {
      console.log = original.log
      console.error = original.error
      console.warn = original.warn
      console.info = original.info
    },
    getLogs: () => logs,
    getErrors: () => errors,
    getWarns: () => warns,
    getInfos: () => infos,
  }
}

// ---------------------------------------------------------------------------
// process.exit mock
// ---------------------------------------------------------------------------

export interface ProcessExitMock {
  restore(): void
  getExitCodes(): number[]
}

/**
 * Capture process.exit calls without actually exiting.
 */
export function mockProcessExit(): ProcessExitMock {
  const original = process.exit
  const exitCodes: number[] = []

  process.exit = ((code?: number): never => {
    exitCodes.push(code ?? 0)
    // Prevent actual process termination in tests
    throw new Error(`process.exit(${code}) was called but was intercepted`)
  }) as typeof process.exit

  return {
    restore() {
      process.exit = original
    },
    getExitCodes: () => exitCodes,
  }
}

// ---------------------------------------------------------------------------
// In-memory filesystem
// ---------------------------------------------------------------------------

export interface MockFs {
  readFile(p: string): string | undefined
  writeFile(p: string, content: string): void
  exists(p: string): boolean
  readdir(p: string): string[]
  unlink(p: string): boolean
  restore(): void
  entries(): Map<string, string>
}

/**
 * Create an in-memory filesystem backed by a Map<string, string>.
 * All paths are normalized internally (backslash → forward slash).
 */
export function createMockFs(): MockFs {
  const files = new Map<string, string>()

  function normalize(p: string): string {
    return path.resolve("/", p).replace(/\\/g, "/")
  }

  return {
    readFile(p: string): string | undefined {
      return files.get(normalize(p))
    },

    writeFile(p: string, content: string): void {
      files.set(normalize(p), content)
    },

    exists(p: string): boolean {
      return files.has(normalize(p))
    },

    readdir(p: string): string[] {
      const dir = normalize(p)
      // Ensure dirPrefix ends with "/" — works on all platforms
      const dirPrefix = dir.endsWith("/") ? dir : dir + "/"
      const entries = new Set<string>()
      for (const key of files.keys()) {
        if (key.startsWith(dirPrefix)) {
          const rest = key.slice(dirPrefix.length)
          const top = rest.split("/")[0]
          if (top) entries.add(top)
        }
      }
      return [...entries]
    },

    unlink(p: string): boolean {
      return files.delete(normalize(p))
    },

    restore(): void {
      files.clear()
    },

    entries(): Map<string, string> {
      return files
    },
  }
}

// ---------------------------------------------------------------------------
// Typed event emitter mock
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EventHandler = (...args: any[]) => void

export interface MockEmitter<Events extends { [K in keyof Events]: EventHandler }> {
  on<E extends keyof Events>(event: E, handler: Events[E]): void
  off<E extends keyof Events>(event: E, handler: Events[E]): void
  emit<E extends keyof Events>(event: E, ...args: Parameters<Events[E]>): void
  listenerCount(event: keyof Events): number
  clearListeners(): void
}

/**
 * Create a typed event emitter mock for testing pub/sub interactions.
 *
 * ```ts
 * interface MyEvents { data: (payload: string) => void }
 * const emitter = createMockEmitter<MyEvents>()
 * emitter.on("data", (msg) => { ... })
 * emitter.emit("data", "hello")
 * ```
 */
export function createMockEmitter<Events extends { [K in keyof Events]: EventHandler }>(): MockEmitter<Events> {
  type Handler = (...args: unknown[]) => void
  const listeners = new Map<string, Set<Handler>>()

  return {
    on<E extends keyof Events>(event: E, handler: Events[E]): void {
      const key = event as string
      if (!listeners.has(key)) {
        listeners.set(key, new Set())
      }
      listeners.get(key)!.add(handler as Handler)
    },

    off<E extends keyof Events>(event: E, handler: Events[E]): void {
      const key = event as string
      listeners.get(key)?.delete(handler as Handler)
    },

    emit<E extends keyof Events>(event: E, ...args: Parameters<Events[E]>): void {
      const key = event as string
      listeners.get(key)?.forEach(h => h(...args))
    },

    listenerCount(event: keyof Events): number {
      return listeners.get(event as string)?.size ?? 0
    },

    clearListeners(): void {
      listeners.clear()
    },
  }
}

// ---------------------------------------------------------------------------
// Abort controller mock
// ---------------------------------------------------------------------------

export interface MockAbortController {
  readonly signal: {
    readonly aborted: boolean
    addEventListener(event: string, handler: () => void): void
    removeEventListener(event: string, handler: () => void): void
  }
  abort(): void
  reset(): void
  readonly aborted: boolean
  delay(ms: number): Promise<void>
  restore(): void
}

/**
 * Create a mock AbortController for testing cancellation flows.
 * - `abort()` sets `aborted = true` and fires listeners
 * - `reset()` clears state for reuse
 * - `delay(ms)` returns a promise (useful for timeout simulation)
 * - `restore()` is an alias for `reset()` for consistency with other mocks
 */
export function createMockAbortController(): MockAbortController {
  let _aborted = false
  const abortEventHandlers = new Set<() => void>()

  return {
    get signal() {
      return {
        get aborted() {
          return _aborted
        },
        addEventListener(_event: string, handler: () => void): void {
          if (_event === "abort") abortEventHandlers.add(handler)
        },
        removeEventListener(_event: string, handler: () => void): void {
          if (_event === "abort") abortEventHandlers.delete(handler)
        },
      }
    },

    abort(): void {
      _aborted = true
      abortEventHandlers.forEach(h => h())
    },

    reset(): void {
      _aborted = false
      abortEventHandlers.clear()
    },

    get aborted(): boolean {
      return _aborted
    },

    delay(ms: number): Promise<void> {
      return new Promise(resolve => setTimeout(resolve, ms))
    },

    restore(): void {
      _aborted = false
      abortEventHandlers.clear()
    },
  }
}
