import { Stack, Text } from '@mantine/core';
import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations';
import React from 'react';

import ParticipantTournamentLayout from '../../../components/participant/ParticipantTournamentLayout';
import {
  ParticipantEmpty,
  ParticipantPageTitle,
} from '../../../components/participant/ParticipantUi';

/**
 * Participant results view — separate from the organizer results page.
 * Final placements API is not wired yet; show a clear empty state.
 */
export default function ParticipantResultsPage() {
  return (
    <ParticipantTournamentLayout>
      <ParticipantPageTitle
        title="Results"
        subtitle="Final placements for each division."
      />
      <Stack gap="sm">
        <ParticipantEmpty>
          Results will appear here once the organizer publishes final placements.
        </ParticipantEmpty>
        <Text size="sm" c="dimmed">
          Meanwhile, check <strong>Scores</strong> for live match outcomes.
        </Text>
      </Stack>
    </ParticipantTournamentLayout>
  );
}

export const getServerSideProps = async ({ locale }: { locale: string }) => ({
  props: {
    ...(await serverSideTranslations(locale ?? 'en', ['common'])),
  },
});
