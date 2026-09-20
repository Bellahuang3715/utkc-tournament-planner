import React, { useState, useEffect, useMemo } from "react";
import {
  Accordion,
  ActionIcon,
  Badge,
  Button,
  Center,
  Group,
  Loader,
  Paper,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { useTranslation } from "next-i18next/pages";
import { IconDownload, IconPencil, IconTrash } from "@tabler/icons-react";
import { serverSideTranslations } from "next-i18next/pages/serverSideTranslations";
import { useRouter } from "next/router";

import TournamentLayout from "../../_tournament_layout";
import { getTournamentIdFromRouter } from "../../../../components/utils/util";
import DivisionDetailsModal from "../../../../components/modals/division_details_modal";
import DivisionPlayersTable from "../../../../components/tables/division_players";
import DivisionTeamsTable from "../../../../components/tables/division_teams";
import { getDivisions, getClubs } from "../../../../services/adapter";
import RequestErrorAlert from "../../../../components/utils/error_alert";
import { deleteDivision } from "../../../../services/division";
import {
  BracketPairsSection,
  PosterGroupsSection,
  BracketPairsSectionTeams,
  PosterGroupsSectionTeams,
} from "../../../../components/utils/brackets_editor/index";
import {
  DEFAULT_BOOKLET,
  DEFAULT_POSTER,
} from "../../../../components/utils/brackets_editor/shared";
import {
  BracketWithPlayers,
  BracketWithTeams,
} from "../../../../interfaces/bracket";
import {
  fetchDivisionBracketsWithPlayers,
  fetchDivisionBracketsWithTeams,
} from "../../../../services/bracket";
import { ViewMode } from "../../../../interfaces/bracket";

import {
  exportBracketsToExcel,
  exportTeamBracketsToExcel,
} from "../../../../components/export/exportExcel";

interface BracketData {
  id: string;
  name: string;
  payload: any;
}

interface GroupModel {
  id: number;
  name: string;
  categoryId: string;
  matchDuration: number; // minutes
  overtimeDuration: number; // minutes
  totalPlayers: number;
  brackets: BracketData[];
}

export default function BracketsPage() {
  const { t } = useTranslation();
  const router = useRouter();

  // control which accordion item is open (so we can know collapsed/expanded)
  const [openItem, setOpenItem] = useState<string | null>(null);

  // details modal state
  const [editDetailsOf, setEditDetailsOf] = useState<GroupModel | null>(null);

  const { id: tournamentId, tournamentData } = getTournamentIdFromRouter();
  const tournamentIdValid = Number.isFinite(tournamentId);

  const [brackets, setBrackets] = useState<BracketWithPlayers[] | null>(null);
  const [bracketsTeams, setBracketsTeams] = useState<BracketWithTeams[] | null>(
    null
  );

  const [viewMode, setViewMode] = useState<ViewMode>("booklet");

  const swrDivisions = getDivisions(tournamentIdValid ? tournamentData.id : null);
  const groups = swrDivisions.data?.data ?? [];
  const swrClubs = getClubs();
  const clubs = swrClubs.data?.data ?? [];
  const clubAbbrevByName = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of clubs) m.set(c.name, c.abbreviation);
    return m;
  }, [clubs]);

  useEffect(() => {
    if (!openItem) return;

    const divisionId = Number(openItem);
    if (!Number.isFinite(divisionId)) return;

    const group = groups.find((g: any) => g.id === divisionId);
    if (group?.division_type === "TEAMS") {
      setBrackets(null);
      fetchDivisionBracketsWithTeams(divisionId).then((res) => {
        setBracketsTeams(res.data.data);
      });
    } else {
      setBracketsTeams(null);
      fetchDivisionBracketsWithPlayers(divisionId).then((res) => {
        setBrackets(res.data.data);
      });
    }
  }, [openItem, groups]);

  const sorted = useMemo(
    () => (brackets ?? []).slice().sort((a, b) => a.index - b.index),
    [brackets],
  );

  const pairs = useMemo(() => {
    const out: Array<{ left: BracketWithPlayers; right?: BracketWithPlayers }> =
      [];
    for (let i = 0; i < sorted.length; i += 2) {
      out.push({ left: sorted[i], right: sorted[i + 1] });
    }
    return out;
  }, [sorted]);

  const sortedTeams = useMemo(
    () => (bracketsTeams ?? []).slice().sort((a, b) => a.index - b.index),
    [bracketsTeams],
  );

  const pairsTeams = useMemo(() => {
    const out: Array<{ left: BracketWithTeams; right?: BracketWithTeams }> = [];
    for (let i = 0; i < sortedTeams.length; i += 2) {
      out.push({ left: sortedTeams[i], right: sortedTeams[i + 1] });
    }
    return out;
  }, [sortedTeams]);

  if (swrDivisions.error)
    return <RequestErrorAlert error={swrDivisions.error} />;

  if (!tournamentIdValid || !swrDivisions.data) {
    return (
      <Center style={{ minHeight: 400 }}>
        <Loader />
      </Center>
    );
  }

  const handleSaveGroupDetails = async () => {
    await swrDivisions.mutate();
    setEditDetailsOf(null);
  };

  const downloadExcel = async (divisionId: number) => {
    const group = groups.find((g: any) => g.id === divisionId);
    const divisionName = group?.name ?? `Division ${divisionId}`;
    const isTeams = group?.division_type === "TEAMS";

    try {
      if (isTeams) {
        const res = await fetchDivisionBracketsWithTeams(divisionId);
        await exportTeamBracketsToExcel(
          divisionName,
          res.data.data as BracketWithTeams[],
          `${divisionName}.xlsx`,
        );
      } else {
        const res = await fetchDivisionBracketsWithPlayers(divisionId);
        await exportBracketsToExcel(
          divisionName,
          res.data.data as BracketWithPlayers[],
          `${divisionName}.xlsx`,
          clubAbbrevByName,
        );
      }
    } catch (err: any) {
      window.alert(err?.message || t("export_failed", "Export failed"));
    }
  };

  return (
    <TournamentLayout tournament_id={tournamentData.id}>
      <Stack gap="lg">
        <Stack gap={4}>
          <Title order={2}>{t("divisions_title", "Divisions")}</Title>
          <Text size="sm" c="dimmed" maw={560}>
            {t(
              "divisions_page_subtitle",
              "Open a division to manage details, roster, and bracket trees",
            )}
          </Text>
        </Stack>

        {groups.length === 0 ? (
          <Paper withBorder radius="md" p="xl">
            <Stack gap="xs" align="flex-start">
              <Text fw={600}>{t("no_divisions_title", "No divisions yet")}</Text>
              <Text size="sm" c="dimmed">
                {t(
                  "no_divisions_description",
                  "Generate brackets from Players or Teams to create your first division.",
                )}
              </Text>
            </Stack>
          </Paper>
        ) : (
          <Accordion
            variant="separated"
            radius="md"
            value={openItem}
            onChange={setOpenItem}
            chevronPosition="left"
          >
            {groups.map((group: any) => {
              const opened = openItem === String(group.id);
              const isTeams = group.division_type === "TEAMS";
              const countLabel =
                typeof group.totalPlayers === "number"
                  ? `${group.totalPlayers} ${
                      isTeams
                        ? t("teams_title", "teams")
                        : t("players", "players")
                    }`
                  : null;

              return (
                <Accordion.Item key={group.id} value={String(group.id)}>
                  <Accordion.Control>
                    <Group justify="space-between" wrap="nowrap" w="100%" pr="xs">
                      <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                        <Text fw={600} truncate>
                          {group.name}
                        </Text>
                        <Badge
                          variant="light"
                          color={isTeams ? "blue" : "violet"}
                          size="sm"
                        >
                          {isTeams
                            ? t("teams_title", "Teams")
                            : t("individuals", "Individuals")}
                        </Badge>
                        {group.prefix ? (
                          <Badge variant="outline" color="gray" size="sm">
                            {group.prefix}
                          </Badge>
                        ) : null}
                        {countLabel ? (
                          <Text size="sm" c="dimmed" visibleFrom="sm">
                            {countLabel}
                          </Text>
                        ) : null}
                      </Group>

                      {!opened && (
                        <Group
                          gap={4}
                          wrap="nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Tooltip label={t("download_excel", "Download Excel")}>
                            <ActionIcon
                              variant="subtle"
                              color="gray"
                              aria-label={t("download_excel", "Download Excel")}
                              onClick={() => void downloadExcel(group.id)}
                            >
                              <IconDownload size={18} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label={t("delete", "Delete")}>
                            <ActionIcon
                              variant="subtle"
                              color="red"
                              aria-label={t("delete", "Delete")}
                              onClick={async () => {
                                if (
                                  confirm(
                                    t(
                                      "confirm_delete_group",
                                      "Delete this division?",
                                    ),
                                  )
                                ) {
                                  await deleteDivision(group.id);
                                  await swrDivisions.mutate();
                                }
                              }}
                            >
                              <IconTrash size={18} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      )}
                    </Group>
                  </Accordion.Control>

                  <Accordion.Panel>
                    <Tabs defaultValue="details">
                      <Tabs.List>
                        <Tabs.Tab value="details">
                          {t("details", "Details")}
                        </Tabs.Tab>
                        {isTeams ? (
                          <Tabs.Tab value="teams">
                            {t("teams_title", "Teams")}
                          </Tabs.Tab>
                        ) : (
                          <Tabs.Tab value="players">
                            {t("players", "Players")}
                          </Tabs.Tab>
                        )}
                        <Tabs.Tab value="trees">
                          {t("trees", "Trees")}
                        </Tabs.Tab>
                      </Tabs.List>

                      <Tabs.Panel value="details" pt="md">
                        <Stack gap="md">
                          <Group justify="space-between" align="center">
                            <Text fw={600}>
                              {t("group_information", "Division information")}
                            </Text>
                            <Button
                              variant="light"
                              size="sm"
                              leftSection={<IconPencil size={16} />}
                              onClick={() => setEditDetailsOf(group)}
                            >
                              {t("edit_details", "Edit details")}
                            </Button>
                          </Group>

                          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                            <Paper withBorder radius="md" p="md">
                              <Text size="xs" c="dimmed" tt="uppercase">
                                {t("group_name", "Name")}
                              </Text>
                              <Text fw={600} mt={4}>
                                {group.name}
                              </Text>
                            </Paper>
                            <Paper withBorder radius="md" p="md">
                              <Text size="xs" c="dimmed" tt="uppercase">
                                {t("prefix", "Prefix")}
                              </Text>
                              <Text fw={600} mt={4}>
                                {group.prefix ?? "—"}
                              </Text>
                            </Paper>
                            <Paper withBorder radius="md" p="md">
                              <Text size="xs" c="dimmed" tt="uppercase">
                                {t("division_type", "Type")}
                              </Text>
                              <Badge
                                mt={6}
                                variant="light"
                                color={isTeams ? "blue" : "violet"}
                              >
                                {isTeams
                                  ? t("teams_title", "Teams")
                                  : t("individuals", "Individuals")}
                              </Badge>
                            </Paper>
                            <Paper withBorder radius="md" p="md">
                              <Text size="xs" c="dimmed" tt="uppercase">
                                {t("match_duration", "Match duration")}
                              </Text>
                              <Text fw={600} mt={4}>
                                {group.duration_mins} {t("minutes_short", "min")}
                              </Text>
                            </Paper>
                            <Paper withBorder radius="md" p="md">
                              <Text size="xs" c="dimmed" tt="uppercase">
                                {t("overtime_duration", "Overtime / margin")}
                              </Text>
                              <Text fw={600} mt={4}>
                                {group.margin_mins} {t("minutes_short", "min")}
                              </Text>
                            </Paper>
                            {countLabel ? (
                              <Paper withBorder radius="md" p="md">
                                <Text size="xs" c="dimmed" tt="uppercase">
                                  {isTeams
                                    ? t("teams_title", "Teams")
                                    : t("players", "Players")}
                                </Text>
                                <Text fw={600} mt={4}>
                                  {countLabel}
                                </Text>
                              </Paper>
                            ) : null}
                          </SimpleGrid>
                        </Stack>
                      </Tabs.Panel>

                      <Tabs.Panel value="players" pt="md">
                        <DivisionPlayersTable
                          tournamentId={tournamentData.id}
                          divisionId={group.id}
                          divisionName={group.name}
                          divisionPrefix={group.prefix}
                        />
                      </Tabs.Panel>

                      <Tabs.Panel value="teams" pt="md">
                        <DivisionTeamsTable
                          tournamentId={tournamentData.id}
                          divisionId={group.id}
                        />
                      </Tabs.Panel>

                      <Tabs.Panel value="trees" pt="md">
                        <Stack gap="md">
                          <Group justify="space-between" align="center" wrap="wrap">
                            <Text c="dimmed" size="sm" maw={420}>
                              {t(
                                "trees_note",
                                "Preview booklet or poster layout for this division’s trees.",
                              )}
                            </Text>
                            <Button
                              variant="light"
                              size="sm"
                              leftSection={<IconPencil size={16} />}
                              onClick={() =>
                                router.push(
                                  `/tournaments/${tournamentData.id}/divisions/${group.id}/edit`,
                                )
                              }
                            >
                              {t("edit_trees", "Edit trees")}
                            </Button>
                          </Group>

                          <SegmentedControl
                            value={viewMode}
                            onChange={(v) => setViewMode(v as ViewMode)}
                            data={[
                              {
                                label: t("booklet", "Booklet"),
                                value: "booklet",
                              },
                              {
                                label: t("poster", "Poster"),
                                value: "poster",
                              },
                            ]}
                          />

                          <Stack gap="sm">
                            {isTeams ? (
                              viewMode === "booklet" ? (
                                <BracketPairsSectionTeams
                                  brackets={bracketsTeams}
                                  pairs={pairsTeams}
                                  formatStyles={DEFAULT_BOOKLET}
                                />
                              ) : (
                                <PosterGroupsSectionTeams
                                  brackets={bracketsTeams}
                                  formatStyles={DEFAULT_POSTER}
                                />
                              )
                            ) : viewMode === "booklet" ? (
                              <BracketPairsSection
                                brackets={brackets}
                                pairs={pairs}
                                formatStyles={DEFAULT_BOOKLET}
                              />
                            ) : (
                              <PosterGroupsSection
                                brackets={brackets}
                                formatStyles={DEFAULT_POSTER}
                              />
                            )}
                          </Stack>
                        </Stack>
                      </Tabs.Panel>
                    </Tabs>
                  </Accordion.Panel>
                </Accordion.Item>
              );
            })}
          </Accordion>
        )}

        <DivisionDetailsModal
          opened={!!editDetailsOf}
          group={editDetailsOf}
          onClose={() => setEditDetailsOf(null)}
          onSave={handleSaveGroupDetails}
        />
      </Stack>
    </TournamentLayout>
  );
}

export const getServerSideProps = async ({ locale }: { locale: string }) => ({
  props: {
    ...(await serverSideTranslations(locale ?? "en", ["common"])),
  },
});
