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
} from '../../../../components/participant/ParticipantTournamentLayout';
import {
  PARTICIPANT_BRACKET_TEAM_ID_FONT_SIZE,
  PARTICIPANT_BRACKET_TEXT_STYLES,
  ParticipantBracketFrame,
  ParticipantEmpty,
  ParticipantLoading,
  ParticipantPageTitle,
} from '../../../../components/participant/ParticipantUi';
import uiClasses from '../../../../components/participant/participant_ui.module.css';
import { DEFAULT_BOOKLET } from '../../../../components/utils/brackets_editor/shared';
import { responseIsValid } from '../../../../components/utils/util';
import { BracketWithPlayers, BracketWithTeams } from '../../../../interfaces/bracket';
import { Player } from '../../../../interfaces/player';
import {
  getPublicDivisionBracketsWithPlayers,
  getPublicDivisionBracketsWithTeams,
  getPublicDivisions,
  getPublicPlayers,
} from '../../../../services/adapter';
import {
  toUIPlayersWithClubAbbrev,
  toUITeamSlots,
} from '../../../../services/bracket';

type ExpandedSize = (typeof EXPANDED_SIZES_INDIVIDUALS)[number];

function groupHeading(divisionName: string, bracket: { title?: string | null; index: number }) {
  const group = bracket.title?.trim() || `Group ${bracket.index}`;
  return `${divisionName} - ${group}`;
}

export default function ParticipantDivisionBracketsPage() {
  const router = useRouter();
  const { slug, preview } = useParticipantTournamentSlug();
  const colorScheme = useComputedColorScheme('light');
  const bracketTheme = colorScheme === 'dark' ? 'dark' : 'light';

  const divisionId =
    typeof router.query.divisionId === 'string' && /^\d+$/.test(router.query.divisionId)
      ? Number(router.query.divisionId)
      : null;

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

  const brackets = useMemo(() => {
    const raw = isTeams
      ? responseIsValid(swrTeams)
        ? swrTeams.data.data ?? []
        : []
      : responseIsValid(swrPlayers)
        ? swrPlayers.data.data ?? []
        : [];
    return [...raw]
      .filter((b: any) => (b.title ?? '') !== 'Finals')
      .sort((a: any, b: any) => a.index - b.index);
  }, [isTeams, swrPlayers, swrTeams]);

  const loadingDivisions = !swrDivisions.data && !swrDivisions.error;
  const loadingBrackets =
    selected != null &&
    ((isTeams && !swrTeams.data && !swrTeams.error) ||
      (!isTeams && !swrPlayers.data && !swrPlayers.error));

  return (
    <ParticipantTournamentLayout>
      <Stack gap="md">
        {loadingDivisions && <ParticipantLoading />}

        {!loadingDivisions && divisionId == null && (
          <ParticipantEmpty>Invalid division.</ParticipantEmpty>
        )}

        {!loadingDivisions && divisionId != null && !selected && (
          <ParticipantEmpty>Division not found.</ParticipantEmpty>
        )}

        {selected && (
          <>
            <ParticipantPageTitle
              title={selected.name}
              subtitle="Groups and seeding for this division."
            />

            {loadingBrackets && <ParticipantLoading />}

            {!loadingBrackets && brackets.length === 0 && (
              <ParticipantEmpty>
                No brackets generated for this division yet.
              </ParticipantEmpty>
            )}

            {!loadingBrackets &&
              brackets.map((b: any) => {
                const heading = groupHeading(selected.name, b);
                const sizeOk = isTeams
                  ? (EXPANDED_SIZES_TEAMS as readonly number[]).includes(b.num_players)
                  : (EXPANDED_SIZES_INDIVIDUALS as readonly number[]).includes(
                      b.num_players
                    );

                const accent = isTeams
                  ? 'var(--mantine-color-teal-6)'
                  : 'var(--mantine-color-indigo-6)';

                return (
                  <Paper
                    key={b.id}
                    withBorder
                    radius="md"
                    p={{ base: 'sm', sm: 'md' }}
                    style={{
                      borderLeft: `3px solid ${accent}`,
                    }}
                  >
                    <Text className={uiClasses.sectionCardLabel} mb="sm">
                      {heading}
                    </Text>
                    {!sizeOk ? (
                      <Text size="sm" c="dimmed">
                        Bracket size {b.num_players} is not supported for display.
                      </Text>
                    ) : (
                      <ParticipantBracketFrame>
                        {isTeams ? (
                          <Expanded.Teams
                            key={`teams-${b.id}-${bracketTheme}`}
                            size={b.num_players as ExpandedSize}
                            teams={toUITeamSlots(b as BracketWithTeams) as any}
                            mode="view"
                            theme={bracketTheme}
                            teamIDFontFamily={DEFAULT_BOOKLET.playerId.fontFamily}
                            teamIDFontSize={PARTICIPANT_BRACKET_TEAM_ID_FONT_SIZE}
                          />
                        ) : (
                          <Expanded.Individuals
                            key={`individuals-${b.id}-${bracketTheme}`}
                            size={b.num_players}
                            players={
                              toUIPlayersWithClubAbbrev(
                                b as BracketWithPlayers,
                                clubAbbrevByName
                              ) as any
                            }
                            mode="view"
                            theme={bracketTheme}
                            textStyles={PARTICIPANT_BRACKET_TEXT_STYLES}
                          />
                        )}
                      </ParticipantBracketFrame>
                    )}
                  </Paper>
                );
              })}
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
