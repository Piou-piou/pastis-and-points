export type TournamentStatus = 'registration' | 'in_progress' | 'finished';
export type MatchStatus = 'waiting' | 'in_progress' | 'finished';

export interface Tournament {
  id: string;
  organizer_id: string;
  max_teams: number;
  status: TournamentStatus;
  created_at: string;
}

export interface TournamentTeam {
  id: string;
  tournament_id: string;
  name: string;
  created_at: string;
}

export interface Match {
  id: string;
  tournament_id: string;
  round: number;
  match_index: number;
  team1_id: string | null;
  team2_id: string | null;
  team1_score: number;
  team2_score: number;
  winner_id: string | null;
  status: MatchStatus;
  created_at: string;
}

export interface TournamentState {
  tournament: Tournament | null;
  teams: TournamentTeam[];
  matches: Match[];
}
