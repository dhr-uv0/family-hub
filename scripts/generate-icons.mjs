import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

const sizes = [72, 96, 128, 144, 152, 192, 384, 512]
const dir = join(process.cwd(), 'public', 'icons')

mkdirSync(dir, { recursive: true })

for (const size of sizes) {
  const fontSize = Math.round(size * 0.35)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.2)}" fill="#14b8a6"/>
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="bold" font-size="${fontSize}" fill="white">FH</text>
</svg>`
  writeFileSync(join(dir, `icon-${size}x${size}.svg`), svg)
  console.log(`Created icon-${size}x${size}.svg`)
}
console.log('Done!')
