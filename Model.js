function clean(value, max) {
  var s = String(value === undefined || value === null ? "" : value).replace(/[<>]/g, "").replace(/[\x00-\x1f\x7f]/g, "")
  var cap = max || 64
  return s.length > cap ? s.slice(0, cap) : s
}

function parseState(raw, nowMs) {
  var x
  try { x = JSON.parse(String(raw || "")) } catch (e) { return { valid: false, silenced: false, owned: false, remaining: 0 } }
  if (!x || typeof x.silenced !== "boolean" || typeof x.owned !== "boolean" || !isFinite(Number(x.until))) return { valid: false, silenced: false, owned: false, remaining: 0 }
  return { valid: true, silenced: x.silenced, owned: x.owned, remaining: Math.max(0, Math.ceil(Number(x.until) - Number(nowMs) / 1000)) }
}

function timeLabel(seconds) {
  var n = Math.max(0, Math.floor(Number(seconds) || 0))
  return Math.floor(n / 60) + "M " + (n % 60) + "S"
}
function pillText(state) { return state && state.silenced ? (state.remaining ? "QUIET " + Math.ceil(state.remaining / 60) : "QUIET") : "QUEUE" }
function tooltipText(state) { return state && state.silenced ? (state.owned ? "Quiet session: " + timeLabel(state.remaining) : "Notifications silenced outside Quiet Queue") : "Notifications are delivering normally" }
function modeHue(state) { return state && state.silenced ? (state.owned ? 0.13 : 0.075) : 0.43 }
if (typeof module !== "undefined") module.exports = { clean, parseState, timeLabel, pillText, tooltipText, modeHue }
