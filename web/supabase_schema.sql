-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Developers Table: Core profile info
create table developers (
  id uuid default uuid_generate_v4() primary key,
  username text unique not null, -- GitHub username as unique identifier
  full_name text,
  avatar_url text,
  bio text,
  location text,
  website_url text,
  twitter_username text,
  product_hunt_username text,
  total_score numeric default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Stats History: For tracking trends over time
create table stats_history (
  id uuid default uuid_generate_v4() primary key,
  developer_id uuid references developers(id) on delete cascade not null,
  recorded_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- GitHub Stats
  github_commits_last_30_days int default 0,
  github_stars_total int default 0,
  github_streak int default 0,
  
  -- X/Twitter Stats
  twitter_followers int default 0,
  twitter_engagement_score numeric default 0, -- Calculated aggregate
  
  -- Product Hunt Stats
  product_hunt_launches int default 0,
  product_hunt_votes_total int default 0,
  
  -- Calculated Scores
  consistency_score numeric default 0,
  engagement_score numeric default 0,
  launch_score numeric default 0,
  daily_total_score numeric default 0
);

-- Index for faster querying of leaderboard
create index idx_developers_total_score on developers(total_score desc);
create index idx_stats_history_developer_id on stats_history(developer_id);
