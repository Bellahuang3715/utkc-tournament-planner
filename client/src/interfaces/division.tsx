export type DivisionType = 'INDIVIDUALS' | 'TEAMS';

export interface Division {
  id: number;
  name: string;
  prefix?: string | null;
  tournament_id: number;
  duration_mins: number;
  margin_mins: number;
  division_type: DivisionType;
  created: string; // ISO datetime
}

export type DivisionPlayer = {
  id: number;
  name: string;
  club: string;
  code: string | null;
  /** From players table data.participant_number; used as display ID in Division B. */
  participant_number?: string | null;
  bias: boolean;
};

export type DivisionTeam = {
  id: number;
  code: string;
  club_id?: number;
  club: string;
  category: string;
  category_color?: string | null;
  bias: boolean;
};

export interface DivisionFormValues {
  name: string;
  prefix?: string;
  duration_mins: number;
  margin_mins: number;
  division_type: DivisionType;
}

export interface DivisionCreateValues extends DivisionFormValues {
  tournament_id: number;
}
