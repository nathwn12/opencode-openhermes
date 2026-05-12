const DEFAULT_PROTECTED_TOOLS = new Set([
  "task", "skill", "todowrite", "todoread",
  "compress", "batch", "plan_enter", "plan_exit",
  "write", "edit", "bash", "webfetch",
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

function normalizePath(input) {
  return input.replace(/\\/g, "/")
}

function globMatch(filePath, pattern) {
  const fp = normalizePath(filePath)
  const pat = normalizePath(pattern)
  const regexStr = pat
    .replace(/\*\*/g, "__DOUBLESTAR__")
    .replace(/\*/g, "__STAR__")
    .replace(/\?/g, "__QUESTION__")
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/__DOUBLESTAR__/g, ".*")
    .replace(/__STAR__/g, "[^/]*")
    .replace(/__QUESTION__/g, ".")
  try {
    return new RegExp(`^${regexStr}$`, "i").test(fp)
  } catch {
    return fp.toLowerCase() === pat.toLowerCase()
  }
}
