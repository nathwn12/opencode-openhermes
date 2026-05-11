const DEFAULT_PROTECTED_TOOLS = new Set([
  "task", "skill", "todowrite", "todoread",
  "compress", "batch", "plan_enter", "plan_exit",
  "write", "edit",
])

export function isToolNameProtected(toolName, extraProtected = []) {
  if (DEFAULT_PROTECTED_TOOLS.has(toolName)) return true
  return extraProtected.includes(toolName)
}

export function getFilePathsFromParameters(tool, params) {
  if (!params || typeof params !== "object") return []
  if (params.filePath) return [params.filePath]
  if (params.file_path) return [params.file_path]
  if (params.path) return [params.path]
  if (params.target) return [params.target]
  if (params.directory) return [params.directory]
  if (tool === "glob" && params.pattern) return [params.pattern]
  return []
}

export function isFilePathProtected(filePaths, protectedPatterns = []) {
  if (!protectedPatterns?.length) return false
  if (!filePaths?.length) return false
  for (const fp of filePaths) {
    for (const pattern of protectedPatterns) {
      if (globMatch(fp, pattern)) return true
    }
  }
  return false
}

function globMatch(filePath, pattern) {
  const regexStr = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".")
  try {
    return new RegExp(`^${regexStr}$`, "i").test(filePath)
  } catch {
    return filePath.toLowerCase() === pattern.toLowerCase()
  }
}

export function getTurnProtectionTags(state) {
  const config = state.protectedTurns || {}
  if (!config.enabled || !config.turns) return []
  const threshold = state.currentTurn - config.turns
  return [...state.toolIdList].filter(id => {
    const entry = state.toolParameters.get(id)
    return entry && entry.turn > threshold
  })
}
