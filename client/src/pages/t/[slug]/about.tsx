import { Anchor, Stack, Text } from '@mantine/core';
import Link from 'next/link';
import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations';
import React from 'react';

import ParticipantTournamentLayout from '../../../components/participant/ParticipantTournamentLayout';
import { ParticipantPageTitle } from '../../../components/participant/ParticipantUi';
import { GITHUB_ISSUES_URL } from '../../../components/marketing/fixtures';

export default function ParticipantAboutPage() {
  return (
    <ParticipantTournamentLayout>
      <Stack gap="md" maw={520}>
        <ParticipantPageTitle
          title="About KenManage"
          subtitle="The software behind this participant site."
        />

        <Stack gap="sm">
          <Text size="sm" lh={1.55}>
            KenManage is free software for running kendo tournaments end to end — roster, brackets,
            court schedule, scorekeeping, and the public board you are using now.
          </Text>
          <Text size="sm" c="dimmed" lh={1.55}>
            It started with the University of Toronto Kendo Club&apos;s annual tournament: a day
            with hundreds of participants, many courts, and little room for spreadsheet mistakes.
            Licensed under AGPL-3.0.
          </Text>
          <Text size="sm" c="dimmed">
            <Anchor component={Link} href="/welcome" size="sm">
              Product site
            </Anchor>
            {' · '}
            <Anchor component={Link} href="/license" size="sm">
              License
            </Anchor>
          </Text>
        </Stack>

        <Stack
          gap={6}
          pt="md"
          style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
        >
          <Text fw={650} size="sm">
            Something wrong?
          </Text>
          <Text size="sm" c="dimmed" lh={1.45}>
            If a page looks broken, a match is missing, or something is unclear, please report it.
          </Text>
          <Anchor href={GITHUB_ISSUES_URL} target="_blank" rel="noopener noreferrer" size="sm">
            Report a bug on GitHub
          </Anchor>
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
