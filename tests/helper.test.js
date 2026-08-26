const test = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const os = require("node:os")
const path = require("node:path")
const { spawnSync } = require("node:child_process")
const helper = path.join(__dirname, "..", "bin", "quiet-queue")

function setup() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "quiet-queue-")); const bin = path.join(root, "bin"); fs.mkdirSync(bin)
  const mock = path.join(bin, "omarchy-shell")
  fs.writeFileSync(mock, '#!/usr/bin/env bash\nset -e\nif [[ "$2" == dndState ]]; then cat "$DND_FILE"; elif [[ "$2" == setDnd ]]; then printf "%s" "$3" > "$DND_FILE"; fi\n')
  fs.chmodSync(mock, 0o755); fs.writeFileSync(path.join(root, "dnd"), "off")
  return { root, env: { ...process.env, HOME: root, XDG_STATE_HOME: path.join(root, "state"), DND_FILE: path.join(root, "dnd"), PATH: bin + ":" + process.env.PATH } }
}
function run(env, ...args) { const r = spawnSync(helper, args, { encoding: "utf8", env }); assert.equal(r.status, 0, r.stderr); return JSON.parse(r.stdout) }

test("helper owns and safely ends a new native DND session", () => {
  const x = setup(); const started = run(x.env, "--start", "1500")
  assert.equal(started.silenced, true); assert.equal(started.owned, true); assert.equal(fs.readFileSync(x.env.DND_FILE, "utf8"), "on")
  const ended = run(x.env, "--end"); assert.equal(ended.silenced, false); assert.equal(fs.readFileSync(x.env.DND_FILE, "utf8"), "off")
  fs.rmSync(x.root, { recursive: true, force: true })
})
test("helper never disables DND it did not enable", () => {
  const x = setup(); fs.writeFileSync(x.env.DND_FILE, "on")
  const started = run(x.env, "--start", "3000"); assert.equal(started.owned, false)
  run(x.env, "--end"); assert.equal(fs.readFileSync(x.env.DND_FILE, "utf8"), "on")
  fs.rmSync(x.root, { recursive: true, force: true })
})
