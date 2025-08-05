export interface Player {
  id: number;
  tournament_id: number;
  name: string;
  club: string;
  code: string;
  created: string;
  wins: number;
  data: Record<string, any>;
}

export interface PlayerBody {
  name: string;
  club: string;
  data: Record<string, any>;
}
