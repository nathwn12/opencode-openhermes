import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { consumeRouteGuidance, parseSkillFrontmatter, resolveRoute } from "./index.ts";

describe("routing frontmatter", () => {
  it("parses scalar route values", () => {
    const parsed = parseSkillFrontmatter(`---
name: oh-test
route:
  pass: oh-builder
  fail: oh-review
  blocker: surface
---`);

    assert.ok(parsed);
    assert.deepEqual(parsed.route, {
      pass: ["oh-builder"],
      fail: ["oh-review"],
      blocker: ["surface"],
    });
  });

  it("parses yaml route lists", () => {
    const parsed = parseSkillFrontmatter(`---
name: oh-test
route:
  pass:
    - oh-gauntlet
    - oh-ship
  fail:
    - oh-builder
  blocker: surface
---`);

    assert.ok(parsed);
    assert.deepEqual(parsed.route, {
      pass: ["oh-gauntlet", "oh-ship"],
      fail: ["oh-builder"],
      blocker: ["surface"],
    });
  });

  it("parses inline route arrays", () => {
    const parsed = parseSkillFrontmatter(`---
name: oh-test
route:
  pass: [oh-gauntlet, oh-ship]
  fail: [surface, oh-expert]
  blocker: surface
---`);

    assert.ok(parsed);
    assert.deepEqual(parsed.route, {
      pass: ["oh-gauntlet", "oh-ship"],
      fail: ["surface", "oh-expert"],
      blocker: ["surface"],
    });
  });
});

describe("resolveRoute", () => {
  const route = {
    pass: ["oh-gauntlet", "oh-ship"],
    fail: ["oh-builder"],
    blocker: ["surface"],
  };

  it("defaults to the first candidate for an outcome", () => {
    const resolved = resolveRoute(route, { outcome: "pass" });
    assert.deepEqual(resolved, {
      outcome: "pass",
      candidates: ["oh-gauntlet", "oh-ship"],
      selected: "oh-gauntlet",
      reason: 'Selected first declared route for outcome "pass".',
    });
  });

  it("prefers an evidence target when it matches a candidate", () => {
    const resolved = resolveRoute(route, { outcome: "pass", target: "oh-ship" });
    assert.deepEqual(resolved, {
      outcome: "pass",
      candidates: ["oh-gauntlet", "oh-ship"],
      selected: "oh-ship",
      reason: 'Selected "oh-ship" from output evidence.',
    });
  });

  it("prefers oh-ship for verified done ship work", () => {
    const resolved = resolveRoute(route, {
      outcome: "pass",
      verification: "verified",
      action: "done",
      work: "ship",
    });

    assert.deepEqual(resolved, {
      outcome: "pass",
      verification: "verified",
      action: "done",
      work: "ship",
      candidates: ["oh-gauntlet", "oh-ship"],
      selected: "oh-ship",
      reason: 'Selected "oh-ship" for verified ship-ready work.',
    });
  });

  it("prefers oh-gauntlet for unverified work", () => {
    const resolved = resolveRoute(route, {
      outcome: "pass",
      verification: "unverified",
      action: "done",
      work: "ship",
    });

    assert.deepEqual(resolved, {
      outcome: "pass",
      verification: "unverified",
      action: "done",
      work: "ship",
      candidates: ["oh-gauntlet", "oh-ship"],
      selected: "oh-gauntlet",
      reason: 'Selected "oh-gauntlet" because work is still unverified.',
    });
  });

  it("prefers oh-gauntlet for verify work", () => {
    const resolved = resolveRoute(route, {
      outcome: "pass",
      verification: "verified",
      action: "done",
      work: "verify",
    });

    assert.deepEqual(resolved, {
      outcome: "pass",
      verification: "verified",
      action: "done",
      work: "verify",
      candidates: ["oh-gauntlet", "oh-ship"],
      selected: "oh-gauntlet",
      reason: 'Selected "oh-gauntlet" for verification work.',
    });
  });

  it("prefers oh-builder for fixable implementation work", () => {
    const resolved = resolveRoute({
      pass: ["oh-gauntlet", "oh-ship", "oh-builder"],
      fail: ["oh-builder"],
      blocker: ["surface"],
    }, {
      outcome: "pass",
      verification: "verified",
      action: "fixable",
      work: "implement",
    });

    assert.deepEqual(resolved, {
      outcome: "pass",
      verification: "verified",
      action: "fixable",
      work: "implement",
      candidates: ["oh-gauntlet", "oh-ship", "oh-builder"],
      selected: "oh-builder",
      reason: 'Selected "oh-builder" for fixable implementation work.',
    });
  });
});

describe("consumeRouteGuidance", () => {
  it("promotes a selected route into an explicit next-route instruction", () => {
    const consumed = consumeRouteGuidance([
      "Review complete",
      'ROUTE_GUIDANCE: {"outcome":"pass","candidates":["oh-gauntlet","oh-ship"],"selected":"oh-ship","reason":"Selected \\\"oh-ship\\\" from output evidence."}',
    ].join("\n"));

    assert.equal(consumed.selected, "oh-ship");
    assert.match(consumed.output, /NEXT_ROUTE: oh-ship/);
  });

  it("leaves output unchanged when no route guidance is present", () => {
    const output = "plain output";
    const consumed = consumeRouteGuidance(output);

    assert.equal(consumed.selected, null);
    assert.equal(consumed.output, output);
  });

  it("ignores malformed route guidance safely", () => {
    const output = 'Review complete\nROUTE_GUIDANCE: {"selected":42}';
    const consumed = consumeRouteGuidance(output);

    assert.equal(consumed.selected, null);
    assert.equal(consumed.output, output);
  });
});
