-- Create the tables for the Petanque Tournament Mode

-- 1. Tournaments table
CREATE TABLE IF NOT EXISTS tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id TEXT NOT NULL,
  max_teams INTEGER NOT NULL DEFAULT 8,
  status TEXT NOT NULL DEFAULT 'registration', -- 'registration', 'in_progress', 'finished'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Teams table
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Matches table
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  match_index INTEGER NOT NULL,
  team1_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  team2_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  team1_score INTEGER DEFAULT 0,
  team2_score INTEGER DEFAULT 0,
  winner_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'waiting', -- 'waiting', 'in_progress', 'finished'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Realtime for all tables
-- Note: This might need to be run manually if the publication already exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE tournaments;
ALTER PUBLICATION supabase_realtime ADD TABLE teams;
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
