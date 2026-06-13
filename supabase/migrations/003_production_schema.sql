-- ============================================================
-- Migration 003: 프로덕션 스키마 정합 (앱 코드와 일치)
-- 실행: Supabase Dashboard > SQL Editor에 붙여넣고 Run
-- 또는: npm run supabase:apply-migration
-- ============================================================

-- ── personas: 누락 컬럼 ─────────────────────────────────────
ALTER TABLE personas
  ADD COLUMN IF NOT EXISTS photo_url      TEXT         DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS user_nickname  TEXT         DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_archived    BOOLEAN      DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_at    TIMESTAMPTZ  DEFAULT NULL;

-- ── profiles (회원 닉네임) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname    TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_own" ON profiles;
CREATE POLICY "profiles_own"
  ON profiles FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ── closure_letters (이별 편지) ───────────────────────────────
CREATE TABLE IF NOT EXISTS closure_letters (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  persona_id   UUID        NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  content      TEXT        NOT NULL,
  ai_farewell  TEXT        DEFAULT '',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE closure_letters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "closure_letters_own" ON closure_letters;
CREATE POLICY "closure_letters_own"
  ON closure_letters FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── user_feedback (탈퇴 사유 / 일반 피드백) ───────────────────
CREATE TABLE IF NOT EXISTS user_feedback (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  type        TEXT        NOT NULL,   -- 'account_deletion' | 'general'
  content     TEXT        NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_feedback_insert" ON user_feedback;
CREATE POLICY "user_feedback_insert"
  ON user_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ── user_usage: 페르소나별 무료/결제 (구 스키마 마이그레이션) ──
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_usage'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_usage'
      AND column_name = 'persona_id'
  ) THEN
    DROP POLICY IF EXISTS "user_usage_own" ON user_usage;
    ALTER TABLE user_usage RENAME TO user_usage_legacy;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS user_usage (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  persona_id    UUID        NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  message_count INTEGER     NOT NULL DEFAULT 0,
  is_paid       BOOLEAN     NOT NULL DEFAULT false,
  paid_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, persona_id)
);

ALTER TABLE user_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_usage_own" ON user_usage;
CREATE POLICY "user_usage_own"
  ON user_usage FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TABLE IF EXISTS user_usage_legacy;

-- ── persona-photos 스토리지 버킷 ──────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('persona-photos', 'persona-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "persona_photos_select" ON storage.objects;
DROP POLICY IF EXISTS "persona_photos_insert" ON storage.objects;
DROP POLICY IF EXISTS "persona_photos_update" ON storage.objects;
DROP POLICY IF EXISTS "persona_photos_delete" ON storage.objects;

CREATE POLICY "persona_photos_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'persona-photos');

CREATE POLICY "persona_photos_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'persona-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "persona_photos_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'persona-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "persona_photos_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'persona-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
