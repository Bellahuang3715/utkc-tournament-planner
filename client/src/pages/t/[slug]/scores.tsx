import {
  Box,
  Group,
  Paper,
  Stack,
  Text,
  Title,
  UnstyledButton,
  useComputedColorScheme,
} from '@mantine/core';
import { IconScoreboard } from '@tabler/icons-react';
import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Expanded,
  EXPANDED_SIZES_INDIVIDUALS,
  EXPANDED_SIZES_TEAMS,
} from 'tournament-brackets-ui';

import ParticipantTournamentLayout, {
  useParticipantTournamentSlug,
} from '../../../components/participant/ParticipantTournamentLayout';
import {
  ParticipantEmpty,
  ParticipantLoading,
} from '../../../components/participant/ParticipantUi';
import ScoreStatusBadge from '../../../components/scores/ScoreStatusBadge';
import { DEFAULT_BOOKLET } from '../../../components/utils/brackets_editor/shared';
import { responseIsValid } from '../../../components/utils/util';
import { BracketWithPlayers, BracketWithTeams } from '../../../interfaces/bracket';
import { Player } from '../../../interfaces/player';
import {
  createPublicAxios,
  getPublicDivisionBracketCells,
  getPublicDivisionBracketsWithPlayers,
  getPublicDivisionBracketsWithTeams,
  getPublicDivisionTeamBracketCells,
  getPublicDivisions,
  getPublicPlayers,
} from '../../../services/adapter';
import {
  isFinalsBracket,
  mergeCellsIntoUiPlayers,
  mergeCellsIntoUiTeams,
  toUIPlayersWithClubAbbrev,
  toUITeamSlots,
} from '../../../services/bracket';
import { circledScoreDisplay } from '../../../utils/score_notation';
import {
  aggregateScoreStatuses,
  computeBracketScoreStatus,
  type ScoreStatus,
} from '../../../utils/score_status';

type ExpandedSize = (typeof EXPANDED_SIZES_INDIVIDUALS)[number];

type GroupOverview = {
  bracketId: number;
  index: number;
  title: string | null;
  numPlayers: number;
  status: ScoreStatus;
};

type DivisionOverview = {
  status: ScoreStatus;
  groups: GroupOverview[];
};

function previewQs(preview: string | null): string {
  return preview ? `?preview=${encodeURIComponent(preview)}` : '';
}

function groupLabel(bracket: { title?: string | null; index: number }) {
  return bracket.title?.trim() || `Group ${bracket.index}`;
}

