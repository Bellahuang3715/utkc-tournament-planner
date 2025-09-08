// interfaces/division.ts
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
