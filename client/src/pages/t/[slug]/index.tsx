import { Group, SimpleGrid, Stack, Text, UnstyledButton } from '@mantine/core';
import {
  IconCalendar,
  IconList,
  IconMapPin,
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

const SHORTCUTS = [
  { href: '/matches', label: 'Find my matches', desc: 'Search by name or code', icon: IconSearch },
  { href: '/participants', label: 'Players', desc: 'Who is competing', icon: IconUsers },
  { href: '/schedule', label: 'Schedule', desc: 'When each block runs', icon: IconCalendar },
  { href: '/courts', label: 'Courts', desc: 'What is on each court', icon: IconMapPin },
  { href: '/brackets', label: 'Brackets', desc: 'Groups and seeding', icon: IconList },
  { href: '/scores', label: 'Scores', desc: 'Live match scores', icon: IconScoreboard },
  { href: '/results', label: 'Results', desc: 'Final placements', icon: IconTrophy },
] as const;

export default function ParticipantTournamentHomePage() {
  const { slug, previewQs } = useParticipantTournamentSlug();

  return (
    <ParticipantTournamentLayout>
      <Stack gap="lg">
        <ParticipantPageTitle
          title="Home"
          subtitle="Find matches, the schedule, scores, and results."
        />
        <SimpleGrid cols={1} spacing="sm">
          {SHORTCUTS.map((item) => {
            const Icon = item.icon;
            return (
              <UnstyledButton
                key={item.href}
                component={Link}
                href={`/t/${slug}${item.href}${previewQs}`}
                style={{
                  display: 'block',
                  width: '100%',
                  borderRadius: 14,
                  padding: '14px 16px',
                  border: '1px solid var(--mantine-color-default-border)',
                  background: 'var(--mantine-color-body)',
                  textAlign: 'left',
                }}
              >
                <Group wrap="nowrap" gap="md" align="flex-start">
                  <Icon size={24} stroke={1.5} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div style={{ minWidth: 0 }}>
                    <Text fw={700}>{item.label}</Text>
                    <Text size="sm" c="dimmed">
                      {item.desc}
                    </Text>
                  </div>
                </Group>
              </UnstyledButton>
            );
          })}
        </SimpleGrid>
      </Stack>
    </ParticipantTournamentLayout>
  );
}

export const getServerSideProps = async ({ locale }: { locale: string }) => ({
  props: {
    ...(await serverSideTranslations(locale ?? 'en', ['common'])),
  },
});
