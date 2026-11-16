const test = require("node:test")
const assert = require("node:assert/strict")
const M = require("../Model.js")
const now = 1_700_000_000_000
const invalid = { valid: false, known: false, silenced: false, owned: false, remaining: 0 }
const flowing = M.parseState(JSON.stringify({ silenced: false, owned: false, until: 0, known: true }), now)
const external = M.parseState(JSON.stringify({ silenced: true, owned: false, until: 0, known: true }), now)
const owned = M.parseState(JSON.stringify({ silenced: true, owned: true, until: 1700000300, known: true }), now)
const unknown = M.parseState(JSON.stringify({ silenced: null, owned: true, until: 1700000300, known: false }), now)

test("parseState fails closed on malformed state", () => {
  for (const raw of [
    "bad",
    "{}",
    "",
    JSON.stringify({ silenced: "yes", owned: false, until: 1 }),
    JSON.stringify({ silenced: true, owned: "yes", until: 1 }),
    JSON.stringify({ silenced: true, owned: false, until: "bad" }),
    JSON.stringify({ silenced: null, owned: false, until: 0 }),
    // known:false with a boolean silenced contradicts itself, so it is not trusted
    JSON.stringify({ silenced: false, owned: false, until: 0, known: false }),
    JSON.stringify({ silenced: true, owned: false, until: 0, known: false })
  ]) assert.deepEqual(M.parseState(raw, now), invalid, raw)
  assert.deepEqual(M.parseState(undefined, now), invalid)
})
test("parseState refuses output larger than the helper can print", () => {
  const padded = JSON.stringify({ silenced: false, owned: false, until: 0, known: true, pad: "x".repeat(4096) })
  assert.deepEqual(M.parseState(padded, now), invalid)
  const edge = JSON.stringify({ silenced: false, owned: false, until: 0, known: true })
  assert.equal(M.parseState(edge + " ".repeat(4096 - edge.length), now).valid, true)
  assert.deepEqual(M.parseState(edge + " ".repeat(4097 - edge.length), now), invalid)
})
test("parseState distinguishes native DND from a queue-owned session", () => {
  assert.deepEqual(owned, { valid: true, known: true, silenced: true, owned: true, remaining: 300 })
  assert.equal(external.remaining, 0); assert.match(M.tooltipText(external), /outside Quiet Queue/)
  assert.equal(M.parseState(JSON.stringify({ silenced: false, owned: false, until: 1 }), now).remaining, 0)
})
test("a helper that predates the known field still reads as a known state", () => {
  assert.deepEqual(M.parseState(JSON.stringify({ silenced: true, owned: false, until: 0 }), now),
    { valid: true, known: true, silenced: true, owned: false, remaining: 0 })
})
test("parseState reports an unreadable DND state as unknown, never as off", () => {
  assert.deepEqual(unknown, { valid: true, known: false, silenced: false, owned: true, remaining: 300 })
  assert.equal(M.isUnknown(unknown), true)
  for (const state of [owned, external, flowing, invalid, undefined, null, {}]) assert.equal(M.isUnknown(state), false)
})
test("an unusable helper answer is shown as unknown and offers no action", () => {
  const blind = M.unknownState()
  assert.deepEqual(blind, { valid: true, known: false, silenced: false, owned: false, remaining: 0 })
  assert.equal(M.isUnknown(blind), true)
  assert.equal(M.actionCount(blind), 0)
  assert.notEqual(M.unknownState(), M.unknownState())
})
test("labels are bounded at time boundaries", () => {
  assert.equal(M.timeLabel(-1), "0M 0S"); assert.equal(M.timeLabel("bad"), "0M 0S"); assert.equal(M.timeLabel(1500), "25M 0S")
  assert.equal(M.timeLabel(61), "1M 1S")
  assert.equal(M.pillText({ silenced: false }), "QUEUE"); assert.equal(M.pillText({ silenced: true, remaining: 1 }), "QUIET 1")
  assert.equal(M.pillText({ silenced: true, remaining: 0 }), "QUIET")
  assert.match(M.tooltipText({ silenced: false }), /delivering normally/)
  assert.equal(M.clean('<x>\x00', 3), "x")
  assert.equal(M.clean(null), "")
  assert.equal(M.clean(undefined), "")
  assert.equal(M.clean("abcdef", 3), "abc")
  assert.equal(M.tooltipText({ silenced: true, owned: true, remaining: 61 }), "Quiet session: 1M 1S")
})
test("an unknown state is visible in the pill, tooltip and hue", () => {
  assert.equal(M.pillText(unknown), "QUEUE ?")
  assert.equal(M.tooltipText(unknown), "Cannot read Do Not Disturb, so Quiet Queue is changing nothing")
  assert.equal(M.modeHue(unknown), 0)
  assert.notEqual(M.pillText(invalid), "QUEUE ?")
})
test("visual state has a stable theme-derived hue for every ownership mode", () => {
  assert.equal(M.modeHue({ silenced: false, owned: false }), 0.43)
  assert.equal(M.modeHue({ silenced: true, owned: false }), 0.075)
  assert.equal(M.modeHue({ silenced: true, owned: true }), 0.13)
  assert.equal(M.modeHue(), 0.43)
})

