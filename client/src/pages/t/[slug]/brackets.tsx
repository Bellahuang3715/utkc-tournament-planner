import { Badge, Stack } from '@mantine/core';
import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations';
import React from 'react';

import ParticipantTournamentLayout, {
  useParticipantTournamentSlug,
} from '../../../components/participant/ParticipantTournamentLayout';
import {
  ParticipantEmpty,
  ParticipantLoading,
  ParticipantLinkCard,
  ParticipantPageTitle,
} from '../../../components/participant/ParticipantUi';
import { responseIsValid } from '../../../components/utils/util';
import { getPublicDivisions } from '../../../services/adapter';

export default function ParticipantBracketsPage() {
  const { slug, preview, previewQs } = useParticipantTournamentSlug();
  const swrDivisions = getPublicDivisions(slug || null, preview);
  const divisions = responseIsValid(swrDivisions)
    ? swrDivisions.data.data ?? []
    : [];
  const loadingDivisions = !swrDivisions.data && !swrDivisions.error;

  return (
    <ParticipantTournamentLayout>
      <Stack gap="md">
        <ParticipantPageTitle
          title="Brackets"
          subtitle="Seeding and groups. Scores stay on the Scores page."
        />

        {loadingDivisions && <ParticipantLoading />}

        {!loadingDivisions && divisions.length === 0 && (
          <ParticipantEmpty>No divisions published yet.</ParticipantEmpty>
        )}

        {divisions.length > 0 && (
          <Stack gap="xs">
            {divisions.map((d: any) => {
              const isTeams = d.division_type === 'TEAMS';
              return (
                <ParticipantLinkCard
                  key={d.id}
                  href={`/t/${slug}/brackets/${d.id}${previewQs}`}
                  title={d.name}
                  description="View bracket seeding"
                  accent={isTeams ? 'var(--mantine-color-teal-6)' : 'var(--mantine-color-indigo-6)'}
                  badge={
                    <Badge color={isTeams ? 'teal' : 'indigo'} variant="light" size="xs">
                      {isTeams ? 'Teams' : 'Individuals'}
                    </Badge>
                  }
                />
              );
            })}
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
