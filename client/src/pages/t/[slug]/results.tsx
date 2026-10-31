import { Stack } from '@mantine/core';
import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations';
import React from 'react';

import ParticipantTournamentLayout from '../../../components/participant/ParticipantTournamentLayout';
import {
  ParticipantNotice,
  ParticipantPageTitle,
} from '../../../components/participant/ParticipantUi';

/**
 * Participant results view — separate from the organizer results page.
 * Final placements API is not wired yet; show a clear empty state.
 */
export default function ParticipantResultsPage() {
  return (
    <ParticipantTournamentLayout>
      <Stack gap="sm">
        <ParticipantPageTitle
          title="Results"
          subtitle="Final placements for each division."
        />
        <ParticipantNotice title="Not published yet">
          Results will appear here once the organizer publishes final placements. Meanwhile, check
          Scores for live match outcomes.
        </ParticipantNotice>
      </Stack>
    </ParticipantTournamentLayout>
  );
}

export const getServerSideProps = async ({ locale }: { locale: string }) => ({
  props: {
    ...(await serverSideTranslations(locale ?? 'en', ['common'])),
  },
});
