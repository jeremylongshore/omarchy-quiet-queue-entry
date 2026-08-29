const fs = require("node:fs")
const [dir, victim, marker] = process.argv.slice(2)
const parked = `${dir}.parked`
fs.writeFileSync(marker, "ready")
for (;;) {
  try {
    fs.renameSync(dir, parked)
    fs.symlinkSync(victim, dir)
    fs.writeFileSync(`${marker}.attacked`, "parent")
    fs.unlinkSync(dir)
    fs.renameSync(parked, dir)
  } catch {
    try { if (fs.existsSync(parked) && !fs.existsSync(dir)) fs.renameSync(parked, dir) } catch {}
  }
}
