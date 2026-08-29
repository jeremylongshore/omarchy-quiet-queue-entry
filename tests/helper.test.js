const test = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const os = require("node:os")
const path = require("node:path")
const { spawn, spawnSync } = require("node:child_process")
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

test("same-UID final and temporary session swaps never write through to a victim", () => {
  const x = setup(); const dir = path.join(x.env.XDG_STATE_HOME, "omarchy-quiet-queue")
  fs.mkdirSync(dir, { recursive: true })
  const victim = path.join(x.root, "victim-session"); fs.writeFileSync(victim, "precious")
  const racer = spawn(process.execPath, [path.join(__dirname, "fixtures", "session-swap-racer.js"), dir, victim], { stdio: "ignore" })
  for (let i = 0; i < 40; i++) spawnSync(helper, ["--start", "1500"], { encoding: "utf8", env: x.env })
  racer.kill("SIGTERM")
  assert.equal(fs.readFileSync(victim, "utf8"), "precious")
  fs.rmSync(x.root, { recursive: true, force: true })
})

test("same-UID parent swaps cannot redirect session publication or DND ownership", () => {
  const x = setup(); const dir = path.join(x.env.XDG_STATE_HOME, "omarchy-quiet-queue")
  fs.mkdirSync(dir, { recursive: true })
  const victimDir = path.join(x.root, "victim-parent"); fs.mkdirSync(victimDir)
  fs.writeFileSync(x.env.DND_FILE, "on")
  const racer = spawn(process.execPath, [path.join(__dirname, "fixtures", "parent-swap-racer.js"), dir, victimDir], { stdio: "ignore" })
  for (let i = 0; i < 40; i++) spawnSync(helper, ["--start", "1500"], { encoding: "utf8", env: x.env })
  racer.kill("SIGTERM")
  assert.equal(fs.existsSync(path.join(victimDir, "session.json")), false)
  assert.equal(fs.readFileSync(x.env.DND_FILE, "utf8"), "on")
  fs.rmSync(x.root, { recursive: true, force: true })
})

test("FIFO session is rejected without blocking a poll", () => {
  const x = setup(); const dir = path.join(x.env.XDG_STATE_HOME, "omarchy-quiet-queue")
  fs.mkdirSync(dir, { recursive: true })
  const made = spawnSync("mkfifo", [path.join(dir, "session.json")], { encoding: "utf8" })
  assert.equal(made.status, 0, made.stderr)
  const result = spawnSync(helper, ["--scan"], { encoding: "utf8", env: x.env, timeout: 1000 })
  assert.equal(result.status, 0, result.stderr)
  const state = JSON.parse(result.stdout)
  assert.equal(state.until, 0); assert.equal(state.owned, false)
  fs.rmSync(x.root, { recursive: true, force: true })
})
