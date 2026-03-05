import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Accordion,
  Tabs,
  Button,
  Group,
  Stack,
  Title,
  Loader,
  Center,
  Grid,
  SegmentedControl,
  Text,
  Box,
} from "@mantine/core";
import { useTranslation } from "next-i18next";
import { IconDownload, IconPencil, IconTrash } from "@tabler/icons-react";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useRouter } from "next/router";

import TournamentLayout from "../../_tournament_layout";
import { getTournamentIdFromRouter } from "../../../../components/utils/util";
import { BracketDownloadModal } from "../../../../components/modals/bracket_download_modal";
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
  BracketWithPlayers,
  BracketWithTeams,
} from "../../../../interfaces/bracket";
import {
  fetchDivisionBracketsWithPlayers,
  fetchDivisionBracketsWithTeams,
} from "../../../../services/bracket";
import { ViewMode } from "../../../../interfaces/bracket";

import { exportBracketsToExcel } from "../../../../components/export/exportExcel";
import { BracketsExportCanvas } from "../../../../components/export/BracketsExportCanvas";
import { exportElementToPdf } from "../../../../components/export/exportPdf";

type Format = "booklet" | "poster";

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

  // download modal state
  const [dlGroup, setDlGroup] = useState<GroupModel | null>(null);

  // details modal state
  const [editDetailsOf, setEditDetailsOf] = useState<GroupModel | null>(null);

  const { tournamentData } = getTournamentIdFromRouter();

  const [brackets, setBrackets] = useState<BracketWithPlayers[] | null>(null);
  const [bracketsTeams, setBracketsTeams] = useState<BracketWithTeams[] | null>(
    null
  );

  const [viewMode, setViewMode] = useState<ViewMode>("booklet");

  const exportRef = useRef<HTMLDivElement | null>(null);
  const [exporting, setExporting] = useState<{
    divisionId: number;
    divisionName: string;
    format: Format;
    brackets?: BracketWithPlayers[];
    bracketsTeams?: BracketWithTeams[];
    clubAbbrevByName?: Map<string, string>;
  } | null>(null);

  const swrDivisions = getDivisions(tournamentData.id);
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

  if (!swrDivisions.data) {
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

  /** Wait for the export canvas to mount and render [data-export-page] (needed for teams/heavy trees). */
  const waitForExportCanvas = (timeoutMs = 3000): Promise<HTMLDivElement | null> => {
    return new Promise((resolve) => {
      const start = Date.now();
      const check = () => {
        const el = exportRef.current;
        const pages = el?.querySelectorAll?.("[data-export-page]");
        if (el && pages && pages.length > 0) {
          resolve(el);
          return;
        }
        if (Date.now() - start >= timeoutMs) {
          resolve(null);
          return;
        }
        requestAnimationFrame(check);
      };
      requestAnimationFrame(check);
    });
  };

  const downloadPDF = async (divisionId: number, format: Format) => {
    // Always fetch fresh for the division you’re exporting
    const group = groups.find((g: any) => g.id === divisionId);
    const divisionName = group?.name ?? `Division ${divisionId}`;
    const isTeams = group?.division_type === "TEAMS";

    if (isTeams) {
      const res = await fetchDivisionBracketsWithTeams(divisionId);
      const divisionBracketsTeams = res.data.data as BracketWithTeams[];

      setExporting({
        divisionId,
        divisionName,
        format,
        bracketsTeams: divisionBracketsTeams,
      });
    } else {
      const res = await fetchDivisionBracketsWithPlayers(divisionId);
      const divisionBrackets = res.data.data as BracketWithPlayers[];

      setExporting({
        divisionId,
        divisionName,
        format,
        brackets: divisionBrackets,
        clubAbbrevByName,
      });
    }

    const el = await waitForExportCanvas();
    if (!el) {
      setExporting(null);
      return;
    }

    await exportElementToPdf(el, `${divisionName}-${format}.pdf`, format);

    setExporting(null);
  };

  const downloadExcel = async (divisionId: number) => {
    const res = await fetchDivisionBracketsWithPlayers(divisionId);
    const divisionBrackets = res.data.data as BracketWithPlayers[];

    const divisionName =
      groups.find((g: any) => g.id === divisionId)?.name ??
      `Division ${divisionId}`;

    exportBracketsToExcel(
      divisionName,
      divisionBrackets,
      `${divisionName}.xlsx`,
    );
  };

  return (
    <TournamentLayout tournament_id={tournamentData.id}>
      <Stack gap="xl" p="md">
        <Title order={2}>{t("brackets")}</Title>

        <Accordion
          variant="separated"
          value={openItem}
          onChange={setOpenItem}
          chevronPosition="left"
        >
          {groups.map((group: any) => {
            const opened = openItem === String(group.id);

            return (
              <Accordion.Item key={group.id} value={String(group.id)}>
                <Accordion.Control>
                  <Group justify="space-between" wrap="nowrap" w="100%">
                    <Text>
                      {group.name}
                      {typeof group.totalPlayers === "number" && (
                        <> ({group.totalPlayers} {t("players")})</>
                      )}
                    </Text>

                    {/* Right-side Download button visible when collapsed */}
                    {!opened && (
                      <Group gap="xs">
                        <Button
                          size="xs"
                          leftSection={<IconDownload size={14} />}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDlGroup(group);
                          }}
                        >
                          {t("download", "Download")}
                        </Button>
                        <Button
                          size="xs"
                          color="red"
                          leftSection={<IconTrash size={16} />}
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (
                              confirm(
                                t("confirm_delete_group", "Delete this group?"),
                              )
                            ) {
                              await deleteDivision(group.id);
                              await swrDivisions.mutate();
                            }
                          }}
                        >
                          {t("delete", "Delete")}
                        </Button>
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
                      {group.division_type === "TEAMS" ? (
                        <Tabs.Tab value="teams">
                          {t("teams_title", "Teams")}
                        </Tabs.Tab>
                      ) : (
                        <Tabs.Tab value="players">
                          {t("players", "Players")}
                        </Tabs.Tab>
                      )}
                      <Tabs.Tab value="trees">{t("trees", "Trees")}</Tabs.Tab>
                    </Tabs.List>

                    {/* DETAILS TAB */}
                    <Tabs.Panel value="details" pt="md">
                      <Stack gap="sm">
                        {/* <Title order={4}>{t("group_information", "Group Information")}</Title> */}
                        <Group justify="space-between" align="center">
                          <Title order={4}>
                            {t("group_information", "Group Information")}
                          </Title>
                          <Button
                            leftSection={<IconPencil size={16} />}
                            onClick={() => setEditDetailsOf(group)}
                          >
                            {t("edit_details", "Edit details")}
                          </Button>
                        </Group>
                        <Grid>
                          <Grid.Col span={{ base: 12, sm: 6 }}>
                            <Text>
                              <b>{t("group_name", "Group Name")}:</b>{" "}
                              {group.name}
                            </Text>
                            <Text>
                              <b>{t("prefix", "prefix")}:</b>{" "}
                              {group.prefix ?? "—"}
                            </Text>
                            {/* <Text><b>{t("total_players", "Total Players")}:</b> {group.totalPlayers}</Text> */}
                          </Grid.Col>
                          <Grid.Col span={{ base: 12, sm: 6 }}>
                            <Text>
                              <b>
                                {t("match_duration", "Match Duration (min)")}:
                              </b>{" "}
                              {group.duration_mins}
                            </Text>
                            <Text>
                              <b>
                                {t(
                                  "overtime_duration",
                                  "Overtime Duration (min)",
                                )}
                                :
                              </b>{" "}
                              {group.margin_mins}
                            </Text>
                            <Text>
                              <b>{t("division_type", "Type")}:</b>{" "}
                              {group.division_type}
                            </Text>
                          </Grid.Col>
                        </Grid>
                      </Stack>
                    </Tabs.Panel>

                    {/* PLAYERS TAB (Individuals only) */}
                    <Tabs.Panel value="players" pt="md">
                      <DivisionPlayersTable
                        tournamentId={tournamentData.id}
                        divisionId={group.id}
                      />
                    </Tabs.Panel>

                    {/* TEAMS TAB (Teams only) */}
                    <Tabs.Panel value="teams" pt="md">
                      <DivisionTeamsTable divisionId={group.id} />
                    </Tabs.Panel>

                    {/* TREES TAB */}
                    <Tabs.Panel value="trees" pt="md">
                      <Stack gap="sm">
                        <Group justify="space-between" align="center">
                          <Text c="dimmed" size="sm">
                            {t(
                              "trees_note",
                              "Choose a format to preview all trees in this group.",
                            )}
                          </Text>
                          <Button
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

                        <Box
                          style={{
                            zIndex: 15,
                            background: "var(--mantine-color-body)",
                            borderBottom:
                              "1px solid var(--mantine-color-gray-3)",
                          }}
                        >
                          <Box p="sm">
                            <SegmentedControl
                              fullWidth
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
                          </Box>
                        </Box>

                        {/* Trees preview for the active format */}
                        <Stack gap="sm">
                          {group.division_type === "TEAMS" ? (
                            viewMode === "booklet" ? (
                              <BracketPairsSectionTeams
                                brackets={bracketsTeams}
                                pairs={pairsTeams}
                              />
                            ) : (
                              <PosterGroupsSectionTeams
                                brackets={bracketsTeams}
                              />
                            )
                          ) : viewMode === "booklet" ? (
                            <BracketPairsSection
                              brackets={brackets}
                              pairs={pairs}
                            />
                          ) : (
                            <PosterGroupsSection brackets={brackets} />
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

        {/* Download selection modal */}
        <BracketDownloadModal
          opened={!!dlGroup}
          onClose={() => setDlGroup(null)}
          onConfirm={async (formats) => {
            if (dlGroup) {
              for (const fmt of formats) {
                await downloadPDF(dlGroup.id, fmt);
              }
            }
            setDlGroup(null);
          }}
        />

        {/* Group details modal */}
        <DivisionDetailsModal
          opened={!!editDetailsOf}
          group={editDetailsOf}
          onClose={() => setEditDetailsOf(null)}
          onSave={handleSaveGroupDetails}
        />

        {/* Hidden exporter (canvas capture for PDF) */}
        {exporting && (
          <BracketsExportCanvas
            ref={exportRef}
            divisionName={exporting.divisionName}
            format={exporting.format}
            brackets={exporting.brackets}
            bracketsTeams={exporting.bracketsTeams}
            clubAbbrevByName={exporting.clubAbbrevByName}
          />
        )}
      </Stack>
    </TournamentLayout>
  );
}

export const getServerSideProps = async ({ locale }: { locale: string }) => ({
  props: {
    ...(await serverSideTranslations(locale ?? "en", ["common"])),
  },
});
