import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { RecoveryHandler } from "./handler.ts";
import type { ErrorContext, RecoveryAction } from "./interfaces.ts";

/**
 * Helper to build an ErrorContext.
 */
function ctx(
  sessionId: string,
  message: string,
  attempt = 0,
  agent?: string,
): ErrorContext {
  return {
    sessionId,
    error: new Error(message),
    attempt,
    timestamp: Date.now(),
    agent,
  };
}

/**
 * Check that an action has the expected type & reason substring.
 */
function assertAction(
  action: RecoveryAction,
  type: string,
  reasonSubstring?: string,
): void {
  assert.equal(action.type, type, `expected type ${type}, got ${action.type}`);
  if (reasonSubstring) {
    assert.ok(
      action.reason.toLowerCase().includes(reasonSubstring.toLowerCase()),
      `expected reason to include "${reasonSubstring}", got "${action.reason}"`,
    );
  }
}

// ── Helpers ──────────────────────────────────────────────────────────

describe("RecoveryHandler — pattern classification", () => {
  let handler: RecoveryHandler;

  before(() => {
    handler = RecoveryHandler.getInstance();
    handler.reset();
  });

  after(() => {
    handler.reset();
  });

  // ── 9 category tests ─────────────────────────────────────────────

  it("classifies rate_limit errors → retry with backoff", () => {
    const action = handler.handleError(ctx("s1", "rate limit exceeded", 0));
    assertAction(action, "retry", "rate");
    assert.ok(action.delay! >= 1_000, `expected delay >= 1000, got ${action.delay}`);

    // Second attempt gets longer backoff
    const action2 = handler.handleError(ctx("s1", "429 Too Many Requests", 1));
    assertAction(action2, "retry", "rate");
    assert.ok(action2.delay! >= 2_000, `expected delay >= 2000, got ${action2.delay}`);
  });

  it("classifies context_overflow errors → compact", () => {
    const action = handler.handleError(ctx("s1", "context length exceeded", 0));
    assertAction(action, "compact", "context");
    assert.ok(action.modifyPrompt, "compact action should include modifyPrompt");
  });

  it("classifies network errors → retry with backoff", () => {
    const action = handler.handleError(ctx("s1", "ECONNREFUSED", 0));
    assertAction(action, "retry", "network");
    assert.ok(action.delay! >= 500, `expected delay >= 500, got ${action.delay}`);

    const action2 = handler.handleError(ctx("s1", "fetch failed", 1));
    assertAction(action2, "retry", "network");
  });

  it("classifies session errors → abort", () => {
    const action = handler.handleError(ctx("s1", "session not found", 0));
    assertAction(action, "abort", "session");
  });

  it("classifies tool_error → escalate", () => {
    const action = handler.handleError(ctx("s1", "unknown tool: foo", 0));
    assertAction(action, "escalate", "tool");
  });

  it("classifies parse_error → retry (max 2)", () => {
    const action = handler.handleError(ctx("s1", "parse error at line 42", 0));
    assertAction(action, "retry", "parse");
    assert.equal(action.maxAttempts, 2);
  });

  it("classifies gibberish (explicit) → retry with clean context", () => {
    // Gibberish pattern now matches "gibberish", "nonsens", keyboard mash,
    // and other low-quality output patterns in error messages.
    const action = handler.handleError(ctx("s1", "gibberish output detected", 0));
    assertAction(action, "retry", "gibberish");
    assert.ok(action.modifyPrompt, "gibberish action should include modifyPrompt");
  });

  it("classifies lsp_diagnostic → retry with diagnostic prompt", () => {
    const action = handler.handleError(ctx("s1", "tsc error: Type 'X' not assignable", 0));
    assertAction(action, "retry", "lsp");
    assert.ok(action.modifyPrompt, "lsp action should include modifyPrompt");
  });

  it("classifies timeout → retry with breakdown hint", () => {
    const action = handler.handleError(ctx("s1", "execution timed out", 0));
    assertAction(action, "retry", "timed out");
    assert.ok(action.modifyPrompt, "timeout action should include modifyPrompt");
    assert.equal(action.maxAttempts, 2);
  });

  // ── Unknown error → escalate ──────────────────────────────────────

  it("unknown error pattern → escalate", () => {
    const action = handler.handleError(ctx("s1", "some weird error nobody expected", 0));
    assertAction(action, "escalate", "unrecognized");
  });

  // ── Stats tracking ────────────────────────────────────────────────

  it("getStats() reflects classified errors", () => {
    handler.reset();

    handler.handleError(ctx("s1", "rate limit", 0));
    handler.handleError(ctx("s1", "ECONNREFUSED", 0));
    handler.handleError(ctx("s1", "context length", 0));
    handler.handleError(ctx("s1", "session not found", 0));
    handler.handleError(ctx("s1", "unknown tool", 0));
    handler.handleError(ctx("s1", "parse error", 0));

    const stats = handler.getStats();
    assert.equal(stats.totalRecoveries, 6);
    assert.equal(stats.byCategory.rate_limit, 1);
    assert.equal(stats.byCategory.network, 1);
    assert.equal(stats.byCategory.context_overflow, 1);
    assert.equal(stats.byCategory.session, 1);
    assert.equal(stats.byCategory.tool_error, 1);
    assert.equal(stats.byCategory.parse_error, 1);
    // Unclassified categories should be 0
    assert.equal(stats.byCategory.gibberish, 0);
    assert.equal(stats.byCategory.lsp_diagnostic, 0);
    assert.equal(stats.byCategory.timeout, 0);
  });

  it("getStats() tracks action types", () => {
    handler.reset();

    handler.handleError(ctx("s1", "rate limit", 0));       // retry
    handler.handleError(ctx("s1", "session expired", 0));  // abort
    handler.handleError(ctx("s1", "unknown tool", 0));     // escalate
    handler.handleError(ctx("s1", "context length", 0));   // compact

    const stats = handler.getStats();
    assert.equal(stats.byAction.retry, 1);
    assert.equal(stats.byAction.abort, 1);
    assert.equal(stats.byAction.escalate, 1);
    assert.equal(stats.byAction.compact, 1);
  });

  // ── getHistory ──────────────────────────────────────────────────

  it("getHistory() returns records most recent first", () => {
    handler.reset();

    handler.handleError(ctx("s2", "rate limit", 0));
    handler.handleError(ctx("s2", "timeout", 0));

    const history = handler.getHistory();
    assert.equal(history.length, 2);
    assert.ok(history[0].timestamp >= history[1].timestamp);
  });

  it("getHistory(limit) respects limit", () => {
    handler.reset();

    handler.handleError(ctx("s3", "rate limit", 0));
    handler.handleError(ctx("s3", "timeout", 0));
    handler.handleError(ctx("s3", "ECONNREFUSED", 0));

    const limited = handler.getHistory(2);
    assert.equal(limited.length, 2);
  });

  // ── clearSession ────────────────────────────────────────────────

  it("clearSession() removes records for a session", () => {
    handler.reset();

    handler.handleError(ctx("s_a", "rate limit", 0));
    handler.handleError(ctx("s_b", "timeout", 0));
    handler.handleError(ctx("s_a", "ECONNREFUSED", 0));

    assert.equal(handler.getHistory().length, 3);

    handler.clearSession("s_a");
    const remaining = handler.getHistory();
    assert.equal(remaining.length, 1);
    assert.equal(remaining[0].context.sessionId, "s_b");
  });
});

