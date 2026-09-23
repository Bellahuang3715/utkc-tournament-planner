const STORAGE_KEY = "scorekeeper_access";
const SESSION_ID_KEY = "scorekeeper_edit_session_id";

export type ScorekeeperAccess = {
  token: string;
  firstName: string;
  lastName: string;
};

type AccessMap = Record<string, ScorekeeperAccess>;

function readMap(): AccessMap {
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

function writeMap(map: AccessMap) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function getOrCreateEditSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = sessionStorage.getItem(SESSION_ID_KEY);
  if (!id) {
    id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `sess-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(SESSION_ID_KEY, id);
  }
  return id;
}

export function storeScorekeeperAccess(
  tournamentId: number,
  access: ScorekeeperAccess
) {
  const map = readMap();
  map[String(tournamentId)] = {
    token: access.token,
    firstName: access.firstName.trim(),
    lastName: access.lastName.trim(),
  };
  writeMap(map);
  getOrCreateEditSessionId();
}

/** @deprecated use storeScorekeeperAccess */
export function storeScorekeeperToken(tournamentId: number, token: string) {
  const existing = getScorekeeperAccess(tournamentId);
  storeScorekeeperAccess(tournamentId, {
    token,
    firstName: existing?.firstName ?? "",
    lastName: existing?.lastName ?? "",
  });
}

export function getScorekeeperAccess(
  tournamentId: number
): ScorekeeperAccess | null {
  return readMap()[String(tournamentId)] ?? null;
}

export function getScorekeeperToken(tournamentId: number): string | null {
  return getScorekeeperAccess(tournamentId)?.token ?? null;
}

export function getScorekeeperDisplayName(tournamentId: number): string | null {
  const access = getScorekeeperAccess(tournamentId);
  if (!access) return null;
  const name = `${access.firstName} ${access.lastName}`.trim();
  return name || null;
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

export function getEditSessionIdForRequests(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(SESSION_ID_KEY);
}

export function hasAnyScorekeeperToken(): boolean {
  return Object.keys(readMap()).length > 0;
}

export function hasScorekeeperTokenForPath(pathname?: string): boolean {
  const id = getTournamentIdFromPath(pathname);
  return id != null && getScorekeeperToken(id) != null;
}
