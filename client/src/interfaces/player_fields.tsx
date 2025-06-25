export type PlayerFieldTypes = 'TEXT' | 'BOOLEAN' | 'NUMBER' | 'DROPDOWN';

export interface FieldInsertable {
  key: string;
  label: string;
  include: boolean;
  type: PlayerFieldTypes;
  options: string[];
  position: number;
}

export interface SaveFieldsInsertable {
  fields: FieldInsertable[];
}
