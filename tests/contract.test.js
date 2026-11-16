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
  for (const claim of ["25- or 50-minute", "native Do Not Disturb", "never reads notification contents", "only when it owns", "can't read", "every 5 seconds"]) assert.match(manifest.description, new RegExp(claim))
})

test("banner names and illustrates the native focus-session product", () => {
  const banner = read("assets/banner.svg")
  assert.match(banner, /<title id="title">Quiet Queue<\/title>/)
  assert.match(banner, /25 \/ 50 MINUTES/)
  assert.match(banner, /NEVER READS YOUR NOTIFICATIONS/)
  assert.match(banner, /<(?:path|circle)\b/)
})

test("render tooling requires current real-shell provenance and visual approval", () => {
  const panel = read("Panel.qml")
  const render = read("scripts/rig-render.sh")
  assert.match(panel, /contentWidth:\s*panel\.fittedContentWidth\(Style\.space\(700\)\)/)
  assert.match(render, /OMARCHY_RIG_RESOLUTION:-1280x720/)
  assert.match(render, /rawShellLogSha256/)
  assert.match(render, /visualInspection:\{status:"pending"/)
  assert.match(render, /dbus-daemon --session --fork --print-address=1 --print-pid=1/)
  assert.match(render, /export DBUS_SESSION_BUS_ADDRESS/)
  assert.match(render, /export PATH="\\\$OMARCHY_PATH\/bin:\\\$PATH"/)
  assert.match(render, /kill "\\\$DBUS_PID"/)
  assert.match(render, /rig-render: pre-capture hook failed/)
  assert.match(render, /HOOK_OUTPUT=.*2>&1/)
  assert.match(render, /--exclude=preview\.png/)
  assert.doesNotMatch(render, /manifest\.json bin preview\.png README/)
  assert.match(read("scripts/approve-preview.sh"), /product value is visible without reading the README/)
})

test("render hook proves a newly-owned native DND session before capture", () => {
  const hook = read("e2e/rig-before-capture.sh")
  assert.match(hook, /quiet-queue" --start 1500|"\$helper" --start 1500/)
  assert.match(hook, /\.known == false and \.silenced == null and \.owned == true/)
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

test("QML qualifies Omarchy's palette as Commons.Color, never bare Color", () => {
  // Qt 6.12 introduces its own Color type; omarchy docs/omarchy-shell.md
  // (Theme tokens) requires plugins to import qs.Commons with an alias.
  const files = fs.readdirSync(root).filter(name => name.endsWith(".qml"))
  assert.ok(files.length > 0)
  for (const file of files) {
    const source = fs.readFileSync(path.join(root, file), "utf8")
    assert.doesNotMatch(source, /(^|[^\w.])Color\./m, file + " uses bare Color")
    if (/Commons\.Color\./.test(source)) assert.match(source, /^import qs\.Commons as Commons$/m, file)
  }
})

// Omarchy's Do Not Disturb drops transient and notify-send notifications and
// only records the rest (shell/plugins/notifications/Delivery.js, Service.qml at
// Omarchy 74de104). These claims were false and must not return anywhere that
// ships to a user.
test("no shipped surface claims silenced notifications are kept or never discarded", () => {
  const surfaces = ["manifest.json", "README.md", "SECURITY.md", "Panel.qml", "Model.js", "assets/banner.svg", "contracts/marketplace.md"]
  const false_claims = [
    /nothing is discarded/i,
    /never[^.]{0,40}\bdiscards?\b[^.]{0,20}(them|notifications)/i,
    /stay(s)? (in|intact)/i,
    /remains? (in|intact|available)/i,
    /notifications queued/i,
    /history (stays|remains)/i
  ]
  for (const name of surfaces) {
    const source = read(name)
    for (const claim of false_claims) assert.doesNotMatch(source, claim, name + " " + claim)
  }
})

test("the panel wires Enter once and the helper dependency is documented", () => {
  const panel = read("Panel.qml")
  assert.match(panel, /onActivateRequested:\s*root\.activateCursor\(\)/)
  assert.doesNotMatch(panel, /onReturnRequested/)
  assert.match(panel, /onMoveRequested:/)
  const readme = read("README.md")
  assert.match(readme, /## Runtime dependencies/)
  assert.match(readme, /#!\/usr\/bin\/perl/)
  assert.doesNotMatch(readme, /extra runtime\.?$/m)
  assert.doesNotMatch(readme, /\bimmediately\b/i)
})

test("rig receipts record which Omarchy, Qt and Quickshell produced them", () => {
  for (const name of ["scripts/rig-verify.sh", "scripts/rig-render.sh"]) {
    const source = read(name)
    for (const field of ["omarchySha", "qtVersion", "quickshellVersion"]) assert.match(source, new RegExp(field), name + " " + field)
  }
  assert.match(read("scripts/rig-render.sh"), /===HOOK===/)
})

test("the keyboard proof drives real keystrokes and counts the helper's own actions", () => {
  for (const name of ["e2e/keys-owned.sh", "e2e/keys-unknown.sh", "scripts/rig-keys.sh"]) {
    assert.ok(fs.statSync(path.join(root, name)).mode & 0o111, name + " is not executable")
  }
  const owned = read("e2e/keys-owned.sh")
  assert.match(owned, /wtype -s \d+ -k Return/)
  for (const log of ['"--start 1500;"', '"--start 1500;--end;"', '"--start 1500;--end;--start 1500;"']) assert.ok(owned.includes(log), log)
  assert.match(read("e2e/keys-unknown.sh"), /\.known == false and \.silenced == null/)
  const keys = read("scripts/rig-keys.sh")
  assert.match(keys, /quiet-queue\.real/)
  assert.match(keys, /scripts\/rig-render\.sh/)
})
