const STORAGE_KEY = "scorekeeper_tokens";

type TokenMap = Record<string, string>;

function readMap(): TokenMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeMap(map: TokenMap) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function storeScorekeeperToken(tournamentId: number, token: string) {
  const map = readMap();
  map[String(tournamentId)] = token;
  writeMap(map);
}

export function getScorekeeperToken(tournamentId: number): string | null {
  return readMap()[String(tournamentId)] ?? null;
}

export function clearScorekeeperToken(tournamentId: number) {
  const map = readMap();
  delete map[String(tournamentId)];
  writeMap(map);
}

/** Parse `/tournaments/{id}/...` from the current path. */
export function getTournamentIdFromPath(pathname?: string): number | null {
  if (typeof window === "undefined" && !pathname) return null;
  const path = pathname ?? window.location.pathname;
  const match = path.match(/\/tournaments\/(\d+)(?:\/|$)/);
  if (!match) return null;
  const id = parseInt(match[1], 10);
  return Number.isFinite(id) ? id : null;
}

export function getScorekeeperTokenForCurrentPath(): string | null {
  const id = getTournamentIdFromPath();
  return id != null ? getScorekeeperToken(id) : null;
}

export function hasAnyScorekeeperToken(): boolean {
  return Object.keys(readMap()).length > 0;
}

export function hasScorekeeperTokenForPath(pathname?: string): boolean {
  const id = getTournamentIdFromPath(pathname);
  return id != null && getScorekeeperToken(id) != null;
}
