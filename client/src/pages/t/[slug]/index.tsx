import { Anchor, Group, SimpleGrid, Stack, Text, UnstyledButton } from '@mantine/core';
import {
  IconCalendar,
  IconInfoCircle,
  IconList,
  IconScoreboard,
  IconSearch,
  IconTrophy,
  IconUsers,
} from '@tabler/icons-react';
import Link from 'next/link';
import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations';
import React from 'react';

import ParticipantTournamentLayout, {
  useParticipantTournamentSlug,
} from '../../../components/participant/ParticipantTournamentLayout';
import { ParticipantPageTitle } from '../../../components/participant/ParticipantUi';
import uiClasses from '../../../components/participant/participant_ui.module.css';
import { GITHUB_ISSUES_URL } from '../../../components/marketing/fixtures';

const SHORTCUTS = [
  { href: '/matches', label: 'Find my matches', desc: 'Search by name or code', icon: IconSearch },
  { href: '/participants', label: 'Players', desc: 'Who is competing', icon: IconUsers },
  { href: '/schedule', label: 'Schedule', desc: 'When each block runs', icon: IconCalendar },
  { href: '/brackets', label: 'Brackets', desc: 'Groups and seeding', icon: IconList },
  { href: '/scores', label: 'Scores', desc: 'Live match scores', icon: IconScoreboard },
  { href: '/results', label: 'Results', desc: 'Final placements', icon: IconTrophy },
  {
    href: '/about',
    label: 'About KenManage',
    desc: 'What this software is',
    icon: IconInfoCircle,
  },
] as const;

export default function ParticipantTournamentHomePage() {
  const { slug, previewQs } = useParticipantTournamentSlug();

  return (
    <ParticipantTournamentLayout>
      <Stack gap="md">
        <SimpleGrid cols={1} spacing="xs">
          {SHORTCUTS.map((item) => {
            const Icon = item.icon;
            return (
              <UnstyledButton
                key={item.href}
                component={Link}
                href={`/t/${slug}${item.href}${previewQs}`}
                className={uiClasses.shortcut}
              >
                <Group wrap="nowrap" gap="sm" align="flex-start">
                  <Icon className={uiClasses.shortcutIcon} stroke={1.5} />
                  <div style={{ minWidth: 0 }}>
                    <Text className={uiClasses.shortcutLabel}>{item.label}</Text>
                    <Text className={uiClasses.shortcutDesc}>{item.desc}</Text>
                  </div>
                </Group>
              </UnstyledButton>
            );
          })}
        </SimpleGrid>

        <Text size="xs" c="dimmed" ta="center">
          Spot a problem?{' '}
          <Anchor
            href={GITHUB_ISSUES_URL}
            target="_blank"
            rel="noopener noreferrer"
            size="xs"
            c="dimmed"
            underline="always"
          >
            Report a bug
          </Anchor>
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
