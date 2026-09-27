export interface TeamInterface {
  id: number;
  code: string;
  club_id: number | null;
  /** Every club on the team. */
  club_ids?: number[];
  /** Display names from clubs, joined on reads. */
  club: string | null;
  category_id: number;
  category: string;
  /** Hex color from teams_category; used for category chip. */
  category_color?: string | null;
  created: string;
  wins: number;
}
