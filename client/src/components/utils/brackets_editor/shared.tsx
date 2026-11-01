// ---- Types & constants (shared with individuals + teams) ----
export type TextStyle = {
  fontFamily: string;
  fontSize: number;
  color: string;
  bold?: boolean;
};

export type StyleTarget = "playerId" | "playerText" | "bracketTitle";

export type FormatStyles = Record<StyleTarget, TextStyle>;

export const defaultTitleStyle: TextStyle = {
  fontFamily: "Arial, sans-serif",
  fontSize: 12,
  color: "#000000",
};

export const FONT_CHOICES = [
  "Inter, system-ui, Avenir, Helvetica, Arial, sans-serif",
  "Roboto, Helvetica, Arial, sans-serif",
  "Georgia, serif",
  "Courier New, monospace",
];

export const DEFAULT_BOOKLET: FormatStyles = {
  playerId: { fontFamily: FONT_CHOICES[1], fontSize: 14, color: "#000000" },
  playerText: { fontFamily: FONT_CHOICES[1], fontSize: 12, color: "#000000" },
  bracketTitle: { fontFamily: FONT_CHOICES[1], fontSize: 12, color: "#000000" },
};

export const DEFAULT_POSTER: FormatStyles = {
  playerId: { fontFamily: FONT_CHOICES[1], fontSize: 14, color: "#000000" },
  playerText: { fontFamily: FONT_CHOICES[1], fontSize: 12, color: "#000000" },
  bracketTitle: { fontFamily: FONT_CHOICES[1], fontSize: 18, color: "#000000" },
};
