import { BRACKET_TEMPLATE_2, BRACKET_TEAM_TEMPLATE_2 } from "./size2";
import { BRACKET_TEMPLATE_4, BRACKET_TEAM_TEMPLATE_4 } from "./size4";
import { BRACKET_TEMPLATE_5, BRACKET_TEAM_TEMPLATE_5 } from "./size5";
import { BRACKET_TEMPLATE_6, BRACKET_TEAM_TEMPLATE_6 } from "./size6";
import { BRACKET_TEMPLATE_7, BRACKET_TEAM_TEMPLATE_7 } from "./size7";
import { BRACKET_TEMPLATE_8, BRACKET_TEAM_TEMPLATE_8 } from "./size8";
import { BRACKET_TEMPLATE_9, BRACKET_TEAM_TEMPLATE_9 } from "./size9";
import { BRACKET_TEMPLATE_10, BRACKET_TEAM_TEMPLATE_10 } from "./size10";
import { BRACKET_TEMPLATE_11, BRACKET_TEAM_TEMPLATE_11 } from "./size11";
import { BRACKET_TEMPLATE_12, BRACKET_TEAM_TEMPLATE_12 } from "./size12";
import { BRACKET_TEMPLATE_13, BRACKET_TEAM_TEMPLATE_13 } from "./size13";
import { BRACKET_TEMPLATE_14, BRACKET_TEAM_TEMPLATE_14 } from "./size14";
import { BRACKET_TEMPLATE_15, BRACKET_TEAM_TEMPLATE_15 } from "./size15";
import { BRACKET_TEMPLATE_16, BRACKET_TEAM_TEMPLATE_16 } from "./size16";
import type {
  BracketExportFormat,
  BracketPlayerTemplateMap,
  BracketSheetLayout,
  BracketTeamTemplateMap,
  BracketTemplateMap,
} from "./types";

export type {
  OpeningSlotCells,
  BracketSheetLayout,
  BracketTemplateMap,
  BracketPlayerTemplateMap,
  BracketTeamTemplateMap,
  BracketExportFormat,
  BracketExportPlayer,
  BracketExportTeam,
  BracketFillStyles,
} from "./types";

/** num_players → player template map. */
export const BRACKET_PLAYER_TEMPLATES: Record<number, BracketPlayerTemplateMap> =
  {
    2: BRACKET_TEMPLATE_2,
    4: BRACKET_TEMPLATE_4,
    5: BRACKET_TEMPLATE_5,
    6: BRACKET_TEMPLATE_6,
    7: BRACKET_TEMPLATE_7,
    8: BRACKET_TEMPLATE_8,
    9: BRACKET_TEMPLATE_9,
    10: BRACKET_TEMPLATE_10,
    11: BRACKET_TEMPLATE_11,
    12: BRACKET_TEMPLATE_12,
    13: BRACKET_TEMPLATE_13,
    14: BRACKET_TEMPLATE_14,
    15: BRACKET_TEMPLATE_15,
    16: BRACKET_TEMPLATE_16,
  };

/** num_players (bracket size) → team template map. */
export const BRACKET_TEAM_TEMPLATES: Record<number, BracketTeamTemplateMap> = {
  2: BRACKET_TEAM_TEMPLATE_2,
  4: BRACKET_TEAM_TEMPLATE_4,
  5: BRACKET_TEAM_TEMPLATE_5,
  6: BRACKET_TEAM_TEMPLATE_6,
  7: BRACKET_TEAM_TEMPLATE_7,
  8: BRACKET_TEAM_TEMPLATE_8,
  9: BRACKET_TEAM_TEMPLATE_9,
  10: BRACKET_TEAM_TEMPLATE_10,
  11: BRACKET_TEAM_TEMPLATE_11,
  12: BRACKET_TEAM_TEMPLATE_12,
  13: BRACKET_TEAM_TEMPLATE_13,
  14: BRACKET_TEAM_TEMPLATE_14,
  15: BRACKET_TEAM_TEMPLATE_15,
  16: BRACKET_TEAM_TEMPLATE_16,
};

export function getBracketPlayerTemplate(
  numPlayers: number,
): BracketPlayerTemplateMap | null {
  return BRACKET_PLAYER_TEMPLATES[numPlayers] ?? null;
}

export function getBracketTeamTemplate(
  numPlayers: number,
): BracketTeamTemplateMap | null {
  return BRACKET_TEAM_TEMPLATES[numPlayers] ?? null;
}

export function resolveBracketSheetLayout(
  map: BracketTemplateMap,
  format: BracketExportFormat,
  groupIndex: number,
): BracketSheetLayout {
  if (format === "expanded") return map.expanded;
  return groupIndex % 2 === 1 ? map.collapsedLeft : map.collapsedRight;
}

export function bracketPlayerTemplateUrl(map: BracketPlayerTemplateMap): string {
  return `/templates/bracket_players/${map.file}`;
}

export function bracketTeamTemplateUrl(map: BracketTeamTemplateMap): string {
  return `/templates/bracket_teams/${map.file}`;
}

export function exportFormatLabel(format: BracketExportFormat): string {
  return format === "expanded" ? "Expanded" : "Collapsed";
}
