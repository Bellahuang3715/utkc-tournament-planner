export type PlayerFieldTypes = 'TEXT' | 'CHECKBOX' | 'NUMBER' | 'DROPDOWN';

export interface FieldInsertable {
  key: string;
  label: string;
  include: boolean;
  /** When true, later Excel imports must include this column. */
  import_required: boolean;
  type: PlayerFieldTypes;
  options: string[];
  position: number;
}

export interface SaveFieldsInsertable {
  fields: FieldInsertable[];
}
