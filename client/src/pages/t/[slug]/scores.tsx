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
} from '../../../components/participant/ParticipantUi';
import { responseIsValid } from '../../../components/utils/util';
import {
  getPublicDivisionBracketCells,
  getPublicDivisionBracketsWithPlayers,
  getPublicDivisions,
} from '../../../services/adapter';

export default function ParticipantScoresPage() {
  const { slug, preview } = useParticipantTournamentSlug();
  const [divisionId, setDivisionId] = useState<number | null>(null);

  const swrDivisions = getPublicDivisions(slug || null, preview);
  const divisions = responseIsValid(swrDivisions)
    ? swrDivisions.data.data ?? []
    : [];
  const selected = divisions.find((d: any) => d.id === divisionId) ?? null;

  const swrBrackets = getPublicDivisionBracketsWithPlayers(
    slug || null,
    preview,
    divisionId
  );
  const swrCells = getPublicDivisionBracketCells(slug || null, preview, divisionId);

  const brackets = responseIsValid(swrBrackets) ? swrBrackets.data.data ?? [] : [];
  const cells = responseIsValid(swrCells) ? swrCells.data.data ?? [] : [];

  const cellsByBracket = useMemo(() => {
    const map = new Map<number, any[]>();
    for (const cell of cells) {
      const list = map.get(cell.bracket_id) ?? [];
      list.push(cell);
      map.set(cell.bracket_id, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.slot_idx - b.slot_idx);
    }
    return map;
  }, [cells]);

  const scoredCount = cells.filter((c: any) => (c.score ?? '').trim().length > 0).length;
  const loadingDivisions = !swrDivisions.data && !swrDivisions.error;
  const loadingDetail =
    divisionId != null &&
    ((!swrBrackets.data && !swrBrackets.error) ||
      (!swrCells.data && !swrCells.error));

  return (
    <ParticipantTournamentLayout>
      <ParticipantPageTitle
        title="Scores"
        subtitle="Live scores refresh automatically while the tournament is running."
      />

      {loadingDivisions && <ParticipantLoading />}

      {!loadingDivisions && divisions.length === 0 && (
        <ParticipantEmpty>No divisions published yet.</ParticipantEmpty>
      )}

      {divisionId == null && divisions.length > 0 && (
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
                textAlign: 'left',
              }}
            >
              <Group justify="space-between" wrap="nowrap">
                <Text fw={700}>{d.name}</Text>
                <Badge variant="light">
                  {d.division_type === 'TEAMS' ? 'Teams' : 'Individuals'}
                </Badge>
              </Group>
            </UnstyledButton>
          ))}
        </Stack>
      )}

      {selected && (
        <Stack gap="md">
          <UnstyledButton
            onClick={() => setDivisionId(null)}
            style={{ alignSelf: 'flex-start' }}
          >
            <Text size="sm" c="blue">
              ← All divisions
            </Text>
          </UnstyledButton>

          <Group justify="space-between" align="flex-start">
            <Text fw={700} size="lg">
              {selected.name}
            </Text>
            <Badge variant="light" color={scoredCount > 0 ? 'green' : 'gray'}>
              {scoredCount > 0 ? `${scoredCount} scored` : 'No scores yet'}
            </Badge>
          </Group>

          {loadingDetail && <ParticipantLoading />}

          {!loadingDetail && brackets.length === 0 && (
            <ParticipantEmpty>No brackets to score in this division yet.</ParticipantEmpty>
          )}

          <Stack gap="md">
            {brackets.map((b: any) => {
              const title = b.title?.trim() ? b.title : `Group ${b.index}`;
              const groupCells = cellsByBracket.get(b.id) ?? [];
              const seeded = [...(b.players ?? [])].sort(
                (a: any, c: any) => (a.bracket_idx ?? 0) - (c.bracket_idx ?? 0)
              );

              // Prefer filled cells; fall back to seeded players with blank scores.
              const rows =
                groupCells.length > 0
                  ? groupCells.map((cell: any) => ({
                      key: cell.id ?? `${cell.bracket_id}-${cell.slot_idx}`,
                      name: cell.name || 'TBD',
                      club: cell.club,
                      code: cell.code,
                      score: cell.score ?? '',
                    }))
                  : seeded.map((slot: any) => ({
                      key: `${b.id}-${slot.player_id}`,
                      name: slot.name || 'TBD',
                      club: slot.club,
                      code: slot.code,
                      score: '',
                    }));

              return (
                <div
                  key={b.id}
                  style={{
                    borderRadius: 14,
                    border: '1px solid var(--mantine-color-default-border)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      padding: '10px 14px',
                      borderBottom: '1px solid var(--mantine-color-default-border)',
                      background: 'var(--mantine-color-default-hover)',
                    }}
                  >
                    <Text fw={700} size="sm">
                      {title}
                    </Text>
                  </div>
                  <Stack gap={0}>
                    {rows.length === 0 && (
                      <Text size="sm" c="dimmed" p="md">
                        Empty group
                      </Text>
                    )}
                    {rows.map((row) => (
                      <Group
                        key={row.key}
                        justify="space-between"
                        wrap="nowrap"
                        px="md"
                        py="sm"
                        style={{
                          borderBottom: '1px solid var(--mantine-color-default-border)',
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <Text size="sm" fw={600} truncate>
                            {row.name}
                          </Text>
                          <Text size="xs" c="dimmed" truncate>
                            {[row.code, row.club].filter(Boolean).join(' · ') || '—'}
                          </Text>
                        </div>
                        <Text
                          fw={700}
                          size="lg"
                          style={{
                            minWidth: 40,
                            textAlign: 'right',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {row.score.trim() || '—'}
                        </Text>
                      </Group>
                    ))}
                  </Stack>
                </div>
              );
            })}
          </Stack>
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
