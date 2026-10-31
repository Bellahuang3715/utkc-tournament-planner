import { Stack, Text } from '@mantine/core';
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
import uiClasses from '../../../components/participant/participant_ui.module.css';
import { responseIsValid } from '../../../components/utils/util';
import { getPublicMatchDirectory } from '../../../services/adapter';

type MatchDirectoryEntry = {
  player_id: number;
  name: string;
  code: string | null;
  club: string | null;
  division_id: number | null;
  division_name: string | null;
  bracket_id: number | null;
  bracket_index: number | null;
  bracket_title: string | null;
  court_id: number | null;
};

function formatDivisionGroup(entry: MatchDirectoryEntry): string {
  if (!entry.division_name) return '—';
  const group =
    entry.bracket_title?.trim() ||
    (entry.bracket_index != null ? `Group ${entry.bracket_index}` : null);
  return group ? `${entry.division_name} - ${group}` : entry.division_name;
}

function matchesQuery(entry: MatchDirectoryEntry, q: string): boolean {
  if (!q) return false;
  const hay =
    `${entry.name} ${entry.code ?? ''} ${entry.club ?? ''} ${entry.division_name ?? ''}`.toLowerCase();
  return hay.includes(q);
}

export default function ParticipantFindMatchesPage() {
  const { slug, preview } = useParticipantTournamentSlug();
  const [query, setQuery] = useState('');

  const swrDirectory = getPublicMatchDirectory(slug || null, preview);
  const entries: MatchDirectoryEntry[] = responseIsValid(swrDirectory)
    ? swrDirectory.data.data ?? []
    : [];

  const q = query.trim().toLowerCase();
  const hits = useMemo(() => {
    if (q.length < 1) return [];
    return entries.filter((e) => matchesQuery(e, q)).slice(0, 60);
  }, [entries, q]);

  const loading = !swrDirectory.data && !swrDirectory.error;

  return (
    <ParticipantTournamentLayout>
      <Stack gap="md">
        <ParticipantPageTitle
          title="Find matches"
          subtitle="Search by name or player code to see division and group."
        />
        <ParticipantSearchInput
          value={query}
          onChange={setQuery}
          placeholder="Name or code (e.g. A12)"
        />

        {loading && <ParticipantLoading />}

        {!loading && q.length === 0 && (
          <ParticipantEmpty>
            Start typing to find yourself in the participant list.
          </ParticipantEmpty>
        )}

        {!loading && q.length > 0 && hits.length === 0 && (
          <ParticipantEmpty>No players match “{query.trim()}”.</ParticipantEmpty>
        )}

        <Stack gap="xs">
          {hits.map((entry) => (
            <div
              key={`${entry.player_id}-${entry.division_id ?? 'none'}-${entry.bracket_id ?? 'none'}`}
              className={uiClasses.resultCard}
            >
              <Stack gap={4}>
                <Text size="xs">
                  <Text span c="dimmed">
                    Name:{' '}
                  </Text>
                  {entry.name}
                </Text>
                <Text size="xs">
                  <Text span c="dimmed">
                    ID:{' '}
                  </Text>
                  {entry.code || '—'}
                </Text>
                <Text size="xs">
                  <Text span c="dimmed">
                    Club:{' '}
                  </Text>
                  {entry.club || '—'}
                </Text>
                <Text size="xs">
                  <Text span c="dimmed">
                    Division:{' '}
                  </Text>
                  {formatDivisionGroup(entry)}
                </Text>
                <Text size="xs">
                  <Text span c="dimmed">
                    Court:{' '}
                  </Text>
                  {entry.court_id != null ? entry.court_id : '—'}
                </Text>
              </Stack>
            </div>
          ))}
        </Stack>
      </Stack>
    </ParticipantTournamentLayout>
  );
}

export const getServerSideProps = async ({ locale }: { locale: string }) => ({
  props: {
    ...(await serverSideTranslations(locale ?? 'en', ['common'])),
  },
});
