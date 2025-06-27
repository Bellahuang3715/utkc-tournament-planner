export interface Club {
  id: number;
  name: string;
  abbreviation: string;
  representative: string;
  contact_email: string;
  created: string;
  updated: string;
  creator_id: number;
}

export interface ClubFormValues {
  name: string;
  abbreviation: string;
  representative?: string;
  contact_email?: string;
}
