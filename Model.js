function clean(value, max) {
  var s = String(value === undefined || value === null ? "" : value).replace(/[<>]/g, "").replace(/[\x00-\x1f\x7f]/g, "")
  var cap = max || 64
  return s.length > cap ? s.slice(0, cap) : s
}

// The helper prints one short JSON line; anything larger is not its output.
var MAX_STATE_BYTES = 4096

function invalidState() { return { valid: false, known: false, silenced: false, owned: false, remaining: 0 } }

// known is false when the helper could not read Omarchy's Do Not Disturb state.
// That is a third state, not "off": the panel reports it and offers no action.
function parseState(raw, nowMs) {
  var text = String(raw || "")
  if (text.length > MAX_STATE_BYTES) return invalidState()
  var x
  try { x = JSON.parse(text) } catch (e) { return invalidState() }
  if (!x || typeof x.owned !== "boolean" || !isFinite(Number(x.until))) return invalidState()
  var remaining = Math.max(0, Math.ceil(Number(x.until) - Number(nowMs) / 1000))
  if (x.known === false) {
    if (x.silenced !== null) return invalidState()
    return { valid: true, known: false, silenced: false, owned: x.owned, remaining: remaining }
  }
  if (typeof x.silenced !== "boolean") return invalidState()
  return { valid: true, known: true, silenced: x.silenced, owned: x.owned, remaining: remaining }
}

// What the panel shows when the helper itself printed nothing usable: it
// cannot say anything about Do Not Disturb, so nothing may be claimed or run.
function unknownState() { return { valid: true, known: false, silenced: false, owned: false, remaining: 0 } }

function isUnknown(state) { return !!state && state.valid === true && state.known === false }

function timeLabel(seconds) {
  var n = Math.max(0, Math.floor(Number(seconds) || 0))
  return Math.floor(n / 60) + "M " + (n % 60) + "S"
}
function pillText(state) {
  if (isUnknown(state)) return "QUEUE ?"
  return state && state.silenced ? (state.remaining ? "QUIET " + Math.ceil(state.remaining / 60) : "QUIET") : "QUEUE"
}
function tooltipText(state) {
  if (isUnknown(state)) return "Cannot read Do Not Disturb, so Quiet Queue is changing nothing"
  return state && state.silenced ? (state.owned ? "Quiet session: " + timeLabel(state.remaining) : "Notifications silenced outside Quiet Queue") : "Notifications are delivering normally"
}
function modeHue(state) {
  if (isUnknown(state)) return 0
  return state && state.silenced ? (state.owned ? 0.13 : 0.075) : 0.43
}

// Panel copy. It describes what Omarchy's Do Not Disturb does, which is not
// Quiet Queue's doing and is not "nothing is lost": while it is on, Omarchy
// keeps most silenced notifications in its history, drops the transient ones
// and those sent by notify-send, and still shows critical notify-send alerts,
// its own action toasts and verification codes (Omarchy shell notifications,
// Delivery.js and Service.qml).
function heroTitle(state, loaded) {
  if (!loaded) return "READING QUIET MODE"
  if (isUnknown(state)) return "DND STATE UNKNOWN"
  return state && state.silenced ? "NOTIFICATIONS SILENCED" : "NOTIFICATIONS FLOWING"
}
function heroMeta(state, loaded) {
  if (!loaded) return "Checking Omarchy's local notification toggle."
  if (isUnknown(state)) return "Omarchy did not answer. Quiet Queue is changing nothing and asks again every 5 seconds."
  if (state.owned) return "Quiet Queue owns this focus session: " + timeLabel(state.remaining)
  return state.silenced ? "Do Not Disturb is on outside Quiet Queue. Omarchy decides what is kept." : "Start a bounded quiet session. Omarchy's Do Not Disturb silences popups while it runs."
}
function statusHeadline(state) {
  if (isUnknown(state)) return "CANNOT READ DO NOT DISTURB"
  return state && state.silenced ? (state.owned ? "FOCUS SESSION ACTIVE" : "NATIVE DND ACTIVE") : "NOTIFICATIONS OPEN"
}
function statusDetail(state) {
  if (isUnknown(state)) return "NOTHING IS BEING CHANGED"
  if (state && state.owned) return timeLabel(state.remaining) + " REMAINING"
  return state && state.silenced ? "QUIET QUEUE WILL NOT TURN THIS OFF" : "CHOOSE A BOUNDED QUIET SESSION"
}
function trustNote() {
  return "While Do Not Disturb is on, Omarchy keeps most silenced notifications in its history but drops transient and notify-send ones. Critical notify-send alerts, action toasts and verification codes still show. Quiet Queue never reads notification contents."
}
function keyHint(count) {
  return count > 0 ? "Arrow keys choose a row. Enter or Space activates it." : ""
}

// Rows the keyboard cursor can land on: 0 = 25 minutes, 1 = 50 minutes, and 2 =
// end, which exists only while Quiet Queue owns the session. None are offered
// while the state is unread or unknown, so no action can run blind.
function actionArgs(state, index) {
  if (!state || state.valid !== true || state.known !== true) return null
  if (index === 0) return ["--start", "1500"]
  if (index === 1) return ["--start", "3000"]
  if (index === 2 && state.owned) return ["--end"]
  return null
}
function actionCount(state) {
  if (!actionArgs(state, 0)) return 0
  return state.owned ? 3 : 2
}
// First-party panels clamp the cursor at either end instead of wrapping.
function moveCursor(index, delta, count) {
  if (!(count > 0)) return 0
  var next = Math.floor(Number(index) || 0) + Math.floor(Number(delta) || 0)
  return Math.max(0, Math.min(count - 1, next))
}
if (typeof module !== "undefined") module.exports = {
  clean: clean,
  parseState: parseState,
  isUnknown: isUnknown,
  unknownState: unknownState,
  timeLabel: timeLabel,
  pillText: pillText,
  tooltipText: tooltipText,
  modeHue: modeHue,
  heroTitle: heroTitle,
  heroMeta: heroMeta,
  statusHeadline: statusHeadline,
  statusDetail: statusDetail,
  trustNote: trustNote,
  keyHint: keyHint,
  actionArgs: actionArgs,
  actionCount: actionCount,
  moveCursor: moveCursor
}
