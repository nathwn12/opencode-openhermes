// ---------------------------------------------------------------------------
// Sanity Checker — tests
// ---------------------------------------------------------------------------

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { checkOutputSanity } from "./checker.ts";
import { AnomalyTracker } from "./anomaly-tracker.ts";
import type { SanityResult } from "./interfaces.ts";

// ── Helper ────────────────────────────────────────────────────────────

function assertHealthy(result: SanityResult, msg?: string): void {
  assert.ok(result.isHealthy, msg ?? `Expected healthy, got: ${result.reason}`);
  assert.equal(result.severity, "ok");
}

function assertUnhealthy(
  result: SanityResult,
  expectedSeverity: "warning" | "critical",
  expectedPattern?: string,
  msg?: string,
): void {
  assert.equal(result.isHealthy, false, msg ?? "Expected unhealthy");
  assert.equal(
    result.severity,
    expectedSeverity,
    msg ?? `Expected severity ${expectedSeverity}, got ${result.severity}`,
  );
  if (expectedPattern) {
    assert.equal(
      result.patternName,
      expectedPattern,
      msg ?? `Expected pattern ${expectedPattern}, got ${result.patternName}`,
    );
  }
}

// ── Tests ──────────────────────────────────────────────────────────────

describe("checkOutputSanity — detection patterns", () => {
  // ── 1. Single character repetition ────────────────────────────────

  it("detects single character repetition (16+ same chars)", () => {
    const result = checkOutputSanity(
      "Leading text " + "a".repeat(20) + " trailing text to exceed 50 chars total and avoid short output detection",
    );
    assertUnhealthy(result, "critical", "single_char_repetition");
  });

  it("allows short character repetition (< 16)", () => {
    // At least 50 chars to avoid short-output warning
    const text =
      "This line has " +
      "a".repeat(15) +
      " but not 16+ same chars, so it should definitely pass this check fine.";
    assert.ok(
      text.length >= 50,
      `Test string must be >= 50 chars (was ${text.length})`,
    );
    const result = checkOutputSanity(text);
    assertHealthy(result);
  });

  it("detects repeated spaces", () => {
    const text =
      "hello" +
      " ".repeat(20) +
      "world and some more text here to make the string exceed 50 chars in total so we avoid the short check";
    const result = checkOutputSanity(text);
    assertUnhealthy(result, "critical", "single_char_repetition");
  });

  // ── 2. Short pattern loop ─────────────────────────────────────────

  it("detects short pattern loop (9+ repeats)", () => {
    const result = checkOutputSanity(
      "prefix " + "ab".repeat(12) + " suffix that brings total well past 50 characters to avoid short output detection",
    );
    assertUnhealthy(result, "critical", "pattern_loop");
  });

  it("allows short repetitions (< 9)", () => {
    // 8 of each letter = 8*7 = 56 chars, no single-char run >= 16
    const text = "A".repeat(8) + "B".repeat(8) + "C".repeat(8) + "D".repeat(8) + "E".repeat(8) + "F".repeat(8) + "G".repeat(8);
    assert.ok(text.length >= 50, `Test string must be >= 50 chars (was ${text.length})`);
    const result = checkOutputSanity(text);
    assertHealthy(result);
  });

  it("detects longer pattern loop", () => {
    const result = checkOutputSanity(
      "start " + "hello".repeat(10) + " end with more text to exceed 50 character limit for short detection sure",
    );
    assertUnhealthy(result, "critical", "pattern_loop");
  });

  // ── 3. Low character diversity ────────────────────────────────────

  it("detects low character diversity", () => {
    // 600 chars with only 10 unique chars, no pattern loop (10-char pattern doesn't match 2-6)
    const text = "abcdefghij".repeat(60);
    const result = checkOutputSanity(text);
    assertUnhealthy(result, "critical", "low_diversity");
  });

  it("allows diverse text", () => {
    const text =
      "The quick brown fox jumps over the lazy dog. This sentence contains every letter of the alphabet at least once. ".repeat(
        5,
      );
    const result = checkOutputSanity(text);
    assertHealthy(result);
  });

  it("does not flag short text (< 200 chars)", () => {
    const text = "ab".repeat(99); // 198 chars, just under 200
    assert.ok(text.length < 200, `Text must be < 200 chars (was ${text.length})`);
    const result = checkOutputSanity(text);
    // Should not have low_diversity pattern
    assert.ok(result.isHealthy || result.patternName !== "low_diversity");
  });

  // ── 4. Visual gibberish / box drawing ─────────────────────────────

  it("detects excessive box drawing characters", () => {
    // Pure box art should match visual_gibberish (comes before low_diversity)
    const boxArt = "┌─┐│└─┘├─┤┬┴┼".repeat(50);
    const result = checkOutputSanity(boxArt);
    assertUnhealthy(result, "critical", "visual_gibberish");
  });

  it("does not flag moderate box drawing in context", () => {
    // Must be > 50 chars and not > 100 box chars with > 30% ratio
    const text =
      "┌───┐\n│   │\n└───┘\n" +
      "Here is a simple diagram frame with plenty of surrounding context text " +
      "that makes this string exceed 50 characters and avoids any pattern detection.";
    assert.ok(text.length >= 50, `Test string must be >= 50 chars (was ${text.length})`);
    const result = checkOutputSanity(text);
    assertHealthy(result);
  });

  // ── 5. CJK character spam ────────────────────────────────────────

  it("detects CJK character spam", () => {
    // Use a 10-char CJK string (avoids 2-6 char pattern loop) repeated
    const cjkSpam = "天地玄黄宇宙洪荒日".repeat(40); // 400 CJK chars, 10 unique
    const result = checkOutputSanity(cjkSpam);
    assertUnhealthy(result, "critical", "cjk_spam");
  });

  it("allows legitimate CJK text", () => {
    const cjkText = "这是一个正常的句子。它有各种各样的字符和不同的表达方式。".repeat(5);
    const result = checkOutputSanity(cjkText);
    assertHealthy(result);
  });

  // ── 6. Empty/tiny output ──────────────────────────────────────────

  it("flags suspicious short output", () => {
    const result = checkOutputSanity("x");
    assertUnhealthy(result, "warning", "output_too_short");
  });

  it("allows single-word status output", () => {
    assertHealthy(checkOutputSanity("ok"));
    assertHealthy(checkOutputSanity("done"));
    assertHealthy(checkOutputSanity("passed"));
    assertHealthy(checkOutputSanity("true"));
  });

  it("allows numeric output", () => {
    assertHealthy(checkOutputSanity("42"));
    assertHealthy(checkOutputSanity("3.14159"));
  });

  // ── 7. Error stack bleed ──────────────────────────────────────────

  it("detects excessive error stack lines", () => {
    const errorStack = [
      "Error: something went wrong",
      "    at Object.<anonymous> (file.ts:10:5)",
      "    at Module._compile (module.js:653:30)",
      "    at Object.Module._extensions (module.js:664:10)",
      "    at Module.load (module.js:566:32)",
      "    at tryModuleLoad (module.js:506:12)",
    ].join("\n");
    assert.ok(errorStack.length >= 50, `Test string must be >= 50 chars (was ${errorStack.length})`);
    const result = checkOutputSanity(errorStack);
    assertUnhealthy(result, "warning", "error_stack_bleed");
  });

  it("allows normal error mentions", () => {
    const text =
      "We got an Error: not found, but handled it gracefully with fallback logic " +
      "that continues execution without any problems whatsoever.";
    const result = checkOutputSanity(text);
    assertHealthy(result);
  });

  // ── 8. Line-by-line repetition ────────────────────────────────────

  it("detects excessive line repetition", () => {
    // Use a line with many unique characters to avoid low_diversity
    const line =
      "Sphinx of black quartz, judge my vow! The five boxing wizards jump quickly. 0123456789 ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const repeatedLines = Array.from({ length: 20 }, () => line).join("\n");
    const result = checkOutputSanity(repeatedLines);
    assertUnhealthy(result, "warning", "line_repetition");
  });

  it("allows normal line variation", () => {
    const normalLines = [
      "First line of unique content here for the test case.",
      "Second line is different from all the rest.",
      "Third line is also unique in its own way.",
      "Fourth line continues the thought process forward.",
      "Fifth line wraps up the opening section nicely.",
      "Sixth line adds more context to the discussion.",
      "Seventh line explores new ideas and concepts.",
      "Eighth line approaches the question differently.",
      "Ninth line concludes the main arguments well.",
      "Tenth line is the final summary statement.",
      "Eleventh line surprises everyone with extra depth.",
      "Twelfth line brings the total to a solid dozen.",
    ].join("\n");
    const result = checkOutputSanity(normalLines);
    assertHealthy(result);
  });

  // ── Mixed / edge cases ───────────────────────────────────────────

  it("returns healthy for normal prose", () => {
    const prose =
      "This is a normal paragraph of text that should pass all sanity checks. " +
      "It contains varied characters and meaningful content. The quick brown fox jumps over the lazy dog. " +
      "No patterns of degeneration should be detected here.";
    assertHealthy(checkOutputSanity(prose));
  });

  it("handles empty string gracefully", () => {
    const result = checkOutputSanity("");
    assertHealthy(result);
  });

  it("handles null/undefined gracefully", () => {
    assertHealthy(checkOutputSanity(null as unknown as string));
    assertHealthy(checkOutputSanity(undefined as unknown as string));
  });

  it("detects multiple patterns (first match wins)", () => {
    // Text with both pattern loop and low diversity — should report pattern_loop first
    const degenerate = "ab".repeat(50) + " extra unique text that varies the output so it stays above fifty characters";
    const result = checkOutputSanity(degenerate);
    assertUnhealthy(result, "critical");
    // Pattern loop should win since it comes first
    assert.equal(result.patternName, "pattern_loop");
  });
});

