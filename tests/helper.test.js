const test = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const os = require("node:os")
const path = require("node:path")
const { spawn, spawnSync } = require("node:child_process")
const { once } = require("node:events")
const helper = path.join(__dirname, "..", "bin", "quiet-queue")

function setup() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "quiet-queue-")); const bin = path.join(root, "bin"); fs.mkdirSync(bin)
  const mock = path.join(bin, "omarchy-shell")
  fs.writeFileSync(mock, `#!/usr/bin/env bash
set -e
# Every call is logged so a test can prove which ones the helper made.
printf "%s\\n" "$*" >> "$DND_FILE.calls"
if [[ "$2" == isDnd ]]; then
  # DND_READ plants a failing or malformed DND read; DND_READ_FAIL_AFTER_SET
  # makes the read fail only once a setDnd call has been made.
  case "\${DND_READ:-ok}" in
    ok) ;;
    fail) echo "omarchy-shell is not ready" >&2; exit 1 ;;
    fail-with-on) printf "on\\n"; exit 1 ;;
    function-missing) printf "Function not found.\\n"; exit 0 ;;
    garbage) printf "maybe\\n"; exit 0 ;;
    empty) exit 0 ;;
    long) head -c 5000 /dev/zero | tr "\\\\0" "x"; exit 0 ;;
    hang) exec sleep 30 ;;
  esac
  if [[ "\${DND_READ_FAIL_AFTER_SET:-}" == 1 && -e "$DND_FILE.set" ]]; then
    echo "omarchy-shell is not responding" >&2; exit 1
  fi
  cat "$DND_FILE"
elif [[ "$2" == dndState ]]; then
  # Removed upstream in Omarchy a4c2a306c; current omarchy-shell fails it.
  echo "Function not found." >&2
  exit 1
elif [[ "$2" == setDnd ]]; then
  touch "$DND_FILE.set"
  [[ "\${DND_FAIL_SET:-}" == "$3" ]] && exit 7
  [[ "\${DND_NOOP_SET:-}" == "$3" ]] || printf "%s" "$3" > "$DND_FILE"
  printf "%s\\n" "$3"
fi
`)
  fs.chmodSync(mock, 0o755); fs.writeFileSync(path.join(root, "dnd"), "off")
  return { root, env: { ...process.env, HOME: root, XDG_STATE_HOME: path.join(root, "state"), DND_FILE: path.join(root, "dnd"), PATH: bin + ":" + process.env.PATH } }
}
function result(env, ...args) { return spawnSync(helper, args, { encoding: "utf8", env, timeout: 5000 }) }
function run(env, ...args) { const r = result(env, ...args); assert.equal(r.status, 0, r.stderr); return JSON.parse(r.stdout) }
function runAsync(env, ...args) {
  return new Promise(resolve => {
    const child = spawn(helper, args, { env })
    let stdout = ""; let stderr = ""
    child.stdout.on("data", chunk => { stdout += chunk })
    child.stderr.on("data", chunk => { stderr += chunk })
    child.on("close", status => resolve({ status, stdout, stderr }))
  })
}
async function waitFor(file, timeout = 3000) {
  const deadline = Date.now() + timeout
  while (!fs.existsSync(file)) {
    if (Date.now() >= deadline) assert.fail(`timed out waiting for ${file}`)
    await new Promise(resolve => setTimeout(resolve, 10))
  }
}
async function stopRacer(child) {
  if (child.exitCode === null) { child.kill("SIGTERM"); await once(child, "exit") }
}

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

test("repeated and concurrent starts retain one authoritative DND owner", async () => {
  const x = setup()
  const first = run(x.env, "--start", "1500"); assert.equal(first.owned, true)
  const extended = run(x.env, "--start", "3000"); assert.equal(extended.owned, true)
  const results = await Promise.all(Array.from({ length: 8 }, (_, i) => runAsync(x.env, "--start", i % 2 ? "1500" : "3000")))
  for (const r of results) assert.equal(r.status, 0, r.stderr)
  const final = run(x.env, "--scan")
  assert.equal(final.owned, true); assert.equal(final.silenced, true)
  run(x.env, "--end"); assert.equal(fs.readFileSync(x.env.DND_FILE, "utf8"), "off")
  fs.rmSync(x.root, { recursive: true, force: true })
})

