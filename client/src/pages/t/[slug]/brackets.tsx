import { Badge, Group, Stack, Text, UnstyledButton } from '@mantine/core';
import Link from 'next/link';
import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations';
import React from 'react';

import ParticipantTournamentLayout, {
  useParticipantTournamentSlug,
} from '../../../components/participant/ParticipantTournamentLayout';
import {
  ParticipantEmpty,
  ParticipantLoading,
  ParticipantPageTitle,
} from '../../../components/participant/ParticipantUi';
import uiClasses from '../../../components/participant/participant_ui.module.css';
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
                <UnstyledButton
                  key={d.id}
                  component={Link}
                  href={`/t/${slug}/brackets/${d.id}${previewQs}`}
                  className={`${uiClasses.sectionCard} ${uiClasses.sectionCardAccent}`}
                  style={{
                    borderLeftColor: isTeams
                      ? 'var(--mantine-color-teal-6)'
                      : 'var(--mantine-color-indigo-6)',
                  }}
                >
                  <Group justify="space-between" wrap="nowrap" align="center" gap="sm">
                    <div style={{ minWidth: 0 }}>
                      <Text className={uiClasses.sectionCardLabel}>{d.name}</Text>
                      <Text className={uiClasses.sectionCardDesc}>
                        View bracket seeding
                      </Text>
                    </div>
                    <Badge color={isTeams ? 'teal' : 'indigo'} variant="light" size="xs">
                      {isTeams ? 'Teams' : 'Individuals'}
                    </Badge>
                  </Group>
                </UnstyledButton>
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
