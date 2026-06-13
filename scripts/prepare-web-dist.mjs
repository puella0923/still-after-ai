#!/usr/bin/env node
/** Expo SPA → app.html, 정적 랜딩 → index.html (/) */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const dist = path.join(root, 'dist')
const spaIndex = path.join(dist, 'index.html')
const appHtml = path.join(dist, 'app.html')
const staticLanding = path.join(root, 'index.html')

if (!fs.existsSync(spaIndex)) {
  console.error('❌ dist/index.html 없음 — expo export 먼저 실행하세요')
  process.exit(1)
}
if (!fs.existsSync(staticLanding)) {
  console.error('❌ index.html (정적 랜딩) 없음')
  process.exit(1)
}

fs.renameSync(spaIndex, appHtml)
fs.copyFileSync(staticLanding, spaIndex)
console.log('✅ dist/app.html (SPA) + dist/index.html (정적 랜딩)')
