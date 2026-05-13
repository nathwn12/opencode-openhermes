import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

function getStatePath() {
  return join(process.cwd(), ".openhermes-guard.json")
}

function defaultState() {
  return { carefulMode: false, frozenDirs: [], guardMode: false }
}

export function getState() {
  const fp = getStatePath()
  if (!existsSync(fp)) return defaultState()
  try {
    const raw = readFileSync(fp, "utf8")
    return { ...defaultState(), ...JSON.parse(raw) }
  } catch {
    return defaultState()
  }
}

export function setState(state) {
  const fp = getStatePath()
  const merged = { ...getState(), ...state }
  writeFileSync(fp, JSON.stringify(merged, null, 2), "utf8")
  return merged
}

export function isFrozen(dir) {
  const state = getState()
  return state.frozenDirs.includes(dir)
}

export function freezeDir(dir) {
  const state = getState()
  if (!state.frozenDirs.includes(dir)) {
    state.frozenDirs.push(dir)
    setState(state)
  }
}

export function unfreezeDir(dir) {
  const state = getState()
  state.frozenDirs = state.frozenDirs.filter(d => d !== dir)
  setState(state)
}

export function listFrozenDirs() {
  return getState().frozenDirs
}

export function isCarefulMode() {
  return getState().carefulMode
}

export function setCarefulMode(val) {
  setState({ carefulMode: !!val })
}
