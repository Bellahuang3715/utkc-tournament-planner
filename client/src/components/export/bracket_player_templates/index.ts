import { BRACKET_TEMPLATE_8 } from "./size8";
import { BRACKET_TEMPLATE_12 } from "./size12";
import type { BracketPlayerTemplateMap } from "./types";

export type { BracketPlayerTemplateMap, BracketExportPlayer, BracketFillStyles } from "./types";

/** num_players → template map. Add entries as you create new .xlsx + mappings. */
export const BRACKET_PLAYER_TEMPLATES: Record<number, BracketPlayerTemplateMap> = {
  8: BRACKET_TEMPLATE_8,
  12: BRACKET_TEMPLATE_12,
};

export function getBracketPlayerTemplate(
  numPlayers: number,
): BracketPlayerTemplateMap | null {
  return BRACKET_PLAYER_TEMPLATES[numPlayers] ?? null;
}

export function bracketPlayerTemplateUrl(map: BracketPlayerTemplateMap): string {
  return `/templates/bracket_players/${map.file}`;
}
