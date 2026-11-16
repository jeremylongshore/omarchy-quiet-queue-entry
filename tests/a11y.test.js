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
  assert.match(panel, /text:\s*Model\.statusDetail\(root\.state\); textFormat: Text\.PlainText; width:[^;]+;[^}]+elide: Text\.ElideRight/)
})

test("every row the cursor can land on is also reachable by assistive technology", () => {
  for (const row of [0, 1, 2]) assert.match(panel, new RegExp("Accessible\\.onPressAction:\\s*root\\.perform\\(" + row + "\\)"))
  assert.equal((panel.match(/Text\.PlainText/g) || []).length, (panel.match(/\bText \{/g) || []).length)
})
