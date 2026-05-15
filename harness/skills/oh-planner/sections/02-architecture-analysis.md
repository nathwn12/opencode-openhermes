# Mode B: Architecture Analysis (existing codebase)

Use when the codebase feels messy or you need to understand the surface before planning.

## Process

1. **Read domain** — Load `CONTEXT.md` (or equivalent domain doc). Understand the language, concepts, and shared terms before touching code. Domain-blind analysis produces wrong recommendations.

2. **Map the surface** — Identify:
   - Module boundaries and responsibilities
   - Dependency direction (who depends on whom)
   - Public API surfaces vs internal implementation
   - Configuration and extension points

3. **Find deepening opportunities** — Look for:
   - Duplication (same logic, different locations)
   - Over-coupling (modules that know too much about each other)
   - Grown-beyond-purpose (files/modules that started small but accumulated responsibilities)
   - Dead code or unused abstractions
   - Inconsistent patterns (same concern handled differently in different places)

4. **Rank by impact** — For each finding, assess:
   - **Effort** — how much work to fix
   - **Value** — what improves (maintainability, performance, bug reduction)
   - **Dependencies** — does fixing X unblock or require fixing Y first?
   - **Risk** — what could break?

## Output

Ranked list of refactoring candidates with effort/value/risk assessment. Each candidate includes: location, problem description, recommended change, and estimated effort.
