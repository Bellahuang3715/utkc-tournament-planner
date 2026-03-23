import type { Club } from "../interfaces/club";

/** Match API club name (case-insensitive); falls back when no match (e.g. import). */
export function resolveClubIdByName(
  clubs: Club[] | undefined,
  clubName: string,
  fallbackId: number,
): number {
  const t = clubName.trim().toLowerCase();
  const hit = clubs?.find((c) => c.name.trim().toLowerCase() === t);
  return hit?.id ?? fallbackId;
}
