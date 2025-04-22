export interface TeamInterface {
  id: number;
  name: string;
  dojo: string;
  created: string;
  active: boolean;
  elo_score: number;
  swiss_score: number;
  wins: number;
  draws: number;
  losses: number;
}
