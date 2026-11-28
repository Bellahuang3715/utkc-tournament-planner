import { Anchor, SimpleGrid, Stack, Text } from '@mantine/core';
import {
  IconCalendar,
  IconInfoCircle,
  IconList,
  IconScoreboard,
  IconSearch,
  IconTrophy,
  IconUsers,
} from '@tabler/icons-react';
import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations';

import ParticipantTournamentLayout, {
  useParticipantTournamentSlug,
} from '../../../components/participant/ParticipantTournamentLayout';
import { ParticipantLinkCard } from '../../../components/participant/ParticipantUi';
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
              <ParticipantLinkCard
                key={item.href}
                href={`/t/${slug}${item.href}${previewQs}`}
                title={item.label}
                description={item.desc}
                icon={<Icon stroke={1.5} />}
              />
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
