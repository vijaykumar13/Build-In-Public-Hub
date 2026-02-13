-- Migration: Hashtag Monitoring & Auto-Add Pipeline
-- Run this in Supabase SQL Editor

-- 1. New table: hashtag_signups
CREATE TABLE IF NOT EXISTS hashtag_signups (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  twitter_username TEXT NOT NULL,
  twitter_name TEXT,
  twitter_bio TEXT,
  twitter_followers INT DEFAULT 0,
  twitter_avatar_url TEXT,
  hashtag_used TEXT NOT NULL,
  tweet_id TEXT UNIQUE NOT NULL,
  tweet_text TEXT,
  status TEXT DEFAULT 'discovered' CHECK (status IN ('discovered', 'added', 'ignored')),
  developer_id UUID REFERENCES developers(id) ON DELETE SET NULL,
  discovered_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_hashtag_signups_status ON hashtag_signups(status);
CREATE INDEX IF NOT EXISTS idx_hashtag_signups_twitter ON hashtag_signups(twitter_username);
CREATE INDEX IF NOT EXISTS idx_hashtag_signups_discovered ON hashtag_signups(discovered_at DESC);

-- Enable RLS (service_role bypasses it)
ALTER TABLE hashtag_signups ENABLE ROW LEVEL SECURITY;

-- 2. New table: monitor_state (tracks last processed tweet per hashtag)
CREATE TABLE IF NOT EXISTS monitor_state (
  id TEXT PRIMARY KEY,
  last_tweet_id TEXT,
  last_run_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  metadata JSONB DEFAULT '{}'::jsonb
);

ALTER TABLE monitor_state ENABLE ROW LEVEL SECURITY;

-- 3. Add source and onboarding_completed columns to developers
ALTER TABLE developers ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'onboarding';
ALTER TABLE developers ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT true;

-- Set existing developers as onboarding-completed
UPDATE developers SET onboarding_completed = true WHERE onboarding_completed IS NULL;
UPDATE developers SET source = 'onboarding' WHERE source IS NULL;
