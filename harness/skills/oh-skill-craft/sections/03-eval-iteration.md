# Eval-Driven Iteration

After drafting a skill, iterate with evidence — not guessing. Test prompts should be substantive multi-step tasks that mirror real usage. The model handles simple tasks without a skill — evals reveal whether the skill pulls its weight on hard cases.

## 6-Step Loop

### 1. Create Test Cases

Write 2-3 realistic multi-step prompts that mirror real usage. Save to `evals/evals.json`:

```json
{
  "skill_name": "oh-<name>",
  "evals": [
    {
      "id": 1,
      "prompt": "Realistic multi-step task the skill should handle",
      "expected_output": "Concrete expected result description",
      "files": []
    }
  ]
}
```

### 2. Spawn Runs

Launch parallel subagents: **with-skill** (load the skill, execute prompt) vs **baseline** (no skill loaded, or previous version). Use the same prompt for both.

Save outputs to:
- `iteration-N/eval-ID/with_skill/`
- `iteration-N/eval-ID/baseline/`

### 3. Draft Assertions

While runs execute, draft objectively verifiable assertions for each test case. Good assertions:
- Have descriptive names
- Can be checked programmatically (output contains X, file Y was created, step Z was followed)
- Update `evals/evals.json` with these assertions

### 4. Grade

Aggregate results per assertion:
- **Pass rates** — Which assertions pass/fail with vs without the skill
- **Timing** — How long each run takes
- **Token usage** — Cost comparison

Look for:
- **Non-discriminating** assertions — always pass regardless of skill → remove them (they add noise)
- **High-variance** results — possibly flaky tests → investigate
- **Time/token tradeoffs** — does the skill justify its cost in latency and tokens?

### 5. Improve

Revise the skill based on failures. Important rules:
- **Generalize** from specific failure patterns — don't overfit to 2-3 test cases
- The goal is a skill that works across a million prompts, not just your test set
- Keep instructions lean — every word should earn its place

### 6. Loop

Rerun all tests into a new iteration directory. Repeat until one of:
- User is satisfied
- All feedback is positive
- No meaningful progress between iterations
