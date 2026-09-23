import {
  Box,
  Badge,
  Group,
  Paper,
  Stack,
  Text,
  Title,
  UnstyledButton,
  useComputedColorScheme,
} from '@mantine/core';
import { IconList } from '@tabler/icons-react';
import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations';
import React, { useMemo, useState } from 'react';
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
import { DEFAULT_BOOKLET } from '../../../components/utils/brackets_editor/shared';
import { responseIsValid } from '../../../components/utils/util';
import { BracketWithPlayers, BracketWithTeams } from '../../../interfaces/bracket';
import { Player } from '../../../interfaces/player';
import {
  getPublicDivisionBracketsWithPlayers,
  getPublicDivisionBracketsWithTeams,
  getPublicDivisions,
  getPublicPlayers,
} from '../../../services/adapter';
import {
  toUIPlayersWithClubAbbrev,
  toUITeamSlots,
} from '../../../services/bracket';

type ExpandedSize = (typeof EXPANDED_SIZES_INDIVIDUALS)[number];

function groupHeading(divisionName: string, bracket: { title?: string | null; index: number }) {
  const group = bracket.title?.trim() || `Group ${bracket.index}`;
  return `${divisionName} - ${group}`;
}

export default function ParticipantBracketsPage() {
  const { slug, preview } = useParticipantTournamentSlug();
  const [divisionId, setDivisionId] = useState<number | null>(null);
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
    divisionId != null &&
    ((isTeams && !swrTeams.data && !swrTeams.error) ||
      (!isTeams && !swrPlayers.data && !swrPlayers.error));

  return (
    <ParticipantTournamentLayout>
      {loadingDivisions && <ParticipantLoading />}

      {!loadingDivisions && divisions.length === 0 && (
        <ParticipantEmpty>No divisions published yet.</ParticipantEmpty>
      )}

      {divisionId == null && divisions.length > 0 && (
        <Stack gap="md">
          <Group gap="sm" wrap="nowrap" align="flex-start">
            <IconList size={28} stroke={1.5} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <Title order={2} style={{ fontSize: '1.35rem' }}>
                Brackets
              </Title>
              <Text size="sm" c="dimmed">
                Seeding and groups · no scores
              </Text>
            </div>
          </Group>

          <Stack gap="sm">
            {divisions.map((d: any) => (
              <UnstyledButton
                key={d.id}
                onClick={() => setDivisionId(d.id)}
                style={{
                  display: 'block',
                  width: '100%',
                  borderRadius: 14,
                  padding: '16px',
                  border: '1px solid var(--mantine-color-default-border)',
                  borderLeft: '4px solid var(--mantine-color-indigo-6)',
                  textAlign: 'left',
                }}
              >
                <Group justify="space-between" wrap="nowrap" align="flex-start">
                  <div style={{ minWidth: 0 }}>
                    <Text fw={700}>{d.name}</Text>
                    <Text size="sm" c="dimmed">
                      View bracket seeding
                    </Text>
                  </div>
                  <Badge color="indigo" variant="light">
                    {d.division_type === 'TEAMS' ? 'Teams' : 'Individuals'}
                  </Badge>
                </Group>
              </UnstyledButton>
            ))}
          </Stack>
        </Stack>
      )}

      {selected && (
        <Stack gap="lg">
          <UnstyledButton
            onClick={() => setDivisionId(null)}
            style={{ alignSelf: 'flex-start' }}
          >
            <Text size="sm" c="blue">
              ← All divisions
            </Text>
          </UnstyledButton>

          {loadingBrackets && <ParticipantLoading />}

          {!loadingBrackets && brackets.length === 0 && (
            <ParticipantEmpty>No brackets generated for this division yet.</ParticipantEmpty>
          )}

          {!loadingBrackets &&
            brackets.map((b: any) => {
              const heading = groupHeading(selected.name, b);
              const sizeOk = isTeams
                ? (EXPANDED_SIZES_TEAMS as readonly number[]).includes(b.num_players)
                : (EXPANDED_SIZES_INDIVIDUALS as readonly number[]).includes(b.num_players);

              return (
                <Paper
                  key={b.id}
                  withBorder
                  radius="md"
                  p="md"
                  style={{
                    borderLeft: '4px solid var(--mantine-color-indigo-6)',
                  }}
                >
                  <Title order={3} mb="md" style={{ fontSize: '1.15rem' }}>
                    {heading}
                  </Title>
                  {!sizeOk ? (
                    <Text size="sm" c="dimmed">
                      Bracket size {b.num_players} is not supported for display.
                    </Text>
                  ) : (
                    <Box style={{ maxWidth: '100%', overflowX: 'auto' }}>
                      {isTeams ? (
                        <Expanded.Teams
                          key={`teams-${b.id}-${bracketTheme}`}
                          size={b.num_players as ExpandedSize}
                          teams={toUITeamSlots(b as BracketWithTeams) as any}
                          mode="view"
                          theme={bracketTheme}
                          teamIDFontFamily={DEFAULT_BOOKLET.playerId.fontFamily}
                          teamIDFontSize={DEFAULT_BOOKLET.playerId.fontSize}
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
                          textStyles={bracketTextStyles}
                        />
                      )}
                    </Box>
                  )}
                </Paper>
              );
            })}
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
