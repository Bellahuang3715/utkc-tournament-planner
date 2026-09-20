import type { TextStyle } from "../../utils/brackets_editor/shared";

/** One opening-round player slot in the template. */
export type OpeningSlotCells = {
  id: string;
  score?: string;
  name: string;
};

export type BracketPlayerTemplateMap = {
  /** Template file under /templates/bracket_players/ */
  file: string;
  /** Worksheet to fill and copy into the division workbook. */
  sheet: string;
  openingSlots: OpeningSlotCells[];
};

export type BracketExportPlayer = {
  id: string;
  name: string;
  club?: string | null;
  score?: string | number | null;
  noShow?: boolean;
};

export type BracketFillStyles = {
  idStyle?: Partial<TextStyle>;
  textStyle?: Partial<TextStyle>;
};
