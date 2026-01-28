-- Fix RLS and security warnings
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. Enable RLS on developers & stats_history
-- ============================================

ALTER TABLE developers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stats_history ENABLE ROW LEVEL SECURITY;

-- Developers: anyone can read, only service role can write
CREATE POLICY "Anyone can view developers" ON developers
  FOR SELECT USING (true);

CREATE POLICY "Service role can insert developers" ON developers
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update developers" ON developers
  FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY "Service role can delete developers" ON developers
  FOR DELETE USING (auth.role() = 'service_role');

-- Stats History: anyone can read, only service role can write
CREATE POLICY "Anyone can view stats_history" ON stats_history
  FOR SELECT USING (true);

CREATE POLICY "Service role can insert stats_history" ON stats_history
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update stats_history" ON stats_history
  FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY "Service role can delete stats_history" ON stats_history
  FOR DELETE USING (auth.role() = 'service_role');

-- ============================================
-- 2. Fix mutable search_path on functions
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION start_spar(spar_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.spars
  SET
    status = 'active',
    actual_start = NOW(),
    actual_end = NOW() + (duration_hours || ' hours')::INTERVAL
  WHERE id = spar_id AND status = 'accepted';
END;
$$;

CREATE OR REPLACE FUNCTION complete_spar(spar_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  spar_record public.spars%ROWTYPE;
  winner UUID;
BEGIN
  SELECT * INTO spar_record FROM public.spars WHERE id = spar_id;

  IF spar_record.creator_commits > spar_record.opponent_commits THEN
    winner := spar_record.creator_id;
  ELSIF spar_record.opponent_commits > spar_record.creator_commits THEN
    winner := spar_record.opponent_id;
  ELSE
    winner := NULL;
  END IF;

  UPDATE public.spars
  SET status = 'completed', winner_id = winner
  WHERE id = spar_id;

  IF winner IS NOT NULL THEN
    UPDATE public.users SET spar_wins = spar_wins + 1 WHERE id = winner;

    IF winner = spar_record.creator_id THEN
      UPDATE public.users SET spar_losses = spar_losses + 1 WHERE id = spar_record.opponent_id;
    ELSE
      UPDATE public.users SET spar_losses = spar_losses + 1 WHERE id = spar_record.creator_id;
    END IF;
  END IF;
END;
$$;

-- ============================================
-- 3. Fix spar_commits RLS - restrict inserts to service role
-- ============================================

-- Drop the overly permissive insert policy
DROP POLICY IF EXISTS "System can insert commits" ON spar_commits;

-- Replace with service role only
CREATE POLICY "Service role can insert commits" ON spar_commits
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update commits" ON spar_commits
  FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY "Service role can delete commits" ON spar_commits
  FOR DELETE USING (auth.role() = 'service_role');
