import type { TextStyle } from "../../utils/brackets_editor/shared";

/** One opening-round player slot in the template. */
export type OpeningSlotCells = {
  id: string;
  score?: string;
  name: string;
};

/** One worksheet layout inside a size template (Full / Left / Right). */
export type BracketSheetLayout = {
  sheet: string;
  openingSlots: OpeningSlotCells[];
};

export type BracketPlayerTemplateMap = {
  /** Template file under /templates/bracket_players/ */
  file: string;
  expanded: BracketSheetLayout;
  collapsedLeft: BracketSheetLayout;
  collapsedRight: BracketSheetLayout;
};

export type BracketExportFormat = "expanded" | "collapsed";

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
