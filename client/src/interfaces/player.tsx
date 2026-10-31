export interface Player {
  id: number;
  tournament_id: number;
  name: string;
  club_id: number;
  /** Display name from clubs table (joined on reads). */
  club: string | null;
  /** Club abbreviation from clubs table (joined on reads). */
  club_abbreviation: string | null;
  code: string;
  created: string;
  wins: number;
  data: Record<string, any>;
  /** Roster position when this player is returned on a team (e.g. SENPO). */
  position?: string | null;
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
