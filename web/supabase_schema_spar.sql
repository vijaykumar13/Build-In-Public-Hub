-- Spar Mode Database Schema
-- Run this in Supabase SQL Editor

-- Users table (for authenticated users with spar stats)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_id TEXT UNIQUE NOT NULL,
  github_username TEXT NOT NULL,
  email TEXT,
  avatar_url TEXT,
  stripe_customer_id TEXT,
  spar_wins INTEGER DEFAULT 0,
  spar_losses INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Spars table (the challenge itself)
CREATE TABLE IF NOT EXISTS spars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES users(id) NOT NULL,
  opponent_id UUID REFERENCES users(id),
  opponent_github_username TEXT, -- For invites before opponent registers

  -- Spar config
  title TEXT NOT NULL,
  description TEXT,
  duration_hours INTEGER NOT NULL DEFAULT 24, -- 24, 48, or 72
  entry_fee_cents INTEGER NOT NULL DEFAULT 999, -- $9.99

  -- Status: pending, accepted, active, completed, cancelled
  status TEXT NOT NULL DEFAULT 'pending',

  -- Timing
  scheduled_start TIMESTAMPTZ,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,

  -- Results
  winner_id UUID REFERENCES users(id),
  creator_commits INTEGER DEFAULT 0,
  opponent_commits INTEGER DEFAULT 0,

  -- Payment (for future use)
  creator_paid BOOLEAN DEFAULT FALSE,
  opponent_paid BOOLEAN DEFAULT FALSE,
  stripe_payment_intent_creator TEXT,
  stripe_payment_intent_opponent TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Spar commits (tracked during battle)
CREATE TABLE IF NOT EXISTS spar_commits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spar_id UUID REFERENCES spars(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,

  -- Commit data
  commit_sha TEXT NOT NULL,
  commit_message TEXT,
  repo_name TEXT,
  repo_url TEXT,
  committed_at TIMESTAMPTZ NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(spar_id, commit_sha)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_spars_status ON spars(status);
CREATE INDEX IF NOT EXISTS idx_spars_creator ON spars(creator_id);
CREATE INDEX IF NOT EXISTS idx_spars_opponent ON spars(opponent_id);
CREATE INDEX IF NOT EXISTS idx_spars_scheduled_start ON spars(scheduled_start);
CREATE INDEX IF NOT EXISTS idx_spar_commits_spar ON spar_commits(spar_id);
CREATE INDEX IF NOT EXISTS idx_spar_commits_user ON spar_commits(user_id);
CREATE INDEX IF NOT EXISTS idx_users_github_id ON users(github_id);
CREATE INDEX IF NOT EXISTS idx_users_github_username ON users(github_username);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE spars ENABLE ROW LEVEL SECURITY;
ALTER TABLE spar_commits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view all users" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid()::text = github_id);

-- RLS Policies for spars table
CREATE POLICY "Anyone can view spars" ON spars
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create spars" ON spars
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Spar participants can update their spar" ON spars
  FOR UPDATE USING (
    creator_id IN (SELECT id FROM users WHERE github_id = auth.uid()::text)
    OR opponent_id IN (SELECT id FROM users WHERE github_id = auth.uid()::text)
  );

-- RLS Policies for spar_commits table
CREATE POLICY "Anyone can view spar commits" ON spar_commits
  FOR SELECT USING (true);

CREATE POLICY "System can insert commits" ON spar_commits
  FOR INSERT WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_spars_updated_at
  BEFORE UPDATE ON spars
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to start a spar (called when both users are ready)
CREATE OR REPLACE FUNCTION start_spar(spar_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE spars
  SET
    status = 'active',
    actual_start = NOW(),
    actual_end = NOW() + (duration_hours || ' hours')::INTERVAL
  WHERE id = spar_id AND status = 'accepted';
END;
$$ language 'plpgsql';

-- Function to complete a spar and declare winner
CREATE OR REPLACE FUNCTION complete_spar(spar_id UUID)
RETURNS void AS $$
DECLARE
  spar_record spars%ROWTYPE;
  winner UUID;
BEGIN
  SELECT * INTO spar_record FROM spars WHERE id = spar_id;

  -- Determine winner based on commit count
  IF spar_record.creator_commits > spar_record.opponent_commits THEN
    winner := spar_record.creator_id;
  ELSIF spar_record.opponent_commits > spar_record.creator_commits THEN
    winner := spar_record.opponent_id;
  ELSE
    winner := NULL; -- It's a tie
  END IF;

  -- Update spar with winner
  UPDATE spars
  SET
    status = 'completed',
    winner_id = winner
  WHERE id = spar_id;

  -- Update user stats
  IF winner IS NOT NULL THEN
    UPDATE users SET spar_wins = spar_wins + 1 WHERE id = winner;

    IF winner = spar_record.creator_id THEN
      UPDATE users SET spar_losses = spar_losses + 1 WHERE id = spar_record.opponent_id;
    ELSE
      UPDATE users SET spar_losses = spar_losses + 1 WHERE id = spar_record.creator_id;
    END IF;
  END IF;
END;
$$ language 'plpgsql';
