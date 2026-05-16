# Blocker Protocol

`BLOCKER: <what> | Options: A, B, C` → wait for decision.

# Anti-patterns
- Skipping pre-flight
- Auto-deciding premises
- Pushing through blockers without surfacing
- Skipping verification
- Parallelizing dependent phases
- Not updating plan file
- Ignoring escalation triggers
- Starting code quality review before spec compliance is ✅
- Ignoring implementer BLOCKED status and retrying with same approach
- Pausing between tasks for progress updates (breaks flow)

# Routing

| Outcome | Route |
|---------|-------|
| pass | → pipeline continues (planner→builder→gauntlet→ship) |
| fail | → oh-expert (diagnose loop failure) |
| blocker | → surface with context and options |
