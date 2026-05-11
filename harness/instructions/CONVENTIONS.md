# OpenHermes — Coding Conventions & Operational Guidelines

OpenHermes coding conventions and operational guidelines. Shared baseline for all subagents and skills.

## Security Guidelines (CRITICAL)

### Mandatory Pre-Commit Checks

- [ ] No hardcoded secrets (API keys, passwords, tokens)
- [ ] All user inputs validated
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (sanitized output)
- [ ] CSRF protection enabled
- [ ] Authentication/authorization verified
- [ ] Rate limiting on all endpoints
- [ ] Error messages don't leak sensitive data

### Secret Management

```typescript
// NEVER: Hardcoded secrets
const apiKey = "sk-proj-xxxxx"

// ALWAYS: Environment variables
const apiKey = process.env.OPENAI_API_KEY
if (!apiKey) throw new Error('OPENAI_API_KEY not configured')
```

### Security Response Protocol

If security issue found:
1. STOP immediately
2. Use `security-reviewer` subagent
3. Fix CRITICAL issues before continuing
4. Rotate any exposed secrets
5. Review entire codebase for similar issues

---

## Coding Style

### Immutability (CRITICAL)

ALWAYS create new objects, NEVER mutate:

```javascript
// WRONG: Mutation
function updateUser(user, name) {
  user.name = name; return user
}

// CORRECT: Immutability
function updateUser(user, name) {
  return { ...user, name }
}
```

### File Organization

MANY SMALL FILES > FEW LARGE FILES:
- High cohesion, low coupling
- 200-400 lines typical, 800 max
- Extract utilities from large components
- Organize by feature/domain, not by type

### Error Handling

```typescript
try {
  const result = await riskyOperation()
  return result
} catch (error) {
  console.error('Operation failed:', error)
  throw new Error('Detailed user-friendly message')
}
```

### Input Validation

```typescript
import { z } from 'zod'
const schema = z.object({
  email: z.string().email(),
  age: z.number().int().min(0).max(150)
})
const validated = schema.parse(input)
```

### Code Quality Checklist

Before marking work complete:
- [ ] Code is readable and well-named
- [ ] Functions are small (<50 lines)
- [ ] Files are focused (<800 lines)
- [ ] No deep nesting (>4 levels)
- [ ] Proper error handling
- [ ] No console.log statements
- [ ] No hardcoded values
- [ ] No mutation (immutable patterns used)

---

## Testing Requirements

### Minimum Test Coverage: 80%

Test Types (ALL required):
1. **Unit Tests** — Individual functions, utilities, components
2. **Integration Tests** — API endpoints, database operations
3. **E2E Tests** — Critical user flows (Playwright)

### TDD Workflow

MANDATORY workflow:
1. Write test first (RED)
2. Run test — it should FAIL
3. Write minimal implementation (GREEN)
4. Run test — it should PASS
5. Refactor (IMPROVE)
6. Verify coverage (80%+)

---

## Subagent Orchestration

| Subagent | Purpose | When to Use |
|----------|---------|-------------|
| planner | Implementation planning | Complex features, refactoring |
| architect | System design | Architectural decisions |
| tdd-guide | Test-driven development | New features, bug fixes |
| code-reviewer | Code review | After writing code |
| security-reviewer | Security analysis | Before commits |
| build-error-resolver | Fix build errors | When build fails |
| e2e-runner | E2E testing | Critical user flows |
| refactor-cleaner | Dead code cleanup | Code maintenance |
| doc-updater | Documentation | Updating docs |
| docs-lookup | Live doc queries | API questions |
| review-go | Go code review | Go projects |
| build-go | Go build errors | Go build failures |
| review-database | Database optimization | SQL, schema design |
| review-rust | Rust code review | Rust projects |
| build-rust | Rust build errors | Rust build failures |
| review-python | Python code review | Python projects |
| review-java | Java/Spring review | Java projects |
| build-java | Java build errors | Java build failures |
| review-kotlin | Kotlin/Android review | Kotlin projects |
| build-kotlin | Kotlin build errors | Kotlin build failures |
| review-cpp | C++ review | C++ projects |
| build-cpp | C++ build errors | C++ build failures |
| loop-operator | Autonomous loops | Iterative workflows |

### Immediate Subagent Usage

No user prompt needed:
1. Complex feature requests — Use `planner`
2. Code just written/modified — Use `code-reviewer`
3. Bug fix or new feature — Use `tdd-guide`
4. Architectural decision — Use `architect`

---

## Performance

### Model Selection Strategy

**Haiku** (lightweight): deterministic changes, simple code gen, worker agents
**Sonnet** (default): main development, multi-agent orchestration, complex coding
**Opus** (deep reasoning): architecture decisions, security review, ambiguous requirements

### Context Window Management

Avoid last 20% of context window for:
- Large-scale refactoring
- Feature implementation spanning multiple files
- Debugging complex interactions

---

## Git Workflow

### Commit Message Format

```
<type>: <description>
```

Types: feat, fix, refactor, docs, test, chore, perf, ci

### Feature Implementation Workflow

1. **Plan** — Use `planner` to create plan with risks and phases
2. **TDD** — Use `tdd-guide` for red-green-refactor cycle
3. **Code Review** — Use `code-reviewer` immediately after writing
4. **Security** — Use `security-reviewer` before commits
5. **Commit** — Follow conventional commits format

---

## Success Metrics

You are successful when:
- All tests pass (80%+ coverage)
- No security vulnerabilities
- Code is readable and maintainable
- Performance is acceptable
- User requirements are met
