import type { BracketPlayerTemplateMap } from "./types";

/**
 * Cell maps for `public/templates/bracket_players/12-player.xlsx`.
 * Collapsed: odd groups → Left, even groups → Right.
 */
export const BRACKET_TEMPLATE_12: BracketPlayerTemplateMap = {
  file: "12-player.xlsx",
  expanded: {
    sheet: "Full",
    openingSlots: [
      { id: "A4", score: "B4", name: "A6" },
      { id: "A8", score: "B8", name: "A10" },
      { id: "A14", score: "B14", name: "A16" },
      { id: "A18", score: "B18", name: "A20" },
      { id: "A25", score: "B25", name: "A27" },
      { id: "A29", score: "B29", name: "A31" },
      { id: "A34", score: "B34", name: "A36" },
      { id: "A38", score: "B38", name: "A40" },
      { id: "E10", score: "F10", name: "E12" },
      { id: "E20", score: "F20", name: "E22" },
      { id: "E31", score: "F31", name: "E33" },
      { id: "E40", score: "F40", name: "E42" },
    ],
  },
  // TODO: fill Left/Right cell maps
  collapsedLeft: {
    sheet: "Left", openingSlots: [
      { id: "A2", name: "A4" },
      { id: "A6", name: "A8" },
      { id: "A14", name: "A16" },
      { id: "A18", name: "A20" },
      { id: "A26", name: "A28" },
      { id: "A30", name: "A32" },
      { id: "A38", name: "A40" },
      { id: "A42", name: "A44" },
      { id: "A10", name: "A12" },
      { id: "A22", name: "A24" },
      { id: "A34", name: "A36" },
      { id: "A46", name: "A48" },
    ]
  },
  collapsedRight: {
    sheet: "Right", openingSlots: [
      { id: "F2", name: "F4" },
      { id: "F6", name: "F8" },
      { id: "F14", name: "F16" },
      { id: "F18", name: "F20" },
      { id: "F26", name: "F28" },
      { id: "F30", name: "F32" },
      { id: "F38", name: "F40" },
      { id: "F42", name: "F44" },
      { id: "F10", name: "F12" },
      { id: "F22", name: "F24" },
      { id: "F34", name: "F36" },
      { id: "F46", name: "F48" },
    ]
  },
};
