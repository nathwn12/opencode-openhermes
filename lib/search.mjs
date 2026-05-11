export function scoreRelevance(r, query, project) {
  const q = query.toLowerCase()
  const tokens = q.split(/\s+/).filter(t => t.length > 2)
  let score = 0

  const primaryFields = [r.summary, r.description, r.mission, r.current_state, r.failure, r.root_cause, r.fix, r.prevention, r.id].filter(Boolean)
  const secondaryFields = [r.command, r.project, r.scope].filter(Boolean)
  const listFields = [...(Array.isArray(r.tags) ? r.tags : []), ...(Array.isArray(r.next_actions) ? r.next_actions : []), ...(Array.isArray(r.refs) ? r.refs : [])].filter(Boolean)

  for (const f of primaryFields) {
    const str = String(f).toLowerCase()
    let idx = 0; let count = 0
    while ((idx = str.indexOf(q, idx)) !== -1) { count++; idx += q.length }
    score += count * 15
    if (str.startsWith(q)) score += 10
    if (str.includes(q)) score += 4
    for (const token of tokens) {
      if (str.includes(token)) score += 4
      if (str.startsWith(token)) score += 2
    }
  }

  for (const f of secondaryFields) {
    const str = String(f).toLowerCase()
    if (str.includes(q)) score += 8
    for (const token of tokens) {
      if (str.includes(token)) score += 3
    }
  }

  for (const f of listFields) {
    const str = String(f).toLowerCase()
    if (str.includes(q)) score += 5
    for (const token of tokens) {
      if (str.includes(token)) score += 2
    }
  }

  if (r.project && r.project.toLowerCase() === (project || "").toLowerCase()) score += 25
  if (r.project && project && r.project.toLowerCase().includes(project.toLowerCase())) score += 12

  const age = Date.now() - Date.parse(r.updated_at || r.created_at || 0)
  if (!Number.isNaN(age)) score += Math.max(0, 10 - age / 604800000)
  if (r.status === "active") score += 4
  if (r.status === "closed") score -= 3

  return score
}