async function fetchDivisionOverview(
  endpoint: string,
  preview: string | null,
  divisionId: number,
  isTeams: boolean
): Promise<DivisionOverview> {
  const ax = await createPublicAxios();
  const base = `public/tournaments/${encodeURIComponent(endpoint)}/divisions/${divisionId}`;
  const qs = previewQs(preview);
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

export default function ParticipantScoresPage() {
  const { slug, preview } = useParticipantTournamentSlug();
  const [divisionId, setDivisionId] = useState<number | null>(null);
  const [bracketId, setBracketId] = useState<number | null>(null);
  const [overviewByDivision, setOverviewByDivision] = useState<
    Record<number, DivisionOverview>
  >({});
  const [loadingStatuses, setLoadingStatuses] = useState(false);

  const colorScheme = useComputedColorScheme('light');
  const bracketTheme = colorScheme === 'dark' ? 'dark' : 'light';

  const bracketTextStyles = useMemo(
    () => ({
      playerId: {
        fontFamily: DEFAULT_BOOKLET.playerId.fontFamily,
        fontSize: DEFAULT_BOOKLET.playerId.fontSize,
      },
      playerText: {
        fontFamily: DEFAULT_BOOKLET.playerText.fontFamily,
        fontSize: DEFAULT_BOOKLET.playerText.fontSize,
      },
    }),
    []
  );

  const swrDivisions = getPublicDivisions(slug || null, preview);
  const swrPlayersDirectory = getPublicPlayers(slug || null, preview);
  const divisions = responseIsValid(swrDivisions)
    ? swrDivisions.data.data ?? []
    : [];

  const clubAbbrevByName = useMemo(() => {
    const players: Player[] = responseIsValid(swrPlayersDirectory)
      ? swrPlayersDirectory.data.data.players ?? []
      : [];
    const map = new Map<string, string>();
    for (const p of players) {
      if (p.club && p.club_abbreviation) {
        map.set(p.club, p.club_abbreviation);
      }
    }
    return map;
  }, [swrPlayersDirectory]);

  const selected = divisions.find((d: any) => d.id === divisionId) ?? null;
  const isTeams = selected?.division_type === 'TEAMS';

  const divisionIdsKey = useMemo(
    () =>
      divisions
        .map((d: any) => `${d.id}:${d.division_type}`)
        .sort()
        .join(','),
    [divisions]
  );

  // Load status for every division (for the division list buttons).
  useEffect(() => {
    if (!slug || !divisionIdsKey) {
      setOverviewByDivision({});
      setLoadingStatuses(false);
      return;
    }

    const parts = divisionIdsKey.split(',').map((part) => {
      const [id, type] = part.split(':');
      return { id: Number(id), isTeams: type === 'TEAMS' };
    });

    let cancelled = false;
    setLoadingStatuses(true);

    const run = async () => {
      const entries = await Promise.all(
        parts.map(async ({ id, isTeams: teams }) => {
          try {
            const overview = await fetchDivisionOverview(slug, preview, id, teams);
            return [id, overview] as const;
          } catch {
            return [id, { status: 'not_started' as ScoreStatus, groups: [] }] as const;
          }
        })
      );
      if (cancelled) return;
      const next: Record<number, DivisionOverview> = {};
      for (const [id, overview] of entries) next[id] = overview;
      setOverviewByDivision(next);
      setLoadingStatuses(false);
    };

    void run();
    const interval = window.setInterval(() => {
      void run();
    }, 15_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [slug, preview, divisionIdsKey]);

  const swrPlayers = getPublicDivisionBracketsWithPlayers(
    slug || null,
    preview,
    !isTeams && divisionId != null ? divisionId : null
  );
  const swrTeams = getPublicDivisionBracketsWithTeams(
    slug || null,
    preview,
    isTeams && divisionId != null ? divisionId : null
  );
  const swrPlayerCells = getPublicDivisionBracketCells(
    slug || null,
    preview,
    !isTeams && divisionId != null ? divisionId : null
  );
  const swrTeamCells = getPublicDivisionTeamBracketCells(
    slug || null,
    preview,
    isTeams && divisionId != null ? divisionId : null
  );

  const brackets = useMemo(() => {
    const raw = isTeams
      ? responseIsValid(swrTeams)
        ? swrTeams.data.data ?? []
        : []
      : responseIsValid(swrPlayers)
        ? swrPlayers.data.data ?? []
        : [];
    return [...raw]
      .filter((b: any) => !isFinalsBracket(b))
      .sort((a: any, b: any) => a.index - b.index);
  }, [isTeams, swrPlayers, swrTeams]);

  const cellsByBracket = useMemo(() => {
    const cells = isTeams
      ? responseIsValid(swrTeamCells)
        ? swrTeamCells.data.data ?? []
        : []
      : responseIsValid(swrPlayerCells)
        ? swrPlayerCells.data.data ?? []
        : [];
    const map = new Map<number, any[]>();
    for (const cell of cells) {
      const list = map.get(cell.bracket_id) ?? [];
      list.push(cell);
      map.set(cell.bracket_id, list);
    }
    return map;
  }, [isTeams, swrPlayerCells, swrTeamCells]);

  // Prefer live SWR data for the selected division's group list / statuses.
  const selectedGroups: GroupOverview[] = useMemo(() => {
    if (divisionId == null) return [];
    if (brackets.length > 0) {
      return brackets.map((b: any) => ({
        bracketId: b.id,
        index: b.index,
        title: b.title ?? null,
        numPlayers: b.num_players,
        status: computeBracketScoreStatus(b.num_players, cellsByBracket.get(b.id) ?? []),
      }));
    }
    return overviewByDivision[divisionId]?.groups ?? [];
  }, [divisionId, brackets, cellsByBracket, overviewByDivision]);

  const selectedBracket =
    brackets.find((b: any) => b.id === bracketId) ??
    null;

  const loadingDivisions = !swrDivisions.data && !swrDivisions.error;
  const loadingGroups =
    divisionId != null &&
    bracketId == null &&
    ((isTeams && !swrTeams.data && !swrTeams.error) ||
      (!isTeams && !swrPlayers.data && !swrPlayers.error));
  const loadingBracket =
    bracketId != null &&
    ((isTeams && !swrTeams.data && !swrTeams.error) ||
      (!isTeams && !swrPlayers.data && !swrPlayers.error));

  return (
    <ParticipantTournamentLayout>
      {loadingDivisions && <ParticipantLoading />}

      {!loadingDivisions && divisions.length === 0 && (
        <ParticipantEmpty>No divisions published yet.</ParticipantEmpty>
      )}

      {/* Step 1: pick division */}
      {divisionId == null && divisions.length > 0 && (
        <Stack gap="md">
          <Group gap="sm" wrap="nowrap" align="flex-start">
            <IconScoreboard size={28} stroke={1.5} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <Title order={2} style={{ fontSize: '1.35rem' }}>
                Scores
              </Title>
              <Text size="sm" c="dimmed">
                Live match results · refreshes automatically
              </Text>
            </div>
          </Group>

          {loadingStatuses && Object.keys(overviewByDivision).length === 0 && (
            <ParticipantLoading />
          )}

          <Stack gap="sm">
            {divisions.map((d: any) => {
              const overview = overviewByDivision[d.id];
              const status = overview?.status ?? 'not_started';
              return (
                <UnstyledButton
                  key={d.id}
                  onClick={() => {
                    setDivisionId(d.id);
                    setBracketId(null);
                  }}
                  style={{
                    display: 'block',
                    width: '100%',
                    borderRadius: 14,
                    padding: '16px',
                    border: '1px solid var(--mantine-color-teal-3)',
                    borderLeft: '4px solid var(--mantine-color-teal-6)',
                    background:
                      'light-dark(var(--mantine-color-teal-0), var(--mantine-color-dark-6))',
                    textAlign: 'left',
                  }}
                >
                  <Group justify="space-between" wrap="nowrap" align="flex-start">
                    <div style={{ minWidth: 0 }}>
                      <Text fw={700}>{d.name}</Text>
                      <Text size="sm" c="dimmed">
                        {overview
                          ? `${overview.groups.length} group${
                              overview.groups.length === 1 ? '' : 's'
                            }`
                          : 'View live scores'}
                      </Text>
                    </div>
                    <ScoreStatusBadge status={status} />
                  </Group>
                </UnstyledButton>
              );
            })}
          </Stack>
        </Stack>
      )}

      {/* Step 2: pick group */}
      {selected && bracketId == null && (
        <Stack gap="md">
          <UnstyledButton
            onClick={() => {
              setDivisionId(null);
              setBracketId(null);
            }}
            style={{ alignSelf: 'flex-start' }}
          >
            <Text size="sm" c="blue">
              ← All divisions
            </Text>
          </UnstyledButton>

          <Group gap="sm" wrap="nowrap" align="flex-start">
            <div style={{ minWidth: 0, flex: 1 }}>
              <Title order={2} style={{ fontSize: '1.25rem' }}>
                {selected.name}
              </Title>
              <Text size="sm" c="dimmed">
                Select a group
              </Text>
            </div>
            <ScoreStatusBadge
              status={
                overviewByDivision[selected.id]?.status ??
                aggregateScoreStatuses(selectedGroups.map((g) => g.status))
              }
            />
          </Group>

          {loadingGroups && <ParticipantLoading />}

          {!loadingGroups && selectedGroups.length === 0 && (
            <ParticipantEmpty>No brackets to score in this division yet.</ParticipantEmpty>
          )}

          <Stack gap="sm">
            {selectedGroups.map((g) => (
              <UnstyledButton
                key={g.bracketId}
                onClick={() => setBracketId(g.bracketId)}
                style={{
                  display: 'block',
                  width: '100%',
                  borderRadius: 14,
                  padding: '16px',
                  border: '1px solid var(--mantine-color-teal-3)',
                  borderLeft: '4px solid var(--mantine-color-teal-6)',
                  textAlign: 'left',
                }}
              >
                <Group justify="space-between" wrap="nowrap" align="flex-start">
                  <div style={{ minWidth: 0 }}>
                    <Text fw={700}>{groupLabel(g)}</Text>
                    <Text size="sm" c="dimmed">
                      {selected.name} · {g.numPlayers}{' '}
                      {isTeams ? 'teams' : 'players'}
                    </Text>
                  </div>
                  <ScoreStatusBadge status={g.status} />
                </Group>
              </UnstyledButton>
            ))}
          </Stack>
        </Stack>
      )}

      {/* Step 3: single group bracket with scores */}
      {selected && bracketId != null && (
        <Stack gap="lg">
          <UnstyledButton
            onClick={() => setBracketId(null)}
            style={{ alignSelf: 'flex-start' }}
          >
            <Text size="sm" c="blue">
              ← All groups
            </Text>
          </UnstyledButton>

          {loadingBracket && <ParticipantLoading />}

          {!loadingBracket && !selectedBracket && (
            <ParticipantEmpty>Group not found.</ParticipantEmpty>
          )}

          {!loadingBracket && selectedBracket && (() => {
            const b = selectedBracket as any;
            const heading = `${selected.name} - ${groupLabel(b)}`;
            const sizeOk = isTeams
              ? (EXPANDED_SIZES_TEAMS as readonly number[]).includes(b.num_players)
              : (EXPANDED_SIZES_INDIVIDUALS as readonly number[]).includes(b.num_players);
            const status = computeBracketScoreStatus(
              b.num_players,
              cellsByBracket.get(b.id) ?? []
            );

            return (
              <Paper
                withBorder
                radius="md"
                p="md"
                style={{ borderLeft: '4px solid var(--mantine-color-teal-6)' }}
              >
                <Group justify="space-between" mb="md" wrap="wrap">
                  <Title order={3} style={{ fontSize: '1.15rem' }}>
                    {heading}
                  </Title>
                  <ScoreStatusBadge status={status} />
                </Group>
                {!sizeOk ? (
                  <Text size="sm" c="dimmed">
                    Bracket size {b.num_players} is not supported for display.
                  </Text>
                ) : (
                  <Box style={{ maxWidth: '100%', overflowX: 'auto' }}>
                    {isTeams ? (
                      <Expanded.Teams
                        key={`teams-scores-${b.id}-${bracketTheme}`}
                        size={b.num_players as ExpandedSize}
                        teams={
                          mergeCellsIntoUiTeams(
                            toUITeamSlots(b as BracketWithTeams),
                            cellsByBracket.get(b.id) ?? []
                          ) as any
                        }
                        mode="view"
                        theme={bracketTheme}
                        teamIDFontFamily={DEFAULT_BOOKLET.playerId.fontFamily}
                        teamIDFontSize={DEFAULT_BOOKLET.playerId.fontSize}
                        formatScoreDisplay={circledScoreDisplay}
                      />
                    ) : (
                      <Expanded.Individuals
                        key={`individuals-scores-${b.id}-${bracketTheme}`}
                        size={b.num_players}
                        players={
                          mergeCellsIntoUiPlayers(
                            toUIPlayersWithClubAbbrev(
                              b as BracketWithPlayers,
                              clubAbbrevByName
                            ) as any,
                            cellsByBracket.get(b.id) ?? [],
                            clubAbbrevByName
                          ) as any
                        }
                        mode="view"
                        theme={bracketTheme}
                        textStyles={bracketTextStyles}
                        formatScoreDisplay={circledScoreDisplay}
                      />
                    )}
                  </Box>
                )}
              </Paper>
            );
          })()}
        </Stack>
      )}
    </ParticipantTournamentLayout>
  );
}

export const getServerSideProps = async ({ locale }: { locale: string }) => ({
  props: {
    ...(await serverSideTranslations(locale ?? 'en', ['common'])),
  },
});
