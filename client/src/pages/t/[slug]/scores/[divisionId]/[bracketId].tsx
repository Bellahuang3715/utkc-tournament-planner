import { Paper, Stack, Text, useComputedColorScheme } from '@mantine/core';
import { useRouter } from 'next/router';
import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations';
import React, { useMemo } from 'react';
import {
  Expanded,
  EXPANDED_SIZES_INDIVIDUALS,
  EXPANDED_SIZES_TEAMS,
} from 'tournament-brackets-ui';

import ParticipantTournamentLayout, {
  useParticipantTournamentSlug,
} from '../../../../../components/participant/ParticipantTournamentLayout';
import {
  PARTICIPANT_BRACKET_TEAM_ID_FONT_SIZE,
  PARTICIPANT_BRACKET_TEXT_STYLES,
  ParticipantBracketFrame,
  ParticipantEmpty,
  ParticipantLoading,
  ParticipantPageTitle,
} from '../../../../../components/participant/ParticipantUi';
import {
  groupLabel,
  parseRouteId,
} from '../../../../../components/participant/scores_shared';
import ScoreStatusBadge from '../../../../../components/scores/ScoreStatusBadge';
import { DEFAULT_BOOKLET } from '../../../../../components/utils/brackets_editor/shared';
import { responseIsValid } from '../../../../../components/utils/util';
import { BracketWithPlayers, BracketWithTeams } from '../../../../../interfaces/bracket';
import { Player } from '../../../../../interfaces/player';
import {
  getPublicDivisionBracketCells,
  getPublicDivisionBracketsWithPlayers,
  getPublicDivisionBracketsWithTeams,
  getPublicDivisionTeamBracketCells,
  getPublicDivisions,
  getPublicPlayers,
} from '../../../../../services/adapter';
import {
  isFinalsBracket,
  mergeCellsIntoUiPlayers,
  mergeCellsIntoUiTeams,
  toUIPlayersWithClubAbbrev,
  toUITeamSlots,
} from '../../../../../services/bracket';
import { circledScoreDisplay } from '../../../../../utils/score_notation';
import {
  SCORE_STATUS_ACCENT,
  computeBracketScoreStatus,
} from '../../../../../utils/score_status';

type ExpandedSize = (typeof EXPANDED_SIZES_INDIVIDUALS)[number];

export default function ParticipantScoresGroupPage() {
  const router = useRouter();
  const { slug, preview } = useParticipantTournamentSlug();
  const divisionId = parseRouteId(router.query.divisionId);
  const bracketId = parseRouteId(router.query.bracketId);
  const colorScheme = useComputedColorScheme('light');
  const bracketTheme = colorScheme === 'dark' ? 'dark' : 'light';

  const swrDivisions = getPublicDivisions(slug || null, preview);
  const swrPlayersDirectory = getPublicPlayers(slug || null, preview);
  const divisions = responseIsValid(swrDivisions)
    ? swrDivisions.data.data ?? []
    : [];
  const selected = divisions.find((d: any) => d.id === divisionId) ?? null;
  const isTeams = selected?.division_type === 'TEAMS';

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

  const selectedBracket = brackets.find((b: any) => b.id === bracketId) ?? null;

  const loadingDivisions = !swrDivisions.data && !swrDivisions.error;
  const loadingBracket =
    selected != null &&
    ((isTeams && !swrTeams.data && !swrTeams.error) ||
      (!isTeams && !swrPlayers.data && !swrPlayers.error));

  return (
    <ParticipantTournamentLayout>
      <Stack gap="md">
        {loadingDivisions && <ParticipantLoading />}

        {!loadingDivisions && (divisionId == null || bracketId == null) && (
          <ParticipantEmpty>Invalid scores link.</ParticipantEmpty>
        )}

        {!loadingDivisions && divisionId != null && !selected && (
          <ParticipantEmpty>Division not found.</ParticipantEmpty>
        )}

        {selected && (
          <>
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
                <>
                  <ParticipantPageTitle
                    title={heading}
                    subtitle="Live scores for this group."
                    actions={<ScoreStatusBadge status={status} size="xs" />}
                  />
                  <Paper
                    withBorder
                    radius="md"
                    p={{ base: 'sm', sm: 'md' }}
                    style={{ borderLeft: `3px solid ${SCORE_STATUS_ACCENT[status]}` }}
                  >
                    {!sizeOk ? (
                      <Text size="sm" c="dimmed">
                        Bracket size {b.num_players} is not supported for display.
                      </Text>
                    ) : (
                      <ParticipantBracketFrame>
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
                            teamIDFontSize={PARTICIPANT_BRACKET_TEAM_ID_FONT_SIZE}
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
                            textStyles={PARTICIPANT_BRACKET_TEXT_STYLES}
                            formatScoreDisplay={circledScoreDisplay}
                          />
                        )}
                      </ParticipantBracketFrame>
                    )}
                  </Paper>
                </>
              );
            })()}
          </>
        )}
      </Stack>
    </ParticipantTournamentLayout>
  );
}

export const getServerSideProps = async ({ locale }: { locale: string }) => ({
  props: {
    ...(await serverSideTranslations(locale ?? 'en', ['common'])),
  },
});
