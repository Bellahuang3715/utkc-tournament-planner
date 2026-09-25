import { Accordion, Badge, Group, Stack, Text } from '@mantine/core';
import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations';
import React, { useMemo, useState } from 'react';

import ParticipantTournamentLayout, {
  useParticipantTournamentSlug,
} from '../../../components/participant/ParticipantTournamentLayout';
import {
  ParticipantEmpty,
  ParticipantLoading,
  ParticipantPageTitle,
  ParticipantSearchInput,
} from '../../../components/participant/ParticipantUi';
import { responseIsValid } from '../../../components/utils/util';
import { Player } from '../../../interfaces/player';
import { getPublicPlayers } from '../../../services/adapter';

type ClubGroup = {
  clubId: number;
  name: string;
  abbreviation: string | null;
  players: Player[];
};

function playerRank(p: Player): string {
  const rank = p.data?.rank;
  return typeof rank === 'string' && rank.trim() ? rank.trim() : '—';
}

export default function ParticipantPlayersPage() {
  const { slug, preview } = useParticipantTournamentSlug();
  const [query, setQuery] = useState('');
  const swrPlayers = getPublicPlayers(slug || null, preview);

  const players: Player[] = responseIsValid(swrPlayers)
    ? swrPlayers.data.data.players ?? []
    : [];

  const clubs = useMemo(() => {
    const q = query.trim().toLowerCase();
    const byClub = new Map<number, ClubGroup>();

    for (const p of players) {
      if (q) {
        const haystack =
          `${p.name} ${p.code ?? ''} ${p.club ?? ''} ${p.club_abbreviation ?? ''} ${p.data?.rank ?? ''}`.toLowerCase();
        if (!haystack.includes(q)) continue;
      }

      const existing = byClub.get(p.club_id);
      if (existing) {
        existing.players.push(p);
      } else {
        byClub.set(p.club_id, {
          clubId: p.club_id,
          name: p.club?.trim() || 'Unknown club',
          abbreviation: p.club_abbreviation ?? null,
          players: [p],
        });
      }
    }

    return [...byClub.values()]
      .map((club) => ({
        ...club,
        players: [...club.players].sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [players, query]);

  const filteredCount = clubs.reduce((n, c) => n + c.players.length, 0);

  return (
    <ParticipantTournamentLayout>
      <Stack gap="lg">
        <ParticipantPageTitle
          title="Players"
          subtitle="Everyone entered in this tournament, grouped by club."
        />
        <ParticipantSearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search name, code, rank, or club"
        />

        {!swrPlayers.data && !swrPlayers.error && <ParticipantLoading />}

        {swrPlayers.data && clubs.length === 0 && (
          <ParticipantEmpty>
            {players.length === 0
              ? 'No players published yet.'
              : 'No players match your search.'}
          </ParticipantEmpty>
        )}

        {clubs.length > 0 && (
          <Accordion variant="separated" radius="md" multiple>
            {clubs.map((club) => (
              <Accordion.Item key={club.clubId} value={String(club.clubId)}>
                <Accordion.Control>
                  <Group gap="sm" wrap="nowrap" justify="space-between" pr="xs">
                    <div style={{ minWidth: 0 }}>
                      <Text fw={600} truncate>
                        {club.name}
                        {club.abbreviation ? ` (${club.abbreviation})` : ''}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {club.players.length}{' '}
                        {club.players.length === 1 ? 'player' : 'players'}
                      </Text>
                    </div>
                  </Group>
                </Accordion.Control>
                <Accordion.Panel>
                  <Stack gap={8}>
                    {club.players.map((p) => (
                      <Group
                        key={p.id}
                        justify="space-between"
                        wrap="nowrap"
                        gap="sm"
                        align="flex-start"
                      >
                        <div style={{ minWidth: 0 }}>
                          <Text size="sm" fw={600} truncate>
                            {p.name}
                          </Text>
                          <Text size="xs" c="dimmed">
                            Rank: {playerRank(p)}
                          </Text>
                        </div>
                        {p.code ? (
                          <Badge variant="light" size="sm">
                            {p.code}
                          </Badge>
                        ) : null}
                      </Group>
                    ))}
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>
            ))}
          </Accordion>
        )}

        {swrPlayers.data && players.length > 0 && (
          <Text size="xs" c="dimmed" ta="center">
            Showing {filteredCount} of {players.length}
          </Text>
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