// ── AnomalyTracker tests ──────────────────────────────────────────────

describe("AnomalyTracker", () => {
  let tracker: AnomalyTracker;

  before(() => {
    tracker = AnomalyTracker.getInstance();
    tracker.resetAll();
  });

  after(() => {
    tracker.resetAll();
  });

  // ── Recording ────────────────────────────────────────────────────

  it("records healthy output — resets counter", () => {
    const healthy: SanityResult = { isHealthy: true, severity: "ok" };
    const result = tracker.record("s1", healthy);
    assert.equal(result.shouldEscalate, false);
    assert.equal(result.consecutiveAnomalies, 0);
  });

  it("records single anomaly — no escalation", () => {
    tracker.resetAll();
    const unhealthy: SanityResult = {
      isHealthy: false,
      severity: "critical",
      reason: "Single character repetition",
      patternName: "single_char_repetition",
    };

    const result = tracker.record("s2", unhealthy);
    assert.equal(result.shouldEscalate, false);
    assert.equal(result.consecutiveAnomalies, 1);
  });

  it("triggers escalation on 2+ consecutive anomalies", () => {
    tracker.resetAll();
    const unhealthy: SanityResult = {
      isHealthy: false,
      severity: "critical",
      reason: "Pattern loop detected",
      patternName: "pattern_loop",
    };

    // First anomaly — no escalation
    const first = tracker.record("s3", unhealthy);
    assert.equal(first.shouldEscalate, false);
    assert.equal(first.consecutiveAnomalies, 1);

    // Second consecutive anomaly — escalation
    const second = tracker.record("s3", unhealthy);
    assert.equal(second.shouldEscalate, true);
    assert.equal(second.consecutiveAnomalies, 2);
    assert.ok(second.recoveryMessage, "recovery message should be present");
    assert.equal(second.recoveryMessage, "recovery: compact context");
  });

  it("resets counter on healthy output between anomalies", () => {
    tracker.resetAll();
    const unhealthy: SanityResult = {
      isHealthy: false,
      severity: "warning",
      reason: "Output too short",
      patternName: "output_too_short",
    };
    const healthy: SanityResult = { isHealthy: true, severity: "ok" };

    tracker.record("s4", unhealthy); // count=1
    tracker.record("s4", healthy); // reset to 0
    const result = tracker.record("s4", unhealthy); // count=1 again
    assert.equal(result.shouldEscalate, false);
    assert.equal(result.consecutiveAnomalies, 1);
  });

  it("persists 3+ consecutive anomalies", () => {
    tracker.resetAll();
    const unhealthy: SanityResult = {
      isHealthy: false,
      severity: "warning",
      reason: "Error stack bleed",
      patternName: "error_stack_bleed",
    };

    tracker.record("s5", unhealthy); // 1
    tracker.record("s5", unhealthy); // 2 → escalation
    const third = tracker.record("s5", unhealthy); // 3 → escalation
    assert.equal(third.shouldEscalate, true);
    assert.equal(third.consecutiveAnomalies, 3);
  });

  // ── getRecord ────────────────────────────────────────────────────

  it("getRecord() returns record for existing session", () => {
    tracker.resetAll();
    const unhealthy: SanityResult = {
      isHealthy: false,
      severity: "critical",
      reason: "Low info density",
      patternName: "low_diversity",
    };
    tracker.record("s6", unhealthy);

    const record = tracker.getRecord("s6");
    assert.ok(record);
    assert.equal(record.count, 1);
    assert.equal(record.lastReason, "Low info density");
  });

  it("getRecord() returns undefined for unknown session", () => {
    const record = tracker.getRecord("nonexistent");
    assert.equal(record, undefined);
  });

  // ── clearSession ──────────────────────────────────────────────────

  it("clearSession() removes record for a session", () => {
    tracker.resetAll();
    const unhealthy: SanityResult = {
      isHealthy: false,
      severity: "critical",
      reason: "Pattern loop",
      patternName: "pattern_loop",
    };

    tracker.record("s7", unhealthy);
    assert.ok(tracker.getRecord("s7"));

    tracker.clearSession("s7");
    assert.equal(tracker.getRecord("s7"), undefined);
  });

  it("clearSession() does not affect other sessions", () => {
    tracker.resetAll();
    const unhealthy: SanityResult = {
      isHealthy: false,
      severity: "critical",
      reason: "Test",
      patternName: "single_char_repetition",
    };

    tracker.record("s8_a", unhealthy);
    tracker.record("s8_b", unhealthy);

    tracker.clearSession("s8_a");
    assert.equal(tracker.getRecord("s8_a"), undefined);
    assert.ok(tracker.getRecord("s8_b"));
  });

  // ── resetAll ─────────────────────────────────────────────────────

  it("resetAll() clears all records", () => {
    const unhealthy: SanityResult = {
      isHealthy: false,
      severity: "critical",
      reason: "Test",
      patternName: "single_char_repetition",
    };

    tracker.record("s9", unhealthy);
    tracker.resetAll();
    assert.equal(tracker.getRecord("s9"), undefined);
  });

  // ── config ────────────────────────────────────────────────────────

  it("uses configurable maxConsecutiveAnomalies", () => {
    tracker.resetAll();
    tracker.setConfig({ maxConsecutiveAnomalies: 3 });

    const unhealthy: SanityResult = {
      isHealthy: false,
      severity: "warning",
      reason: "Test threshold",
      patternName: "output_too_short",
    };

    const first = tracker.record("s10", unhealthy); // 1
    assert.equal(first.shouldEscalate, false);

    const second = tracker.record("s10", unhealthy); // 2
    assert.equal(second.shouldEscalate, false);

    const third = tracker.record("s10", unhealthy); // 3 → escalation
    assert.equal(third.shouldEscalate, true);

    // Restore default
    tracker.setConfig({ maxConsecutiveAnomalies: 2 });
  });

  it("uses configurable escalationMessage", () => {
    tracker.resetAll();
    tracker.setConfig({ escalationMessage: "custom recovery action: deep reset" });

    const unhealthy: SanityResult = {
      isHealthy: false,
      severity: "critical",
      reason: "Test message",
      patternName: "pattern_loop",
    };

    tracker.record("s11", unhealthy); // 1
    const result = tracker.record("s11", unhealthy); // 2 → escalation
    assert.equal(result.recoveryMessage, "custom recovery action: deep reset");

    tracker.setConfig({ escalationMessage: "recovery: compact context" }); // restore
  });
});
