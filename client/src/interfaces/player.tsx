export interface Player {
  id: number;
  tournament_id: number;
  name: string;
  club_id: number;
  /** Display name from clubs table (joined on reads). */
  club: string | null;
  code: string;
  created: string;
  wins: number;
  data: Record<string, any>;
}

export interface PlayerBody {
  name: string;
  club_id: number;
  data: Record<string, any>;
}

export interface PlayerLite {
  id: number;
  code: string | null;
  name: string | null;
  club?: string | null;
}
