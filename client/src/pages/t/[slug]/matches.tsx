import { Badge, Group, Stack, Text, UnstyledButton } from '@mantine/core';
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
  formatParticipantClock,
  formatParticipantTime,
} from '../../../components/participant/ParticipantUi';
import { responseIsValid } from '../../../components/utils/util';
import { Player } from '../../../interfaces/player';
import {
  getPublicCourts,
  getPublicPlayerDivisions,
  getPublicPlayers,
  getPublicScheduleTimetable,
} from '../../../services/adapter';

function matchesQuery(player: Player, q: string): boolean {
  if (!q) return false;
  const hay = `${player.name} ${player.code ?? ''} ${player.club ?? ''}`.toLowerCase();
  return hay.includes(q);
}

export default function ParticipantFindMatchesPage() {
  const { slug, preview } = useParticipantTournamentSlug();
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const swrPlayers = getPublicPlayers(slug || null, preview);
  const swrSchedule = getPublicScheduleTimetable(slug || null, preview);
  const swrCourts = getPublicCourts(slug || null, preview);
  const swrPlayerDivisions = getPublicPlayerDivisions(slug || null, preview, selectedId);

  const players: Player[] = responseIsValid(swrPlayers)
    ? swrPlayers.data.data.players ?? []
    : [];
  const placements = responseIsValid(swrSchedule)
    ? swrSchedule.data.data.placements ?? []
    : [];
  const courts = responseIsValid(swrCourts) ? swrCourts.data.data ?? [] : [];
  const courtName = useMemo(() => {
    const map = new Map<number, string>();
    for (const c of courts) map.set(c.id, c.name);
    return map;
  }, [courts]);

  const q = query.trim().toLowerCase();
  const hits = useMemo(() => {
    if (q.length < 1) return [];
    return players.filter((p) => matchesQuery(p, q)).slice(0, 40);
  }, [players, q]);

  const selected = players.find((p) => p.id === selectedId) ?? null;
  const divisions = responseIsValid(swrPlayerDivisions)
    ? swrPlayerDivisions.data.data ?? []
    : [];

  const myBlocks = useMemo(() => {
    if (!selected || divisions.length === 0) return [];
    const divisionIds = new Set(divisions.map((d: { id: number }) => d.id));
    return [...placements]
      .filter((p: any) => p.division_id != null && divisionIds.has(p.division_id))
      .sort(
        (a: any, b: any) =>
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );
  }, [placements, selected, divisions]);

  const loading = !swrPlayers.data && !swrPlayers.error;

  return (
    <ParticipantTournamentLayout>
      <ParticipantPageTitle
        title="Find my matches"
        subtitle="Search your name or player code to see your divisions and schedule."
      />

      <Stack gap="md">
        <ParticipantSearchInput
          value={query}
          onChange={(v) => {
            setQuery(v);
            setSelectedId(null);
          }}
          placeholder="Name or code (e.g. A12)"
        />

        {loading && <ParticipantLoading />}

        {!loading && q.length === 0 && (
          <ParticipantEmpty>
            Start typing to find yourself in the participant list.
          </ParticipantEmpty>
        )}

        {!loading && q.length > 0 && !selected && hits.length === 0 && (
          <ParticipantEmpty>No players match “{query.trim()}”.</ParticipantEmpty>
        )}

        {!selected && hits.length > 0 && (
          <Stack gap={0}>
            {hits.map((p) => (
              <UnstyledButton
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '14px 4px',
                  borderBottom: '1px solid var(--mantine-color-default-border)',
                  textAlign: 'left',
                }}
              >
                <Group justify="space-between" wrap="nowrap" gap="sm">
                  <div style={{ minWidth: 0 }}>
                    <Text fw={600} truncate>
                      {p.name}
                    </Text>
                    <Text size="sm" c="dimmed" truncate>
                      {p.club || '—'}
                    </Text>
                  </div>
                  {p.code && (
                    <Badge variant="light" size="lg">
                      {p.code}
                    </Badge>
                  )}
                </Group>
              </UnstyledButton>
            ))}
          </Stack>
        )}

        {selected && (
          <Stack gap="md">
            <UnstyledButton
              onClick={() => setSelectedId(null)}
              style={{ alignSelf: 'flex-start' }}
            >
              <Text size="sm" c="blue">
                ← Back to results
              </Text>
            </UnstyledButton>

            <div
              style={{
                borderRadius: 14,
                padding: 16,
                border: '1px solid var(--mantine-color-default-border)',
              }}
            >
              <Group justify="space-between" wrap="nowrap">
                <div>
                  <Text fw={700} size="lg">
                    {selected.name}
                  </Text>
                  <Text size="sm" c="dimmed">
                    {selected.club || 'No club listed'}
                  </Text>
                </div>
                {selected.code && (
                  <Badge size="xl" variant="filled">
                    {selected.code}
                  </Badge>
                )}
              </Group>
            </div>

            <div>
              <Text fw={700} mb={6}>
                Your divisions
              </Text>
              {swrPlayerDivisions.isLoading && <ParticipantLoading />}
              {!swrPlayerDivisions.isLoading && divisions.length === 0 && (
                <ParticipantEmpty>Not assigned to a division yet.</ParticipantEmpty>
              )}
              <Stack gap={6}>
                {divisions.map((d: any) => (
                  <Text key={d.id} size="sm">
                    {d.name}
                    {d.prefix ? ` (${d.prefix})` : ''}
                  </Text>
                ))}
              </Stack>
            </div>

            <div>
              <Text fw={700} mb={6}>
                Scheduled blocks
              </Text>
              {myBlocks.length === 0 ? (
                <ParticipantEmpty>
                  No schedule blocks for your divisions yet. Check back once the organizer
                  publishes the timetable.
                </ParticipantEmpty>
              ) : (
                <Stack gap="sm">
                  {myBlocks.map((b: any) => (
                    <div
                      key={b.id}
                      style={{
                        borderRadius: 12,
                        padding: '12px 14px',
                        border: '1px solid var(--mantine-color-default-border)',
                      }}
                    >
                      <Text fw={600}>{b.label || 'Block'}</Text>
                      <Text size="sm" c="dimmed">
                        {formatParticipantTime(b.start_time)} · {b.duration_mins} min
                      </Text>
                      <Text size="sm">
                        {b.court_id != null
                          ? courtName.get(b.court_id) ?? `Court ${b.court_id}`
                          : 'Court TBA'}
                        {' · '}
                        {formatParticipantClock(b.start_time)}
                      </Text>
                    </div>
                  ))}
                </Stack>
              )}
            </div>
          </Stack>
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
