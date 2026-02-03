-- Resources table for Community Resources
-- Run this in Supabase SQL Editor

CREATE TABLE resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'guide',  -- guide, template, podcast, community, tool, video
  url TEXT,
  icon_name TEXT DEFAULT 'BookOpen',   -- Lucide icon name
  sort_order INTEGER DEFAULT 0,
  featured BOOLEAN DEFAULT false,      -- Show on homepage
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster querying
CREATE INDEX idx_resources_type ON resources(type);
CREATE INDEX idx_resources_featured ON resources(featured) WHERE featured = true;
CREATE INDEX idx_resources_sort ON resources(sort_order);

-- RLS: anyone can read, only service role can write
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view resources" ON resources
  FOR SELECT USING (true);

CREATE POLICY "Service role can insert resources" ON resources
  FOR INSERT WITH CHECK ((select auth.role()) = 'service_role');

CREATE POLICY "Service role can update resources" ON resources
  FOR UPDATE USING ((select auth.role()) = 'service_role');

CREATE POLICY "Service role can delete resources" ON resources
  FOR DELETE USING ((select auth.role()) = 'service_role');

-- Seed with initial resources (the ones currently hardcoded on homepage)
INSERT INTO resources (title, description, type, url, icon_name, sort_order, featured) VALUES
  ('Getting Started Guide', 'Everything you need to know to start building in public effectively.', 'guide', '#', 'GraduationCap', 1, true),
  ('Tweet Templates', '50+ proven templates for sharing your progress and growing your audience.', 'template', '#', 'FileText', 2, true),
  ('Builder Podcast', 'Weekly interviews with top builders sharing their strategies and lessons.', 'podcast', '#', 'Podcast', 3, true),
  ('Community Discord', 'Join 500+ builders for feedback, accountability, and collaboration.', 'community', '#', 'MessageSquare', 4, true);
