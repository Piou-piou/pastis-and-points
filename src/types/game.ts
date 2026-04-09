export type GameMode = '1vs1' | '2vs2';

export interface Team {
  name: string;
  color: string;
  totalScore: number;
  roundScore: number;
}

export interface GameState {
  mode: GameMode;
  redTeam: Team;
  blueTeam: Team;
  isGameOver: boolean;
  winningScore: number;
}
