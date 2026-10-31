import { createPublicAxios } from '../../services/adapter';
import { isFinalsBracket } from '../../services/bracket';
import {
  aggregateScoreStatuses,
  computeBracketScoreStatus,
  type ScoreStatus,
} from '../../utils/score_status';

export type GroupOverview = {
  bracketId: number;
  index: number;
  title: string | null;
  numPlayers: number;
  status: ScoreStatus;
};

export type DivisionOverview = {
  status: ScoreStatus;
  groups: GroupOverview[];
};

export function previewQueryString(preview: string | null): string {
  return preview ? `?preview=${encodeURIComponent(preview)}` : '';
}

export function groupLabel(bracket: { title?: string | null; index: number }) {
  return bracket.title?.trim() || `Group ${bracket.index}`;
}

export function parseRouteId(value: string | string[] | undefined): number | null {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return null;
  return Number(value);
}

export async function fetchDivisionOverview(
  endpoint: string,
  preview: string | null,
  divisionId: number,
  isTeams: boolean
): Promise<DivisionOverview> {
  const ax = await createPublicAxios();
  const base = `public/tournaments/${encodeURIComponent(endpoint)}/divisions/${divisionId}`;
  const qs = previewQueryString(preview);
  const [bracketsRes, cellsRes] = await Promise.all([
    ax.get(`${base}/brackets${qs}`),
    ax.get(`${base}/${isTeams ? 'team-bracket-cells' : 'bracket-cells'}${qs}`),
  ]);

  const brackets = (bracketsRes.data?.data ?? []) as Array<{
    id: number;
    index: number;
    num_players: number;
    title?: string | null;
  }>;
  const cells = (cellsRes.data?.data ?? []) as Array<{
    bracket_id: number;
    slot_idx: number;
    player_id?: number | null;
    team_id?: number | null;
    score?: string | null;
  }>;

  const cellsByBracket = new Map<number, typeof cells>();
  for (const cell of cells) {
    const list = cellsByBracket.get(cell.bracket_id) ?? [];
    list.push(cell);
    cellsByBracket.set(cell.bracket_id, list);
  }

  const groups: GroupOverview[] = brackets
    .filter((b) => !isFinalsBracket(b))
    .slice()
    .sort((a, b) => a.index - b.index)
    .map((b) => ({
      bracketId: b.id,
      index: b.index,
      title: b.title ?? null,
      numPlayers: b.num_players,
      status: computeBracketScoreStatus(b.num_players, cellsByBracket.get(b.id) ?? []),
    }));

  return {
    status: aggregateScoreStatuses(groups.map((g) => g.status)),
    groups,
  };
}
