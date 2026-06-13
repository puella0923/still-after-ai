/**
 * Supabase SQL 마이그레이션 적용 (Management API)
 *
 * 필요: .env 에 SUPABASE_ACCESS_TOKEN
 * 사용: npm run supabase:apply-migration
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_REF = 'vqtsehnebtslppamubmj'
const MIGRATION = resolve(__dirname, '../supabase/migrations/003_production_schema.sql')

function loadEnv() {
  try {
    const raw = readFileSync(resolve(__dirname, '../.env'), 'utf8')
    for (const line of raw.split('\n')) {
      const m = line.match(/^([^#=]+)=(.*)$/)
      if (m) process.env[m[1].trim()] = m[2].trim()
    }
  } catch { /* no .env */ }
}

loadEnv()

const token = process.env.SUPABASE_ACCESS_TOKEN
if (!token) {
  console.error('SUPABASE_ACCESS_TOKEN 이 .env 에 없습니다.')
  process.exit(1)
}

const sql = readFileSync(MIGRATION, 'utf8')

const res = await fetch(
  `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  }
)

const body = await res.text()
if (!res.ok) {
  console.error('마이그레이션 실패:', res.status, body)
  process.exit(1)
}

console.log('✅ Migration 003 적용 완료')
try {
  const parsed = JSON.parse(body)
  if (Array.isArray(parsed) && parsed.length) console.log(parsed)
} catch { /* empty result is ok */ }