test("panel copy states what Omarchy does, not that nothing is lost", () => {
  assert.equal(M.heroTitle(invalid, false), "READING QUIET MODE")
  assert.equal(M.heroTitle(flowing, true), "NOTIFICATIONS FLOWING")
  assert.equal(M.heroTitle(external, true), "NOTIFICATIONS SILENCED")
  assert.equal(M.heroTitle(owned, true), "NOTIFICATIONS SILENCED")
  assert.equal(M.heroTitle(unknown, true), "DND STATE UNKNOWN")
  assert.equal(M.heroMeta(invalid, false), "Checking Omarchy's local notification toggle.")
  assert.equal(M.heroMeta(flowing, true), "Start a bounded quiet session. Omarchy's Do Not Disturb silences popups while it runs.")
  assert.equal(M.heroMeta(external, true), "Do Not Disturb is on outside Quiet Queue. Omarchy decides what is kept.")
  assert.equal(M.heroMeta(owned, true), "Quiet Queue owns this focus session: 5M 0S")
  assert.equal(M.heroMeta(unknown, true), "Omarchy did not answer. Quiet Queue is changing nothing and asks again every 5 seconds.")
  assert.equal(M.statusHeadline(flowing), "NOTIFICATIONS OPEN")
  assert.equal(M.statusHeadline(external), "NATIVE DND ACTIVE")
  assert.equal(M.statusHeadline(owned), "FOCUS SESSION ACTIVE")
  assert.equal(M.statusHeadline(unknown), "CANNOT READ DO NOT DISTURB")
  assert.equal(M.statusDetail(flowing), "CHOOSE A BOUNDED QUIET SESSION")
  assert.equal(M.statusDetail(external), "QUIET QUEUE WILL NOT TURN THIS OFF")
  assert.equal(M.statusDetail(owned), "5M 0S REMAINING")
  assert.equal(M.statusDetail(unknown), "NOTHING IS BEING CHANGED")
  const everything = [flowing, external, owned, unknown].map(s => [M.heroTitle(s, true), M.heroMeta(s, true), M.statusHeadline(s), M.statusDetail(s), M.tooltipText(s)].join(" ")).join(" ") + " " + M.trustNote()
  assert.doesNotMatch(everything, /discard|queued|intact|stay in|nothing is lost/i)
})
test("the trust note names what Omarchy drops and what still shows", () => {
  const note = M.trustNote()
  for (const claim of [/most silenced notifications in its history/, /drops transient and notify-send ones/, /Critical notify-send alerts, action toasts and verification codes still show/, /never reads notification contents/]) assert.match(note, claim)
})
test("the key hint appears only while there is something to activate", () => {
  assert.equal(M.keyHint(2), "Arrow keys choose a row. Enter or Space activates it.")
  assert.equal(M.keyHint(1), M.keyHint(3))
  assert.equal(M.keyHint(0), "")
})

test("actions are offered only for a known state, and only end while owned", () => {
  assert.deepEqual(M.actionArgs(flowing, 0), ["--start", "1500"])
  assert.deepEqual(M.actionArgs(flowing, 1), ["--start", "3000"])
  assert.equal(M.actionArgs(flowing, 2), null)
  assert.equal(M.actionArgs(external, 2), null)
  assert.deepEqual(M.actionArgs(owned, 2), ["--end"])
  assert.equal(M.actionArgs(owned, 3), null)
  assert.equal(M.actionArgs(owned, -1), null)
  for (const blind of [unknown, invalid, undefined, null, { valid: true, known: false }, { valid: true }, { known: true }])
    for (const row of [0, 1, 2]) assert.equal(M.actionArgs(blind, row), null)
  assert.equal(M.actionCount(flowing), 2)
  assert.equal(M.actionCount(external), 2)
  assert.equal(M.actionCount(owned), 3)
  assert.equal(M.actionCount(unknown), 0)
  assert.equal(M.actionCount(invalid), 0)
  assert.equal(M.actionCount(undefined), 0)
})
test("the cursor clamps at both ends like first-party panels", () => {
  assert.equal(M.moveCursor(0, 1, 3), 1)
  assert.equal(M.moveCursor(1, 1, 3), 2)
  assert.equal(M.moveCursor(2, 1, 3), 2)
  assert.equal(M.moveCursor(1, -1, 3), 0)
  assert.equal(M.moveCursor(0, -1, 3), 0)
  assert.equal(M.moveCursor(2, 0, 2), 1)
  assert.equal(M.moveCursor(5, 0, 3), 2)
  assert.equal(M.moveCursor(0, 1, 0), 0)
  assert.equal(M.moveCursor(3, 1, -1), 0)
  assert.equal(M.moveCursor(0, 1, undefined), 0)
  assert.equal(M.moveCursor(2, 1, NaN), 0)
  assert.equal(M.moveCursor(0, 1, "x"), 0)
  assert.equal(M.moveCursor("bad", "bad", 3), 0)
  assert.equal(M.moveCursor(undefined, undefined, 3), 0)
  assert.equal(M.moveCursor(0, 1.9, 3), 1)
})
