-- Migration 004: Outreach Pipeline
-- Adds outreach_log table for tracking automated outreach to discovered builders

-- Outreach log table
CREATE TABLE IF NOT EXISTS outreach_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  twitter_username TEXT NOT NULL,
  twitter_user_id TEXT,
  outreach_type TEXT NOT NULL DEFAULT 'mention', -- mention, dm, email
  outreach_status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, failed, replied, signed_up
  message_text TEXT,
  source TEXT, -- hashtag_monitor, follower_scrape, manual
  priority_score NUMERIC DEFAULT 0,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT,
  developer_id UUID REFERENCES developers(id),
  signup_id UUID REFERENCES hashtag_signups(id),
  UNIQUE(twitter_username, outreach_type)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_outreach_log_status ON outreach_log(outreach_status);
CREATE INDEX IF NOT EXISTS idx_outreach_log_type ON outreach_log(outreach_type);
CREATE INDEX IF NOT EXISTS idx_outreach_log_created ON outreach_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_outreach_log_username ON outreach_log(twitter_username);

-- Enable RLS
ALTER TABLE outreach_log ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (admin operations)
CREATE POLICY "Service role full access on outreach_log"
  ON outreach_log
  FOR ALL
  USING (true)
  WITH CHECK (true);
