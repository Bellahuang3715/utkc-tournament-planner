import {
  Badge,
  Group,
  Paper,
  Stack,
  Text,
} from '@mantine/core';
import { IconMedal } from '@tabler/icons-react';
import { useTranslation } from 'next-i18next/pages';
import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations';
import React from 'react';

import { PageHeader } from '../../../../components/layout/page_header';
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

/** Mock podium results — replace with API data later. */
const MOCK_DIVISION_RESULTS: DivisionResults[] = [
  {
    id: 1,
    name: 'Men\'s Individuals A',
    divisionType: 'INDIVIDUALS',
    placers: [
      { place: 1, playerName: 'Kenji Nakamura', clubName: 'University of Toronto Kendo Club' },
      { place: 2, playerName: 'Alex Chen', clubName: 'York University Kendo Club' },
      { place: 3, playerName: 'Marcus Lee', clubName: 'McMaster University Kendo Club' },
      { place: 3, playerName: 'David Park', clubName: 'University of Waterloo Kendo Club' },
    ],
  },
  {
    id: 2,
    name: 'Women\'s Individuals',
    divisionType: 'INDIVIDUALS',
    placers: [
      { place: 1, playerName: 'Yuki Tanaka', clubName: 'University of Toronto Kendo Club' },
      { place: 2, playerName: 'Sarah Kim', clubName: 'Queen\'s University Kendo Club' },
      { place: 3, playerName: 'Emily Wong', clubName: 'Western University Kendo Club' },
      { place: 3, playerName: 'Hana Suzuki', clubName: 'Carleton University Kendo Club' },
    ],
  },
  {
    id: 3,
    name: 'Men\'s Individuals B',
    divisionType: 'INDIVIDUALS',
    placers: [
      { place: 1, playerName: 'Ryan Patel', clubName: 'Ryerson University Kendo Club' },
      { place: 2, playerName: 'James Liu', clubName: 'University of Ottawa Kendo Club' },
      { place: 3, playerName: 'Chris Nguyen', clubName: 'University of Guelph Kendo Club' },
      { place: 3, playerName: 'Tom Hughes', clubName: 'Brock University Kendo Club' },
    ],
  },
  {
    id: 4,
    name: 'Team Division',
    divisionType: 'TEAMS',
    placers: [
      { place: 1, teamName: 'UOT A', clubName: 'University of Toronto Kendo Club' },
      { place: 2, teamName: 'York A', clubName: 'York University Kendo Club' },
      { place: 3, teamName: 'Mac A', clubName: 'McMaster University Kendo Club' },
      { place: 3, teamName: 'Waterloo A', clubName: 'University of Waterloo Kendo Club' },
    ],
  },
];

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

        <Stack gap="md">
          {MOCK_DIVISION_RESULTS.map((division) => (
            <DivisionResultsCard key={division.id} division={division} />
          ))}
        </Stack>
      </Stack>
    </TournamentLayout>
  );
}

export const getServerSideProps = async ({ locale }: { locale: string }) => ({
  props: {
    ...(await serverSideTranslations(locale ?? 'en', ['common'])),
  },
});
