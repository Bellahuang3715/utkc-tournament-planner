import type { TextStyle } from "../../utils/brackets_editor/shared";

/**
 * One opening-round slot in a template.
 * Players: map `id`, optional `score`, and `name`.
 * Teams: map `name` only.
 */
export type OpeningSlotCells = {
  id?: string;
  score?: string;
  name: string;
};

/** One worksheet layout inside a size template (Full / Left / Right). */
export type BracketSheetLayout = {
  sheet: string;
  openingSlots: OpeningSlotCells[];
};

/** Shared shape for player and team Excel template maps. */
export type BracketTemplateMap = {
  /** Filename under the matching public/templates/bracket_* folder. */
  file: string;
  expanded: BracketSheetLayout;
  collapsedLeft: BracketSheetLayout;
  collapsedRight: BracketSheetLayout;
};

export type BracketPlayerTemplateMap = BracketTemplateMap;
export type BracketTeamTemplateMap = BracketTemplateMap;

export type BracketExportFormat = "expanded" | "collapsed";

export type BracketExportPlayer = {
  id: string;
  name: string;
  club?: string | null;
  score?: string | number | null;
  noShow?: boolean;
};

export type BracketExportTeam = {
  name: string;
};

export type BracketFillStyles = {
  idStyle?: Partial<TextStyle>;
  textStyle?: Partial<TextStyle>;
};
