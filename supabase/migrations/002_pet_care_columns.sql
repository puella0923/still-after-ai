-- ============================================================
-- Migration 002: 펫 케어 컬럼 추가
-- 실행: Supabase SQL Editor에 붙여넣고 Run
-- ============================================================

-- 펫 전용 컬럼 추가 (이미 있으면 무시)
ALTER TABLE personas
  ADD COLUMN IF NOT EXISTS pet_personality  TEXT[]       DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pet_habits       TEXT         DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pet_bond         TEXT         DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pet_favorites    TEXT         DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pet_last_memory  TEXT         DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pet_unsaid       TEXT         DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pet_nickname     TEXT         DEFAULT NULL;

-- timing 컬럼 (떠난 시점 — human/pet 공통)
ALTER TABLE personas
  ADD COLUMN IF NOT EXISTS timing           TEXT         DEFAULT NULL;

-- updated_at 컬럼
ALTER TABLE personas
  ADD COLUMN IF NOT EXISTS updated_at       TIMESTAMPTZ  DEFAULT NOW();
