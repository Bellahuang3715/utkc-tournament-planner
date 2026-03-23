/** Readable foreground on a solid hex background (e.g. category chips). */
export function chipTextColor(bgHex: string | null | undefined): string {
  if (!bgHex) return "#1a1a1a";
  const hex = bgHex.replace("#", "");
  if (hex.length !== 6) return "#1a1a1a";
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 156 ? "#1a1a1a" : "#ffffff";
}

export function categoryChipBackground(
  categoryColor: string | null | undefined,
  categoryName: string,
): string {
  if (categoryColor) return categoryColor;
  const n = categoryName.toLowerCase();
  if (n.includes("women")) return "#fce4ec";
  return "#d0ebff";
}