test("an external DND-off revokes ownership and a later DND-on stays external", () => {
  const x = setup(); run(x.env, "--start", "1500")
  fs.writeFileSync(x.env.DND_FILE, "off")
  const revoked = run(x.env, "--scan"); assert.equal(revoked.owned, false); assert.equal(revoked.silenced, false)
  fs.writeFileSync(x.env.DND_FILE, "on")
  run(x.env, "--end"); assert.equal(fs.readFileSync(x.env.DND_FILE, "utf8"), "on")
  fs.rmSync(x.root, { recursive: true, force: true })
})

test("an expired owned session restores native notifications", () => {
  const x = setup(); const dir = path.join(x.env.XDG_STATE_HOME, "omarchy-quiet-queue")
  fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, "session.json"), '{"until":1,"owned":true}\n')
  fs.writeFileSync(x.env.DND_FILE, "on")
  const scanned = run(x.env, "--scan")
  assert.equal(scanned.owned, false); assert.equal(scanned.silenced, false)
  assert.equal(fs.existsSync(path.join(dir, "session.json")), false)
  fs.rmSync(x.root, { recursive: true, force: true })
})

test("failed or ineffective native DND transitions fail closed", () => {
  for (const failure of ["DND_FAIL_SET", "DND_NOOP_SET"]) {
    const x = setup(); const env = { ...x.env, [failure]: "on" }
    const failed = result(env, "--start", "1500")
    assert.notEqual(failed.status, 0)
    assert.equal(fs.readFileSync(x.env.DND_FILE, "utf8"), "off")
    assert.equal(fs.existsSync(path.join(x.env.XDG_STATE_HOME, "omarchy-quiet-queue", "session.json")), false)
    fs.rmSync(x.root, { recursive: true, force: true })
  }
})

test("a publication failure rolls back DND and removes private temporaries", () => {
  const x = setup(); const dir = path.join(x.env.XDG_STATE_HOME, "omarchy-quiet-queue")
  fs.mkdirSync(path.join(dir, "session.json"), { recursive: true })
  const failed = result(x.env, "--start", "1500")
  assert.notEqual(failed.status, 0)
  assert.equal(fs.readFileSync(x.env.DND_FILE, "utf8"), "off")
  assert.deepEqual(fs.readdirSync(dir).filter(name => name.startsWith(".session.") && name !== ".session.lock"), [])
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
test("a symlinked state-path component is refused without touching its target", () => {
  const x = setup(); const victim = path.join(x.root, "victim-state"); fs.mkdirSync(victim)
  fs.mkdirSync(path.dirname(x.env.XDG_STATE_HOME), { recursive: true }); fs.symlinkSync(victim, x.env.XDG_STATE_HOME)
  const failed = result(x.env, "--scan")
  assert.notEqual(failed.status, 0); assert.deepEqual(fs.readdirSync(victim), [])
  fs.rmSync(x.root, { recursive: true, force: true })
})
test("a relative state root is refused", () => {
  const x = setup(); const failed = result({ ...x.env, XDG_STATE_HOME: "relative-state" }, "--scan")
  assert.notEqual(failed.status, 0); assert.match(failed.stderr, /absolute/)
  fs.rmSync(x.root, { recursive: true, force: true })
})
test("an oversized session file reads as no session instead of being parsed", () => {
  const x = setup()
  const dir = path.join(x.env.XDG_STATE_HOME, "omarchy-quiet-queue"); fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, "session.json"), "x".repeat(8192))
  const scanned = run(x.env, "--scan"); assert.equal(scanned.until, 0); assert.equal(scanned.owned, false)
  fs.rmSync(x.root, { recursive: true, force: true })
})

test("same-UID final and temporary session swaps never write through to a victim", async () => {
  const x = setup(); const dir = path.join(x.env.XDG_STATE_HOME, "omarchy-quiet-queue")
  fs.mkdirSync(dir, { recursive: true })
  const victim = path.join(x.root, "victim-session"); fs.writeFileSync(victim, "precious", { mode: 0o640 })
  const marker = path.join(x.root, "session-racer-ready")
  const racer = spawn(process.execPath, [path.join(__dirname, "fixtures", "session-swap-racer.js"), dir, victim, marker], { stdio: "ignore" })
  await waitFor(marker)
  for (let i = 0; i < 40; i++) spawnSync(helper, ["--start", "1500"], { encoding: "utf8", env: x.env })
  await waitFor(`${marker}.attacked`); await stopRacer(racer)
  assert.equal(fs.readFileSync(victim, "utf8"), "precious")
  assert.equal(fs.statSync(victim).mode & 0o777, 0o640)
  const final = run(x.env, "--start", "1500"); assert.equal(final.silenced, true)
  assert.doesNotThrow(() => JSON.parse(fs.readFileSync(path.join(dir, "session.json"), "utf8")))
  assert.deepEqual(fs.readdirSync(dir).filter(name => name.startsWith(".session.") && name !== ".session.lock" && fs.lstatSync(path.join(dir, name)).isFile()), [])
  fs.rmSync(x.root, { recursive: true, force: true })
})

