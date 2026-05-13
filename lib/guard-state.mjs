import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

function getStatePath(cwd) {
  return join(cwd ?? process.cwd(), ".openhermes-guard.json")
}

function defaultState() {
  return { carefulMode: false, frozenDirs: [], guardMode: false }
}

export function getState(cwd) {
  const fp = getStatePath(cwd)
  if (!existsSync(fp)) return defaultState()
  try {
    const raw = readFileSync(fp, "utf8")
    return { ...defaultState(), ...JSON.parse(raw) }
  } catch {
    return defaultState()
  }
}

export function setState(state, cwd) {
  const fp = getStatePath(cwd)
  const merged = { ...getState(cwd), ...state }
  writeFileSync(fp, JSON.stringify(merged, null, 2), "utf8")
  return merged
}

export function isFrozen(dir, cwd) {
  const state = getState(cwd)
  return state.frozenDirs.includes(dir)
}

export function freezeDir(dir, cwd) {
  const state = getState(cwd)
  if (!state.frozenDirs.includes(dir)) {
    state.frozenDirs.push(dir)
    setState(state, cwd)
  }
}

export function unfreezeDir(dir, cwd) {
  const state = getState(cwd)
  state.frozenDirs = state.frozenDirs.filter(d => d !== dir)
  setState(state, cwd)
}

export function listFrozenDirs(cwd) {
  return getState(cwd).frozenDirs
}

export function isCarefulMode(cwd) {
  return getState(cwd).carefulMode
}

export function setCarefulMode(val, cwd) {
  setState({ carefulMode: !!val }, cwd)
}
