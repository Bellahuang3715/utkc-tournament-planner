export interface TeamInterface {
  id: number;
  code: string;
  club_id: number | null;
  /** Display name from clubs table (joined on reads). */
  club: string | null;
  category_id: number;
  category: string;
  /** Hex color from teams_category; used for category chip. */
  category_color?: string | null;
  created: string;
  active: boolean;
  wins: number;
}