test("same-UID parent swaps cannot redirect session publication or DND ownership", async () => {
  const x = setup(); const dir = path.join(x.env.XDG_STATE_HOME, "omarchy-quiet-queue")
  fs.mkdirSync(dir, { recursive: true })
  const victimDir = path.join(x.root, "victim-parent"); fs.mkdirSync(victimDir)
  const marker = path.join(x.root, "parent-racer-ready")
  fs.writeFileSync(x.env.DND_FILE, "on")
  const racer = spawn(process.execPath, [path.join(__dirname, "fixtures", "parent-swap-racer.js"), dir, victimDir, marker], { stdio: "ignore" })
  await waitFor(marker)
  for (let i = 0; i < 40; i++) spawnSync(helper, ["--start", "1500"], { encoding: "utf8", env: x.env })
  await waitFor(`${marker}.attacked`); await stopRacer(racer)
  assert.equal(fs.existsSync(path.join(victimDir, "session.json")), false)
  assert.equal(fs.readFileSync(x.env.DND_FILE, "utf8"), "on")
  const parked = `${dir}.parked`
  try { if (fs.lstatSync(dir).isSymbolicLink()) fs.unlinkSync(dir) } catch {}
  if (!fs.existsSync(dir) && fs.existsSync(parked)) fs.renameSync(parked, dir)
  else if (fs.existsSync(parked)) fs.rmSync(parked, { recursive: true, force: true })
  const final = run(x.env, "--start", "1500"); assert.equal(final.owned, false)
  assert.doesNotThrow(() => JSON.parse(fs.readFileSync(path.join(dir, "session.json"), "utf8")))
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

// An unreadable Do Not Disturb state is unknown, never "off". Every mutation
// below is refused while the read fails, and the session record is untouched.
const sessionPath = x => path.join(x.env.XDG_STATE_HOME, "omarchy-quiet-queue", "session.json")
const setDndCalls = x => (fs.existsSync(`${x.env.DND_FILE}.calls`) ? fs.readFileSync(`${x.env.DND_FILE}.calls`, "utf8") : "")
  .split("\n").filter(line => line.startsWith("notifications setDnd"))
const READ_FAILURES = {
  fail: "the read exits non-zero",
  "fail-with-on": "the read prints on but exits non-zero",
  "function-missing": "the read prints an error message and exits zero",
  garbage: "the read prints something that is neither on nor off",
  empty: "the read prints nothing",
  long: "the read prints far more than a state word"
}

for (const [mode, why] of Object.entries(READ_FAILURES)) {
  test(`scan treats an unreadable DND state as unknown and keeps the owned session (${why})`, () => {
    const x = setup(); const started = run(x.env, "--start", "1500"); assert.equal(started.owned, true)
    const before = fs.readFileSync(sessionPath(x), "utf8"); const callsBefore = setDndCalls(x).length
    const unknown = run({ ...x.env, DND_READ: mode }, "--scan")
    assert.equal(unknown.known, false); assert.equal(unknown.silenced, null)
    assert.equal(unknown.owned, true); assert.equal(unknown.until, started.until)
    assert.equal(fs.readFileSync(sessionPath(x), "utf8"), before)
    assert.equal(fs.readFileSync(x.env.DND_FILE, "utf8"), "on")
    assert.equal(setDndCalls(x).length, callsBefore)
    // Once Omarchy answers again the session is exactly as it was left.
    const recovered = run(x.env, "--scan")
    assert.equal(recovered.known, true); assert.equal(recovered.silenced, true); assert.equal(recovered.owned, true)
    assert.equal(recovered.until, started.until)
    fs.rmSync(x.root, { recursive: true, force: true })
  })
}

test("an unreadable DND state refuses --end without touching DND or the session", () => {
  const x = setup(); run(x.env, "--start", "1500")
  const before = fs.readFileSync(sessionPath(x), "utf8"); const callsBefore = setDndCalls(x).length
  const refused = result({ ...x.env, DND_READ: "fail" }, "--end")
  assert.equal(refused.status, 3, refused.stderr)
  assert.equal(JSON.parse(refused.stdout).known, false)
  assert.equal(fs.readFileSync(sessionPath(x), "utf8"), before)
  assert.equal(fs.readFileSync(x.env.DND_FILE, "utf8"), "on")
  assert.equal(setDndCalls(x).length, callsBefore)
  const ended = run(x.env, "--end"); assert.equal(ended.silenced, false)
  assert.equal(fs.readFileSync(x.env.DND_FILE, "utf8"), "off")
  fs.rmSync(x.root, { recursive: true, force: true })
})

test("an unreadable DND state refuses --start without touching DND or creating a session", () => {
  const x = setup()
  const refused = result({ ...x.env, DND_READ: "fail" }, "--start", "1500")
  assert.equal(refused.status, 3, refused.stderr); assert.match(refused.stderr, /cannot read/i)
  assert.equal(fs.existsSync(sessionPath(x)), false)
  assert.equal(fs.readFileSync(x.env.DND_FILE, "utf8"), "off")
  assert.deepEqual(setDndCalls(x), [])
  fs.rmSync(x.root, { recursive: true, force: true })
})

test("an unreadable DND state never ends an expired owned session", () => {
  const x = setup(); const dir = path.dirname(sessionPath(x))
  fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(sessionPath(x), '{"until":1,"owned":true}\n')
  fs.writeFileSync(x.env.DND_FILE, "on")
  const unknown = run({ ...x.env, DND_READ: "fail" }, "--scan")
  assert.equal(unknown.known, false)
  assert.equal(fs.existsSync(sessionPath(x)), true)
  assert.equal(fs.readFileSync(x.env.DND_FILE, "utf8"), "on")
  assert.deepEqual(setDndCalls(x), [])
  const recovered = run(x.env, "--scan")
  assert.equal(recovered.owned, false); assert.equal(recovered.silenced, false)
  assert.equal(fs.existsSync(sessionPath(x)), false)
  fs.rmSync(x.root, { recursive: true, force: true })
})

test("a DND read that hangs is cut off, reported unknown, and changes nothing", () => {
  const x = setup(); run(x.env, "--start", "1500")
  const before = fs.readFileSync(sessionPath(x), "utf8")
  const began = Date.now()
  const hung = spawnSync(helper, ["--scan"], { encoding: "utf8", timeout: 8000, env: { ...x.env, DND_READ: "hang", QUIET_QUEUE_DND_TIMEOUT: "1" } })
  assert.equal(hung.status, 0, hung.stderr); assert.ok(Date.now() - began < 6000)
  assert.equal(JSON.parse(hung.stdout).known, false)
  assert.equal(fs.readFileSync(sessionPath(x), "utf8"), before)
  assert.equal(fs.readFileSync(x.env.DND_FILE, "utf8"), "on")
  fs.rmSync(x.root, { recursive: true, force: true })
})

test("a start whose DND transition cannot be verified rolls its own change back", () => {
  const x = setup()
  const failed = result({ ...x.env, DND_READ_FAIL_AFTER_SET: "1" }, "--start", "1500")
  assert.notEqual(failed.status, 0); assert.match(failed.stderr, /could not be verified/)
  assert.equal(fs.readFileSync(x.env.DND_FILE, "utf8"), "off")
  assert.equal(fs.existsSync(sessionPath(x)), false)
  assert.deepEqual(setDndCalls(x), ["notifications setDnd on", "notifications setDnd off"])
  fs.rmSync(x.root, { recursive: true, force: true })
})

test("the DND read accepts only exactly on or off, with surrounding whitespace", () => {
  const x = setup(); fs.writeFileSync(x.env.DND_FILE, "on\n")
  const on = run(x.env, "--scan"); assert.equal(on.known, true); assert.equal(on.silenced, true)
  fs.writeFileSync(x.env.DND_FILE, "off\n\n")
  const off = run(x.env, "--scan"); assert.equal(off.known, true); assert.equal(off.silenced, false)
  fs.writeFileSync(x.env.DND_FILE, "ON")
  assert.equal(run(x.env, "--scan").known, false)
  fs.writeFileSync(x.env.DND_FILE, "on off")
  assert.equal(run(x.env, "--scan").known, false)
  fs.rmSync(x.root, { recursive: true, force: true })
})