// ── withRecovery integration ──────────────────────────────────────────

describe("RecoveryHandler — withRecovery", () => {
  let handler: RecoveryHandler;

  before(() => {
    handler = RecoveryHandler.getInstance();
    handler.reset();
  });

  after(() => {
    handler.reset();
  });

  it("succeeds on first attempt", async () => {
    const result = await handler.withRecovery("wr1", async () => "hello");
    assert.equal(result, "hello");
  });

  it("retries on retryable error then succeeds", async () => {
    handler.reset();
    let callCount = 0;

    const result = await handler.withRecovery("wr2", async () => {
      callCount++;
      if (callCount === 1) throw new Error("parse error: invalid json");
      return "ok-after-retry";
    });

    assert.equal(result, "ok-after-retry");
    assert.equal(callCount, 2);
  });

  it("throws on abort action", async () => {
    handler.reset();

    await assert.rejects(
      handler.withRecovery("wr3", async () => {
        throw new Error("session not found");
      }),
      /session not found/,
    );
  });

  it("throws on escalate action", async () => {
    handler.reset();

    await assert.rejects(
      handler.withRecovery("wr4", async () => {
        throw new Error("unknown tool: foo");
      }),
      /unknown tool/,
    );
  });

  it("respects category maxAttempts and then throws", async () => {
    handler.reset();

    await assert.rejects(
      handler.withRecovery("wr5", async () => {
        throw new Error("parse error: bad json");
      }),
      /parse error/,
    );
  });

  it("respects global maxAttempts option", async () => {
    handler.reset();
    let callCount = 0;

    // Use an unrecognized error (will escalate on first try — so throw immediately).
    // Instead let's use a timeout pattern which has maxAttempts=2, but set global maxAttempts=1
    await assert.rejects(
      handler.withRecovery(
        "wr6",
        async () => {
          callCount++;
          throw new Error("execution timed out");
        },
        { maxAttempts: 1 },
      ),
    );
    // With maxAttempts=1, it should only be called once
    assert.equal(callCount, 1);
  });

  it("tracks success and failure in stats", async () => {
    handler.reset();

    // One success
    await handler.withRecovery("wr7", async () => "good");
    // One abort (failure)
    await assert.rejects(
      handler.withRecovery("wr7", async () => {
        throw new Error("session expired");
      }),
    );

    const stats = handler.getStats();
    assert.ok(stats.successRate > 0);
    assert.ok(stats.successRate < 1);
  });
});
