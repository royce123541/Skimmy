// Fails the build if a store package would ask for platform access at install time.
// Platforms must stay optional and be granted from Settings (docs/adr/0002).
import { readFileSync } from 'node:fs'

const manifestPaths = process.argv.slice(2)
if (manifestPaths.length === 0) {
  console.error('Usage: node scripts/assert-store-manifest.js <manifest.json>...')
  process.exit(1)
}

let failed = false
for (const manifestPath of manifestPaths) {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  const required = manifest.host_permissions ?? []
  if (required.length > 0) {
    console.error(`${manifestPath}: host_permissions must be empty, found ${required.join(', ')}`)
    failed = true
  } else {
    console.log(`${manifestPath}: OK (platform hosts are optional)`)
  }
}
process.exit(failed ? 1 : 0)
