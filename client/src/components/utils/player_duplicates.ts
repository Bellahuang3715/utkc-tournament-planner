export type PlayerSnapshot = {
  id: string;
  name: string;
  clubId: number;
  clubName: string;
  data: Record<string, unknown>;
  source: string;
  saved: boolean;
  code?: string | null;
};

export type DuplicateGroup = {
  key: string;
  name: string;
  clubName: string;
  saved: PlayerSnapshot[];
  pending: PlayerSnapshot[];
};

export function normalizePlayerName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function duplicateKey(name: string, clubId: number) {
  return `${clubId}::${normalizePlayerName(name)}`;
}

/** Groups that need a choice: several unsaved copies, or a new player matching one already saved. */
export function findDuplicateGroups(
  pending: PlayerSnapshot[],
  saved: PlayerSnapshot[],
): DuplicateGroup[] {
  const keys = new Set(pending.map((player) => duplicateKey(player.name, player.clubId)));
  const groups: DuplicateGroup[] = [];

  for (const key of keys) {
    const pendingMatches = pending.filter(
      (player) => duplicateKey(player.name, player.clubId) === key,
    );
    const savedMatches = saved.filter(
      (player) => duplicateKey(player.name, player.clubId) === key,
    );
    if (pendingMatches.length < 2 && savedMatches.length === 0) continue;
    groups.push({
      key,
      name: pendingMatches[0].name,
      clubName: pendingMatches[0].clubName,
      saved: savedMatches,
      pending: pendingMatches,
    });
  }

  return groups;
}

export function playersToInsert(
  pending: PlayerSnapshot[],
  groups: DuplicateGroup[],
  keptIds: string[],
): PlayerSnapshot[] {
  const inAGroup = new Set(groups.flatMap((group) => group.pending.map((player) => player.id)));
  const kept = new Set(keptIds);
  return pending.filter((player) => !inAGroup.has(player.id) || kept.has(player.id));
}
