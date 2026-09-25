import { Button, Card, Group, Image, Stack, Text, Title } from '@mantine/core';
import { useTranslation } from 'next-i18next/pages';
import Link from 'next/link';
import React from 'react';
import { SWRResponse } from 'swr';

import { Tournament } from '../../interfaces/tournament';
import { getBaseApiUrl } from '../../services/adapter';
import { EmptyTableInfo } from '../no_content/empty_table_info';
import { DateTime } from '../utils/datetime';
import RequestErrorAlert from '../utils/error_alert';
import { TableSkeletonSingleColumn } from '../utils/skeletons';
import classes from './tournaments.module.css';

export function TournamentLogo({ tournament }: { tournament: Tournament }) {
  return (
    <Image
      radius="md"
      src={`${getBaseApiUrl()}/static/tournament-logos/${tournament.logo_path}`}
      fallbackSrc={`https://placehold.co/318x160?text=${tournament.name}`}
      height={160}
    />
  );
}

function Stat({ title, value }: { title: string; value: any }) {
  return (
    <div key={title}>
      <Text size="xs" c="dimmed">
        {title}
      </Text>
      <Text fw={500} size="sm">
        {value}
      </Text>
    </div>
  );
}

export default function TournamentsCardTable({
  swrTournamentsResponse,
}: {
  swrTournamentsResponse: SWRResponse;
}) {
  const { t } = useTranslation();

  if (swrTournamentsResponse.error) {
    return <RequestErrorAlert error={swrTournamentsResponse.error} />;
  }
  if (swrTournamentsResponse.isLoading) {
    return <TableSkeletonSingleColumn />;
  }

  const tournaments: Tournament[] =
    swrTournamentsResponse.data != null ? swrTournamentsResponse.data.data : [];

  const byName = (a: Tournament, b: Tournament) => a.name.localeCompare(b.name);
  const active = tournaments
    .filter((tournament) => (tournament.status ?? "active") === "active")
    .sort(byName);
  const archived = tournaments
    .filter((tournament) => tournament.status === "archived")
    .sort(byName);

  const renderCards = (list: Tournament[]) =>
    list.map((tournament) => (
      <Group key={tournament.id} className={classes.card}>
        <Card shadow="sm" padding="lg" radius="md" withBorder w="100%">
          <Card.Section>
            <TournamentLogo tournament={tournament} />
          </Card.Section>

          <Text fw={500} mt="md" mb="xs">
            {tournament.name}
          </Text>

          <Card.Section className={classes.section}>
            <Stat title={t('start_time')} value={<DateTime datetime={tournament.start_time} />} />
          </Card.Section>

          <Card.Section className={classes.section}>
            <Button
              component={Link}
              color="blue"
              fullWidth
              radius="md"
              href={`/tournaments/${tournament.id}/participants/players`}
            >
              {t("open_tournament", "OPEN")}
            </Button>
          </Card.Section>
        </Card>
      </Group>
    ));

  if (tournaments.length < 1) return <EmptyTableInfo entity_name={t('tournaments_title')} />;

  return (
    <Stack gap="xl" mt="md">
      <Stack gap="sm">
        <Title order={3}>{t("active", "Active")}</Title>
        {active.length < 1 ? (
          <Text size="sm" c="dimmed">
            {t("no_active_tournaments", "No active tournaments.")}
          </Text>
        ) : (
          <Group gap="sm" style={{ width: '100%' }}>
            {renderCards(active)}
          </Group>
        )}
      </Stack>
      <Stack gap="sm">
        <Title order={3}>{t("archived", "Archived")}</Title>
        {archived.length < 1 ? (
          <Text size="sm" c="dimmed">
            {t("no_archived_tournaments", "No archived tournaments.")}
          </Text>
        ) : (
          <Group gap="sm" style={{ width: '100%' }}>
            {renderCards(archived)}
          </Group>
        )}
      </Stack>
    </Stack>
  );
}
