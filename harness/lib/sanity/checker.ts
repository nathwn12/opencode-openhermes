// ---------------------------------------------------------------------------
// Output Sanity Checker — detect LLM output degeneration patterns
// ---------------------------------------------------------------------------

import type { SanityResult } from "./interfaces.ts";
import { AnomalyTracker } from "./anomaly-tracker.ts";

/**
 * Check a text string for output degeneration patterns.
 * Returns unhealthy with severity + reason on first matching pattern.
 * Returns healthy if no pattern matches.
 *
 * Check ordering: all critical-severity checks first (most specific first),
 * then warning-severity checks. This ensures the most actionable, severe
 * issues are reported before mild ones.
 *
 * Accepts an optional AnomalyTracker for cross-invocation dedup detection.
 */
export function checkOutputSanity(
  text: unknown,
  anomalyTracker?: AnomalyTracker,
): SanityResult {
  if (typeof text !== "string") {
    return {
      isHealthy: false,
      severity: "critical",
      reason: "Output is not a string (possibly undefined/null)",
      patternName: "empty_output",
    };
  }
  if (text.length === 0) {
    return {
      isHealthy: false,
      severity: "warning",
      reason: "Output is an empty string",
      patternName: "empty_output",
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // CRITICAL checks — severe degeneration
  // ═══════════════════════════════════════════════════════════════════

  // ── 1. Single character repetition ──────────────────────────────
  // 16+ consecutive identical characters
  const singleCharMatch = text.match(/(.)\1{15,}/);
  if (singleCharMatch) {
    return {
      isHealthy: false,
      severity: "critical",
      reason: `Single character repetition detected: "${singleCharMatch[0].slice(0, 20)}..."`,
      patternName: "single_char_repetition",
    };
  }

  // ── 2. Short pattern loop ───────────────────────────────────────
  // 9+ repetitions of a 2-6 character sequence
  const patternLoopMatch = text.match(/(.{2,6})\1{8,}/);
  if (patternLoopMatch) {
    return {
      isHealthy: false,
      severity: "critical",
      reason: `Pattern loop detected: "${patternLoopMatch[0].slice(0, 30)}..."`,
      patternName: "pattern_loop",
    };
  }

  // ── 3. Excessive box/block drawing characters ───────────────────
  // Unicode box drawing, block elements, and Braille patterns
  const boxDrawChars = text.match(/[\u2500-\u257f\u2580-\u259f\u2800-\u28ff]/g);
  if (boxDrawChars && boxDrawChars.length > 100) {
    const ratio = boxDrawChars.length / text.length;
    if (ratio > 0.3) {
      return {
        isHealthy: false,
        severity: "critical",
        reason: `Visual gibberish detected: ${boxDrawChars.length} box/block chars (${(ratio * 100).toFixed(1)}% of output)`,
        patternName: "visual_gibberish",
      };
    }
  }

  // ── 4. CJK character spam ─────────────────────────────────────
  // Lots of CJK characters with very few unique ones
  const cjkChars = text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g);
  if (cjkChars && cjkChars.length > 200) {
    const uniqueCjk = new Set(cjkChars).size;
    if (uniqueCjk < 10 && cjkChars.length / uniqueCjk > 20) {
      return {
        isHealthy: false,
        severity: "critical",
        reason: `CJK character spam detected: ${cjkChars.length} chars, ${uniqueCjk} unique (ratio ${(cjkChars.length / uniqueCjk).toFixed(0)})`,
        patternName: "cjk_spam",
      };
    }
  }

  // ── 5. Low character diversity ────────────────────────────────
  // General catch-all for text with very few distinct characters
  if (text.length > 200) {
    const cleanText = text.replace(/\s/g, "");
    if (cleanText.length > 0) {
      const uniqueChars = new Set(cleanText).size;
      const diversity = uniqueChars / cleanText.length;
      if (diversity < 0.02) {
        return {
          isHealthy: false,
          severity: "critical",
          reason: `Low information density: ${uniqueChars} unique chars out of ${cleanText.length} (ratio ${diversity.toFixed(4)} < 0.02)`,
          patternName: "low_diversity",
        };
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // WARNING checks — mild or context-dependent issues
  // ═══════════════════════════════════════════════════════════════════

  // ── 6. Excessive JSON/error stack lines ─────────────────────────
  const lines = text.split(/\r?\n/);
  let errorStackLineCount = 0;
  const repetitionLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (line.includes("Error:") || trimmed.startsWith("at ") || line.includes("Exception:")) {
      errorStackLineCount++;
    }

    if (trimmed.length > 10) {
      repetitionLines.push(line);
    }
  }

  if (errorStackLineCount > 5) {
    return {
      isHealthy: false,
      severity: "warning",
      reason: `Error stack bleed detected: ${errorStackLineCount} error/stack lines`,
      patternName: "error_stack_bleed",
    };
  }

  // ── 7. Line-by-line repetition ──────────────────────────────────
  if (repetitionLines.length > 10) {
    const uniqueLines = new Set(repetitionLines);
    if (uniqueLines.size < repetitionLines.length * 0.2) {
      return {
        isHealthy: false,
        severity: "warning",
        reason: `Excessive line repetition: ${uniqueLines.size} unique lines out of ${repetitionLines.length} (${(uniqueLines.size / repetitionLines.length * 100).toFixed(0)}% unique)`,
        patternName: "line_repetition",
      };
    }
  }

  // ── 8. Empty/tiny output ────────────────────────────────────────
  // Only flag if the entire output is small enough to be suspicious
  // (exclude common status messages like "ok", "done")
  if (text.length < 50 && text.length > 0) {
    const minimalWords = ["ok", "done", "yes", "no", "passed", "failed", "error", "null", "undefined", "true", "false"];
    const trimmed = text.trim().toLowerCase();
    if (!minimalWords.includes(trimmed) && !/^[\d.]+$/.test(trimmed)) {
      return {
        isHealthy: false,
        severity: "warning",
        reason: `Output too short: ${text.length} characters`,
        patternName: "output_too_short",
      };
    }
  }

  // ── 9. Cross-invocation dedup check ────────────────────────────────
  if (anomalyTracker) {
    const isRepeated = anomalyTracker.trackOutput(text);
    if (isRepeated) {
      return {
        isHealthy: false,
        severity: "warning",
        reason: `Output identical to previous ${anomalyTracker.MAX_IDENTICAL_OUTPUTS} invocations`,
        patternName: "repeated_identical_output",
      };
    }
  }

  // No pattern matched — healthy
  return { isHealthy: true, severity: "ok" };
}
