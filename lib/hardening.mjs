function hasExpired(r) {
  if (r?.status === "expired" || r?.status === "decayed") return true
  if (r?.decay_at && Date.parse(r.decay_at) < Date.now()) return true
  if (r?.expires_at && Date.parse(r.expires_at) < Date.now()) return true
  return false
}

function isTruthy(value) {
  return /^(1|true|yes|on)$/i.test(String(value || ""))
}

export { hasExpired, isTruthy }
