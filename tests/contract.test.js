const test = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")

const root = path.join(__dirname, "..")
const read = name => fs.readFileSync(path.join(root, name), "utf8")

test("marketplace copy uses the full contract and preserves ownership semantics", () => {
  const manifest = JSON.parse(read("manifest.json"))
  assert.equal(manifest.description.length, 500)
  assert.equal(manifest.barWidget.description.length, 500)
  assert.equal(manifest.barWidget.description, manifest.description)
  for (const claim of ["25- or 50-minute", "native Do Not Disturb", "never reads, uploads, replaces, or discards", "only when it owns", "every 5 seconds"]) assert.match(manifest.description, new RegExp(claim))
})

test("banner names and illustrates the native focus-session product", () => {
  const banner = read("assets/banner.svg")
  assert.match(banner, /<title id="title">Quiet Queue<\/title>/)
  assert.match(banner, /25 \/ 50 MINUTES/)
  assert.match(banner, /NATIVE HISTORY STAYS INTACT/)
  assert.match(banner, /<(?:path|circle)\b/)
})

test("render tooling requires current real-shell provenance and visual approval", () => {
  const render = read("scripts/rig-render.sh")
  assert.match(render, /OMARCHY_RIG_RESOLUTION:-1280x720/)
  assert.match(render, /rawShellLogSha256/)
  assert.match(render, /visualInspection:\{status:"pending"/)
  assert.match(render, /dbus-daemon --session --fork --print-address=1 --print-pid=1/)
  assert.match(render, /export DBUS_SESSION_BUS_ADDRESS/)
  assert.match(render, /kill "\\\$DBUS_PID"/)
  assert.match(render, /--exclude=preview\.png/)
  assert.doesNotMatch(render, /manifest\.json bin preview\.png README/)
  assert.match(read("scripts/approve-preview.sh"), /product value is visible without reading the README/)
})

test("render hook proves a newly-owned native DND session before capture", () => {
  const hook = read("e2e/rig-before-capture.sh")
  assert.match(hook, /quiet-queue" --start 1500|\$helper --start 1500/)
  assert.match(hook, /\.silenced == false and \.owned == false/)
  assert.match(hook, /\.silenced == true and \.owned == true/)
  assert.match(hook, /\.until - \.now/)
  assert.doesNotMatch(hook, /session\.json|printf.*owned.*true/)
  assert.match(read("Panel.qml"), /Timer \{ interval: 5000; running: true; repeat: true; triggeredOnStart: true/)
})

test("marketplace contract binds the active session, trust boundary, and image approval", () => {
  const contract = read("contracts/marketplace.md")
  for (const claim of ["500-character", "pre-existing native DND", "1280x720", "DND off", "DND on", "SHA-256"])
    assert.match(contract, new RegExp(claim))
})
