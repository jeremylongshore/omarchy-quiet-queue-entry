const test = require("node:test")
const assert = require("node:assert/strict")
const M = require("../Model.js")
const now = 1_700_000_000_000

test("parseState fails closed on malformed state", () => {
  for (const raw of ["bad", "{}", JSON.stringify({ silenced: "yes", owned: false, until: 1 }), JSON.stringify({ silenced: true, owned: false, until: "bad" })]) assert.equal(M.parseState(raw, now).valid, false)
})
test("parseState distinguishes native DND from a queue-owned session", () => {
  const owned = M.parseState(JSON.stringify({ silenced: true, owned: true, until: 1700000300 }), now)
  assert.deepEqual(owned, { valid: true, silenced: true, owned: true, remaining: 300 })
  const external = M.parseState(JSON.stringify({ silenced: true, owned: false, until: 0 }), now)
  assert.equal(external.remaining, 0); assert.match(M.tooltipText(external), /outside Quiet Queue/)
  assert.equal(M.parseState(JSON.stringify({ silenced: false, owned: false, until: 1 }), now).remaining, 0)
})
test("labels are bounded at time boundaries", () => {
  assert.equal(M.timeLabel(-1), "0M 0S"); assert.equal(M.timeLabel("bad"), "0M 0S"); assert.equal(M.timeLabel(1500), "25M 0S")
  assert.equal(M.timeLabel(61), "1M 1S")
  assert.equal(M.pillText({ silenced: false }), "QUEUE"); assert.equal(M.pillText({ silenced: true, remaining: 1 }), "QUIET 1")
  assert.match(M.tooltipText({ silenced: false }), /delivering normally/)
  assert.equal(M.clean('<x>\x00', 3), "x")
  assert.equal(M.clean(null), "")
  assert.equal(M.clean("abcdef", 3), "abc")
  assert.match(M.tooltipText({ silenced: true, owned: true, remaining: 61 }), /1M 1S/)
})
