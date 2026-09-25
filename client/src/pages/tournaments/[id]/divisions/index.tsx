import React, { useState, useEffect, useMemo } from "react";
import {
  Accordion,
  ActionIcon,
  Alert,
  Badge,
  Button,
  Center,
  Group,
  Loader,
  Paper,
  SegmentedControl,
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
import DivisionTimingModal from "../../../../components/modals/division_timing_modal";
// BracketExportModal kept for future expanded/collapsed multi-export UI:
// import BracketExportModal from "../../../../components/modals/bracket_export_modal";
import DivisionPlayersTable from "../../../../components/tables/division_players";
import DivisionTeamsTable from "../../../../components/tables/division_teams";
import { getDivisions, getClubs, getDivisionLock } from "../../../../services/adapter";
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

function DivisionTimingLine({
  durationMins,
  marginMins,
  onEdit,
}: {
  durationMins: number;
  marginMins: number;
  onEdit: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Group justify="space-between" align="center" wrap="wrap">
      <Text size="sm" c="dimmed">
        {durationMins} {t("minutes_short", "min")} {t("match_duration_short", "match")}
        {" · "}
        {marginMins} {t("minutes_short", "min")} {t("margin_short", "margin")}
      </Text>
      <Button
        variant="light"
        size="sm"
        leftSection={<IconPencil size={16} />}
        onClick={onEdit}
      >
        {t("edit_timing", "Edit timing")}
      </Button>
    </Group>
  );
}

function EditTreesControls({
  tournamentId,
  divisionId,
}: {
  tournamentId: number;
  divisionId: number;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const swrLock = getDivisionLock(divisionId);
  const locked = Boolean(swrLock.data?.data?.locked);

  return (
    <Stack gap="sm">
      {locked && (
        <Alert color="orange" title={t("division_locked", "Locked")}>
          {t(
            "division_locked_roster_alert",
            "Scorekeeping has started — roster and seeding are locked. Unlock from Scores by clearing all scores.",
          )}
        </Alert>
      )}
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
          disabled={locked}
          onClick={() =>
            router.push(`/tournaments/${tournamentId}/divisions/${divisionId}/edit`)
          }
        >
          {t("edit_trees", "Edit trees")}
        </Button>
      </Group>
    </Stack>
  );
}

export default function BracketsPage() {
  const { t } = useTranslation();
  const router = useRouter();

  // control which accordion item is open (so we can know collapsed/expanded)
  const [openItem, setOpenItem] = useState<string | null>(null);

  const [editingTiming, setEditingTiming] = useState<any | null>(null);

  const { id: tournamentId, tournamentData } = getTournamentIdFromRouter();
  const tournamentIdValid = Number.isFinite(tournamentId);

  const [brackets, setBrackets] = useState<BracketWithPlayers[] | null>(null);
  const [bracketsTeams, setBracketsTeams] = useState<BracketWithTeams[] | null>(
    null
  );

  const [viewMode, setViewMode] = useState<ViewMode>("booklet");

  const swrDivisions = getDivisions(tournamentIdValid ? tournamentData.id : null);
  const groups = useMemo(() => {
    const list = swrDivisions.data?.data ?? [];
    return list
      .slice()
      .sort((a: any, b: any) =>
        String(a.name ?? "").localeCompare(String(b.name ?? ""), undefined, {
          sensitivity: "base",
        }),
      );
  }, [swrDivisions.data?.data]);
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
          undefined,
          "expanded",
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
              "Open a division to manage its roster, match timing, and bracket trees",
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
                    <Tabs defaultValue={isTeams ? "teams" : "players"}>
                      <Tabs.List>
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

                      {isTeams ? (
                        <Tabs.Panel value="teams" pt="md">
                          <Stack gap="md">
                            <DivisionTimingLine
                              durationMins={group.duration_mins}
                              marginMins={group.margin_mins}
                              onEdit={() => setEditingTiming(group)}
                            />
                            <DivisionTeamsTable
                              tournamentId={tournamentData.id}
                              divisionId={group.id}
                            />
                          </Stack>
                        </Tabs.Panel>
                      ) : (
                        <Tabs.Panel value="players" pt="md">
                          <Stack gap="md">
                            <DivisionTimingLine
                              durationMins={group.duration_mins}
                              marginMins={group.margin_mins}
                              onEdit={() => setEditingTiming(group)}
                            />
                            <DivisionPlayersTable
                              tournamentId={tournamentData.id}
                              divisionId={group.id}
                              divisionName={group.name}
                              divisionPrefix={group.prefix}
                            />
                          </Stack>
                        </Tabs.Panel>
                      )}

                      <Tabs.Panel value="trees" pt="md">
                        <Stack gap="md">
                          <EditTreesControls
                            tournamentId={tournamentData.id}
                            divisionId={group.id}
                          />

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

        <DivisionTimingModal
          opened={!!editingTiming}
          division={
            editingTiming
              ? {
                  id: editingTiming.id,
                  name: editingTiming.name,
                  prefix: editingTiming.prefix,
                  duration_mins: editingTiming.duration_mins,
                  margin_mins: editingTiming.margin_mins,
                  division_type: editingTiming.division_type,
                }
              : null
          }
          tournamentId={tournamentData.id}
          onClose={() => setEditingTiming(null)}
          onSaved={() => swrDivisions.mutate()}
        />
        {/* BracketExportModal (expanded/collapsed multi-select) — re-enable later */}
      </Stack>
    </TournamentLayout>
  );
}

export const getServerSideProps = async ({ locale }: { locale: string }) => ({
  props: {
    ...(await serverSideTranslations(locale ?? "en", ["common"])),
  },
});
