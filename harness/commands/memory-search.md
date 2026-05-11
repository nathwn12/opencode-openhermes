---
description: Search openhermes memory with LLM summarization
agent: OpenHermes
subtask: true
---

# Memory Search Command

Search openhermes memory for: $ARGUMENTS

## Your Task

1. Call `search_memory` with query="$ARGUMENTS" to get raw results
2. Summarize the top 5 results with natural language interpretation
3. Highlight patterns, recurring themes, and actionable insights
4. Return a structured report

## Report Format

### Search: "$ARGUMENTS"

**Top results** (by relevance score):

| # | Class | Summary | Score |
|---|-------|---------|-------|

### Key Patterns

[Extract 2-3 patterns from the results]

### Actionable Insights

- [What should be done based on these findings]

### Recommended Next Query

[Suggest a follow-up search_memory query for deeper exploration]
