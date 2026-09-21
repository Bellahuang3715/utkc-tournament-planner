import { Badge, Group, Stack, Text } from '@mantine/core';
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

export default function ParticipantPlayersPage() {
  const { slug, preview } = useParticipantTournamentSlug();
  const [query, setQuery] = useState('');
  const swrPlayers = getPublicPlayers(slug || null, preview);

  const players: Player[] = responseIsValid(swrPlayers)
    ? swrPlayers.data.data.players ?? []
    : [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = [...players].sort((a, b) => a.name.localeCompare(b.name));
    if (!q) return list;
    return list.filter((p) =>
      `${p.name} ${p.code ?? ''} ${p.club ?? ''}`.toLowerCase().includes(q)
    );
  }, [players, query]);

  return (
    <ParticipantTournamentLayout>
      <ParticipantPageTitle
        title="Players"
        subtitle="Everyone registered for this tournament."
      />

      <Stack gap="md">
        <ParticipantSearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search name, code, or club"
        />

        {!swrPlayers.data && !swrPlayers.error && <ParticipantLoading />}

        {swrPlayers.data && filtered.length === 0 && (
          <ParticipantEmpty>
            {players.length === 0
              ? 'No players published yet.'
              : 'No players match your search.'}
          </ParticipantEmpty>
        )}

        <Stack gap={0}>
          {filtered.map((p) => (
            <div
              key={p.id}
              style={{
                padding: '14px 2px',
                borderBottom: '1px solid var(--mantine-color-default-border)',
              }}
            >
              <Group justify="space-between" wrap="nowrap" gap="sm" align="flex-start">
                <div style={{ minWidth: 0 }}>
                  <Text fw={600}>{p.name}</Text>
                  <Text size="sm" c="dimmed">
                    {p.club || '—'}
                  </Text>
                </div>
                {p.code ? (
                  <Badge variant="light" size="lg">
                    {p.code}
                  </Badge>
                ) : null}
              </Group>
            </div>
          ))}
        </Stack>

        {swrPlayers.data && players.length > 0 && (
          <Text size="xs" c="dimmed" ta="center">
            Showing {filtered.length} of {players.length}
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
