// ---------------------------------------------------------------------------
// Test Harness — barrel export
// ---------------------------------------------------------------------------

// NOTE: Both fixture.ts and mocks.ts export a function named "createMockFs"
// but with different signatures (fixture creates real files, mocks returns
// an in-memory FS object). We disambiguate with aliases here.

export {
  tmpdir,
  tmpdirSync,
  createMockFs as createMockFsOnDisk,
  waitFor,
  DirHandle,
  DirHandleSync,
} from "./fixture.ts"

export * from "./builders.ts"

export {
  mockConsole,
  mockProcessExit,
  createMockEmitter,
  createMockAbortController,
  createMockFs as createInMemoryFs,
} from "./mocks.ts"
