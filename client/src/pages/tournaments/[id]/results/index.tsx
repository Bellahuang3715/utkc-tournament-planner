import {
  Badge,
  Group,
  Paper,
  Stack,
  Text,
} from '@mantine/core';
import { IconMedal, IconTrophy } from '@tabler/icons-react';
import { useTranslation } from 'next-i18next/pages';
import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations';
import React from 'react';

import { PageHeader } from '../../../../components/layout/page_header';
import { EmptyRoster } from '../../../../components/no_content/empty_table_info';
import { getTournamentIdFromRouter } from '../../../../components/utils/util';
import TournamentLayout from '../../_tournament_layout';

type Place = 1 | 2 | 3;

type IndividualPlacer = {
  place: Place;
  playerName: string;
  /** Full club name (not abbreviation). */
  clubName: string;
};

type TeamPlacer = {
  place: Place;
  teamName: string;
  clubName: string;
};

type DivisionResults =
  | {
      id: number;
      name: string;
      divisionType: 'INDIVIDUALS';
      placers: IndividualPlacer[];
    }
  | {
      id: number;
      name: string;
      divisionType: 'TEAMS';
      placers: TeamPlacer[];
    };

/** Real placements will replace this once results are stored. */
const DIVISION_RESULTS: DivisionResults[] = [];

const PLACE_META: Record<
  Place,
  { label: string; color: string; medalColor: string }
> = {
  1: { label: '1st', color: 'yellow', medalColor: '#d4a017' },
  2: { label: '2nd', color: 'gray', medalColor: '#8a8a8a' },
  3: { label: '3rd', color: 'orange', medalColor: '#b87333' },
};

function PlaceBadge({ place }: { place: Place }) {
  const meta = PLACE_META[place];
  return (
    <Badge
      size="lg"
      variant="light"
      color={meta.color}
      leftSection={<IconMedal size={16} color={meta.medalColor} />}
      style={{ minWidth: 72 }}
    >
      {meta.label}
    </Badge>
  );
}

function IndividualPlacerRow({ placer }: { placer: IndividualPlacer }) {
  return (
    <Group justify="space-between" wrap="nowrap" gap="md">
      <Group gap="md" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
        <PlaceBadge place={placer.place} />
        <Stack gap={2} style={{ minWidth: 0 }}>
          <Text fw={600} truncate>
            {placer.playerName}
          </Text>
          <Text size="sm" c="dimmed" truncate>
            {placer.clubName}
          </Text>
        </Stack>
      </Group>
    </Group>
  );
}

function TeamPlacerRow({ placer }: { placer: TeamPlacer }) {
  return (
    <Group justify="space-between" wrap="nowrap" gap="md">
      <Group gap="md" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
        <PlaceBadge place={placer.place} />
        <Stack gap={2} style={{ minWidth: 0 }}>
          <Text fw={600} truncate>
            {placer.teamName}
          </Text>
          <Text size="sm" c="dimmed" truncate>
            {placer.clubName}
          </Text>
        </Stack>
      </Group>
    </Group>
  );
}

function DivisionResultsCard({ division }: { division: DivisionResults }) {
  const { t } = useTranslation();

  return (
    <Paper withBorder radius="md" p="md">
      <Group justify="space-between" mb="md" wrap="wrap" gap="xs">
        <Text fw={600}>{division.name}</Text>
        <Badge variant="outline" color="blue">
          {division.divisionType === 'INDIVIDUALS'
            ? t('players_title', 'Players')
            : t('teams_title', 'Teams')}
        </Badge>
      </Group>

      <Stack gap="sm">
        {division.divisionType === 'INDIVIDUALS'
          ? division.placers.map((placer, idx) => (
              <IndividualPlacerRow
                key={`${placer.place}-${placer.playerName}-${idx}`}
                placer={placer}
              />
            ))
          : division.placers.map((placer, idx) => (
              <TeamPlacerRow
                key={`${placer.place}-${placer.teamName}-${idx}`}
                placer={placer}
              />
            ))}
      </Stack>
    </Paper>
  );
}

export default function ResultsPage() {
  const { t } = useTranslation();
  const { tournamentData } = getTournamentIdFromRouter();

  return (
    <TournamentLayout tournament_id={tournamentData.id}>
      <Stack gap="lg">
        <PageHeader
          title={t('results_title', 'Results')}
          description={t(
            'results_page_subtitle',
            'Final placements for each division once scoring is finished.',
          )}
        />

        {DIVISION_RESULTS.length === 0 ? (
          <EmptyRoster
            icon={<IconTrophy size={22} stroke={1.5} />}
            title={t('no_results_title', 'No results yet')}
            description={t(
              'no_results_description',
              'Final placements show up here after divisions are scored.',
            )}
          />
        ) : (
          <Stack gap="md">
            {DIVISION_RESULTS.map((division) => (
              <DivisionResultsCard key={division.id} division={division} />
            ))}
          </Stack>
        )}
      </Stack>
    </TournamentLayout>
  );
}

export const getServerSideProps = async ({ locale }: { locale: string }) => ({
  props: {
    ...(await serverSideTranslations(locale ?? 'en', ['common'])),
  },
});
