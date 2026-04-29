-- Schema for MySQL
CREATE DATABASE IF NOT EXISTS petanque;
USE petanque;

-- 1. Tournaments table
CREATE TABLE IF NOT EXISTS tournaments (
  id VARCHAR(36) PRIMARY KEY,
  organizer_id VARCHAR(255) NOT NULL,
  max_teams INTEGER NOT NULL DEFAULT 8,
  type VARCHAR(50) NOT NULL DEFAULT 'bracket', -- 'bracket', 'round_robin'
  status VARCHAR(50) NOT NULL DEFAULT 'registration', -- 'registration', 'in_progress', 'finished'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Teams table
CREATE TABLE IF NOT EXISTS teams (
  id VARCHAR(36) PRIMARY KEY,
  tournament_id VARCHAR(36),
  creator_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
);

-- 3. Matches table
CREATE TABLE IF NOT EXISTS matches (
  id VARCHAR(36) PRIMARY KEY,
  tournament_id VARCHAR(36),
  round INTEGER NOT NULL,
  match_index INTEGER NOT NULL,
  team1_id VARCHAR(36),
  team2_id VARCHAR(36),
  team1_score INTEGER DEFAULT 0,
  team2_score INTEGER DEFAULT 0,
  winner_id VARCHAR(36),
  status VARCHAR(50) NOT NULL DEFAULT 'waiting', -- 'waiting', 'in_progress', 'finished'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
  FOREIGN KEY (team1_id) REFERENCES teams(id) ON DELETE SET NULL,
  FOREIGN KEY (team2_id) REFERENCES teams(id) ON DELETE SET NULL,
  FOREIGN KEY (winner_id) REFERENCES teams(id) ON DELETE SET NULL
);
