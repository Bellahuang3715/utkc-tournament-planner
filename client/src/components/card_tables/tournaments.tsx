import { Accordion, Button, Card, Group, Image, Select, Stack, Text, Tooltip } from '@mantine/core';
import { IconCalendar, IconMapPin, IconUser } from '@tabler/icons-react';
import { useTranslation } from 'next-i18next/pages';
import Link from 'next/link';
import React, { useState } from 'react';
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

function MetaRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <Group gap={8} wrap="nowrap" align="flex-start">
      <Tooltip label={label} withArrow openDelay={300}>
        <span className={classes.metaIcon} aria-label={label}>
          {icon}
        </span>
      </Tooltip>
      <Text size="sm" lh={1.4} style={{ flex: 1, minWidth: 0 }}>
        {value}
      </Text>
    </Group>
  );
}

type TournamentSort = "name" | "created";

function compareTournaments(sort: TournamentSort) {
  return (a: Tournament, b: Tournament) => {
    if (sort === "created") {
      return new Date(b.created).getTime() - new Date(a.created).getTime();
    }
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  };
}

export default function TournamentsCardTable({
  swrTournamentsResponse,
}: {
  swrTournamentsResponse: SWRResponse;
}) {
  const { t } = useTranslation();
  const [sort, setSort] = useState<TournamentSort>("name");

  if (swrTournamentsResponse.error) {
    return <RequestErrorAlert error={swrTournamentsResponse.error} />;
  }
  if (swrTournamentsResponse.isLoading) {
    return <TableSkeletonSingleColumn />;
  }

  const tournaments: Tournament[] =
    swrTournamentsResponse.data != null ? swrTournamentsResponse.data.data : [];

  const compare = compareTournaments(sort);
  const active = tournaments
    .filter((tournament) => (tournament.status ?? "active") === "active")
    .sort(compare);
  const archived = tournaments
    .filter((tournament) => tournament.status === "archived")
    .sort(compare);

  const renderCards = (list: Tournament[]) =>
    list.map((tournament) => (
      <Group key={tournament.id} className={classes.card}>
        <Card shadow="sm" padding="lg" radius="md" withBorder w="100%">
          <Card.Section>
            <TournamentLogo tournament={tournament} />
          </Card.Section>

          <Text fw={600} size="lg" mt="md" lh={1.25}>
            {tournament.name}
          </Text>

          <Stack gap={8} mt="sm" mb="md">
            <MetaRow
              icon={<IconUser size={16} stroke={1.5} />}
              label={t('organizer_input_label', 'Organizer')}
              value={tournament.organizer || '—'}
            />
            <MetaRow
              icon={<IconCalendar size={16} stroke={1.5} />}
              label={t('start_time')}
              value={<DateTime datetime={tournament.start_time} />}
            />
            <MetaRow
              icon={<IconMapPin size={16} stroke={1.5} />}
              label={t('location_input_label')}
              value={tournament.location || '—'}
            />
          </Stack>

          <Button
            component={Link}
            color="blue"
            fullWidth
            radius="md"
            href={`/tournaments/${tournament.id}/participants/players`}
          >
            {t("open_tournament", "OPEN")}
          </Button>
        </Card>
      </Group>
    ));

  if (tournaments.length < 1) return <EmptyTableInfo entity_name={t('tournaments_title')} />;

  const sections = [
    {
      value: "active",
      title: t("active", "Active"),
      empty: t("no_active_tournaments", "No active tournaments."),
      list: active,
    },
    {
      value: "archived",
      title: t("archived", "Archived"),
      empty: t("no_archived_tournaments", "No archived tournaments."),
      list: archived,
    },
  ];

  return (
    <Stack gap="md">
      <Select
        label={t("sort_tournaments", "Sort")}
        value={sort}
        onChange={(value) => value && setSort(value as TournamentSort)}
        data={[
          { value: "name", label: t("sort_by_name", "Name") },
          { value: "created", label: t("sort_by_date_added", "Date added") },
        ]}
        allowDeselect={false}
        w={200}
      />
      <Accordion multiple defaultValue={["active", "archived"]} variant="separated">
        {sections.map((section) => (
          <Accordion.Item key={section.value} value={section.value}>
            <Accordion.Control>
              <Text fw={600}>
                {section.title} ({section.list.length})
              </Text>
            </Accordion.Control>
            <Accordion.Panel>
              {section.list.length < 1 ? (
                <Text size="sm" c="dimmed">
                  {section.empty}
                </Text>
              ) : (
                <Group gap="sm" style={{ width: "100%" }}>
                  {renderCards(section.list)}
                </Group>
              )}
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>
    </Stack>
  );
}
