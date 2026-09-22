export interface Tournament {
  id: number;
  name: string;
  organizer?: string;
  created: string;
  start_time: string;
  location?: string | null;
  description?: string | null;
  club_id?: number;
  creator_id?: number;
  dashboard_public: boolean;
  dashboard_endpoint: string | null;
  dashboard_preview_token?: string | null;
  scorekeeper_token?: string | null;
  players_can_be_in_multiple_teams: boolean;
  auto_assign_courts: boolean;
  logo_path: string | null;
  my_role?: 'organizer' | 'scorekeeper' | null;
}

/** Participant-facing tournament (no preview token). */
export interface TournamentPublic {
  id: number;
  name: string;
  organizer: string;
  start_time: string;
  location: string | null;
  description: string | null;
  dashboard_public: boolean;
  dashboard_endpoint: string | null;
  logo_path: string | null;
}

export interface TournamentMinimal {
  id: number;
}
