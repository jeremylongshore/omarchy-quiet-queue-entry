const test = require("node:test")
// RTM: REQ-QQ-006
const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")

const panel = fs.readFileSync(path.join(__dirname, "..", "Panel.qml"), "utf8")

test("every quiet-session action exposes a stable accessibility name and button role", () => {
  assert.match(panel, /Accessible\.name:\s*"Start 25 minute quiet session"/)
  assert.match(panel, /Accessible\.name:\s*"Start 50 minute quiet session"/)
  assert.match(panel, /Accessible\.name:\s*"End Quiet Queue session"/)
  assert.equal((panel.match(/Accessible\.role:\s*Accessible\.Button/g) || []).length, 3)
})

test("the dynamic countdown is bounded plain text", () => {
  assert.match(panel, /text:\s*root\.state\.owned \? Model\.timeLabel\(root\.state\.remaining\)[^;]+; textFormat: Text\.PlainText; width:[^;]+;[^}]+elide: Text\.ElideRight/)
})
