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

// Marketplace security review (#2902) regression tests: state hygiene.
test("state dir and session file are created private (0700/0600)", () => {
  const x = setup(); run(x.env, "--start", "1500")
  const dir = path.join(x.env.XDG_STATE_HOME, "omarchy-quiet-queue")
  assert.equal(fs.statSync(dir).mode & 0o777, 0o700)
  assert.equal(fs.statSync(path.join(dir, "session.json")).mode & 0o777, 0o600)
  fs.rmSync(x.root, { recursive: true, force: true })
})
test("a symlinked session file is never followed, read or written", () => {
  const x = setup()
  const dir = path.join(x.env.XDG_STATE_HOME, "omarchy-quiet-queue"); fs.mkdirSync(dir, { recursive: true })
  const victim = path.join(x.root, "victim"); fs.writeFileSync(victim, "precious")
  fs.symlinkSync(victim, path.join(dir, "session.json"))
  // scan treats the symlink as "no session" instead of parsing the target
  const scanned = run(x.env, "--scan"); assert.equal(scanned.until, 0)
  // start replaces the symlink via rename; the victim file is untouched
  run(x.env, "--start", "1500")
  assert.equal(fs.readFileSync(victim, "utf8"), "precious")
  assert.equal(fs.lstatSync(path.join(dir, "session.json")).isSymbolicLink(), false)
  fs.rmSync(x.root, { recursive: true, force: true })
})
test("an oversized session file reads as no session instead of being parsed", () => {
  const x = setup()
  const dir = path.join(x.env.XDG_STATE_HOME, "omarchy-quiet-queue"); fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, "session.json"), "x".repeat(8192))
  const scanned = run(x.env, "--scan"); assert.equal(scanned.until, 0); assert.equal(scanned.owned, false)
  fs.rmSync(x.root, { recursive: true, force: true })
})
