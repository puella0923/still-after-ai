-- ============================================================
-- Still After — Supabase 초기 스키마
-- 실행 방법: Supabase Dashboard > SQL Editor에 이 내용을 붙여넣고 Run
-- ============================================================

CREATE TABLE IF NOT EXISTS personas (
  id              UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID         REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT         NOT NULL,
  relationship    TEXT         NOT NULL,
  care_type       TEXT         DEFAULT 'human',
  raw_chat_text   TEXT,
  parsed_messages JSONB        DEFAULT '[]',
  system_prompt   TEXT,
  message_style   JSONB        DEFAULT '{}',
  emotional_stage TEXT         DEFAULT 'replay',
  is_active       BOOLEAN      DEFAULT true,
  created_at      TIMESTAMPTZ  DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversations (
  id                  UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             UUID         REFERENCES auth.users(id) ON DELETE CASCADE,
  persona_id          UUID         REFERENCES personas(id) ON DELETE CASCADE,
  role                TEXT         NOT NULL,       -- 'user' | 'assistant'
  content             TEXT         NOT NULL,
  emotional_stage     TEXT         DEFAULT 'replay',
  is_danger_detected  BOOLEAN      DEFAULT false,
  created_at          TIMESTAMPTZ  DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE personas      ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "personas_own"      ON personas;
DROP POLICY IF EXISTS "conversations_own" ON conversations;

CREATE POLICY "personas_own"
  ON personas FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "conversations_own"
  ON conversations FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- user_usage — 무료 체험 카운터 / 결제 상태
-- ============================================================
CREATE TABLE IF NOT EXISTS user_usage (
  user_id             UUID         PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan                TEXT         DEFAULT 'free',    -- 'free' | 'paid'
  free_messages_used  INTEGER      DEFAULT 0,
  subscribed_at       TIMESTAMPTZ,
  updated_at          TIMESTAMPTZ  DEFAULT NOW()
);

ALTER TABLE user_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_usage_own" ON user_usage;

CREATE POLICY "user_usage_own"
  ON user_usage FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
