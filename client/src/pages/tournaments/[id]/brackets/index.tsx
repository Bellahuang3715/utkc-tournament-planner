import React, { useState, useEffect } from "react";
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
  Divider,
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

type Format = "booklet" | "posterCollapsed" | "posterExpanded";

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

async function fetchGroups(): Promise<GroupModel[]> {
  return [
    {
      id: 1,
      name: "Division A - Men's Individuals",
      categoryId: "A",
      matchDuration: 10,
      overtimeDuration: 2,
      totalPlayers: 24,
      brackets: [
        { id: "b1", name: "Pool 1", payload: {} },
        { id: "b2", name: "Pool 2", payload: {} },
        { id: "b3", name: "Pool 3", payload: {} },
      ],
    },
  ];
}

function BracketView({
  data,
  title,
  format,
}: {
  data: any;
  title: string;
  format: string;
}) {
  return (
    <Center
      style={{
        minHeight: 180,
        border: "1px solid #ddd",
        padding: 8,
        flexDirection: "column",
      }}
    >
      <Title order={5}>{title}</Title>
      <div>
        <em>{format}</em> view
      </div>
    </Center>
  );
}


// --- MAIN PAGE ---------------------------------------------------------------
export default function BracketsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [groups, setGroups] = useState<GroupModel[] | null>(null);

  // control which accordion item is open (so we can know collapsed/expanded)
  const [openItem, setOpenItem] = useState<string | null>(null);

  // download modal state
  const [dlGroup, setDlGroup] = useState<GroupModel | null>(null);

  // details modal state
  const [editDetailsOf, setEditDetailsOf] = useState<GroupModel | null>(null);

  const { tournamentData } = getTournamentIdFromRouter();

  useEffect(() => {
    fetchGroups().then(setGroups);
  }, []);

  if (!groups) {
    return (
      <Center style={{ minHeight: 400 }}>
        <Loader />
      </Center>
    );
  }

  const handleSaveGroupDetails = (updated: GroupModel) => {
    setGroups((gs) => gs!.map((g) => (g.id === updated.id ? updated : g)));
    setEditDetailsOf(null);
  };

  const downloadPDF = async (groupId: number, format: Format) => {
    // TODO: wire html2canvas/jsPDF here if desired.
    // This function will be called once per selected format.
    console.log("downloadPDF", { groupId, format });
  };

  return (
    <TournamentLayout tournament_id={tournamentData.id}>
      <Stack gap="xl" p="md">
        <Title order={2}>{t("brackets")}</Title>

        <Accordion variant="separated" value={openItem} onChange={setOpenItem} chevronPosition="left">
          {groups.map((group) => {
            const opened = openItem === String(group.id);

            return (
              <Accordion.Item key={group.id} value={String(group.id)}>
                <Accordion.Control>
                  <Group justify="space-between" wrap="nowrap" w="100%">
                    <Text>
                      {group.name} ({group.totalPlayers} {t("players")})
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
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(t("confirm_delete_group", "Delete this group?"))) {
                              // TODO: call API then update state
                              setGroups((gs) => gs!.filter((g) => g.id !== group.id));
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
                      <Tabs.Tab value="details">{t("details", "Details")}</Tabs.Tab>
                      <Tabs.Tab value="players">{t("players", "Players")}</Tabs.Tab>
                      <Tabs.Tab value="trees">{t("trees", "Trees")}</Tabs.Tab>
                    </Tabs.List>

                    {/* DETAILS TAB */}
                    <Tabs.Panel value="details" pt="md">
                      <Stack gap="sm">
                        {/* <Title order={4}>{t("group_information", "Group Information")}</Title> */}
                        <Group justify="space-between" align="center">
                          <Title order={4}>{t("group_information", "Group Information")}</Title>
                          <Button
                            leftSection={<IconPencil size={16} />}
                            onClick={() => setEditDetailsOf(group)}
                          >
                            {t("edit_details", "Edit details")}
                          </Button>
                        </Group>
                        <Grid>
                          <Grid.Col span={{ base: 12, sm: 6 }}>
                            <Text><b>{t("group_name", "Group Name")}:</b> {group.name}</Text>
                            <Text><b>{t("category_id", "Category ID")}:</b> {group.categoryId}</Text>
                            <Text><b>{t("total_players", "Total Players")}:</b> {group.totalPlayers}</Text>
                          </Grid.Col>
                          <Grid.Col span={{ base: 12, sm: 6 }}>
                            <Text><b>{t("match_duration", "Match Duration (min)")}:</b> {group.matchDuration}</Text>
                            <Text><b>{t("overtime_duration", "Overtime Duration (min)")}:</b> {group.overtimeDuration}</Text>
                          </Grid.Col>
                        </Grid>
                      </Stack>
                    </Tabs.Panel>

                    {/* PLAYERS TAB */}
                    <Tabs.Panel value="players" pt="md">
                      <DivisionPlayersTable
                        tournamentId={tournamentData.id}
                        divisionId={group.id}
                      />
                    </Tabs.Panel>

                    {/* TREES TAB */}
                    <Tabs.Panel value="trees" pt="md">
                      <Stack gap="sm">
                        <Group justify="space-between" align="center">
                          <Title order={4}>{t("bracket_trees", "Bracket Trees")}</Title>
                          <Button
                            leftSection={<IconPencil size={16} />}
                            onClick={() =>
                              router.push(
                                `/tournaments/${tournamentData.id}/brackets/${group.id}/seeding`
                              )
                            }
                          >
                            {t("edit_trees", "Edit trees")}
                          </Button>
                        </Group>

                        <Text c="dimmed" size="sm">
                          {t(
                            "trees_note",
                            "Choose a format to preview all trees in this group."
                          )}
                        </Text>

                        <Divider />

                        <FormatPreviewGrid group={group} />
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
          onConfirm={(formats) => {
            if (dlGroup) {
              formats.forEach((fmt) => downloadPDF(dlGroup.id, fmt));
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
      </Stack>
    </TournamentLayout>
  );
}

function FormatPreviewGrid({ group }: { group: GroupModel }) {
  const { t } = useTranslation();
  const [format, setFormat] = useState<Format>("booklet");

  return (
    <Stack>
      <SegmentedControl
        value={format}
        onChange={(v) => setFormat(v as Format)}
        data={[
          { label: t("booklet", "Booklet"), value: "booklet" },
          { label: t("poster_collapsed", "Poster (Collapsed)"), value: "posterCollapsed" },
          { label: t("poster_expanded", "Poster (Expanded)"), value: "posterExpanded" },
        ]}
      />
      <div id={`bracket-${group.id}-${format}`}>
        <Grid gutter="md">
          {group.brackets.map((b) => (
            <Grid.Col key={b.id} span={{ base: 12, sm: 6, md: 4 }}>
              <BracketView data={b.payload} title={b.name} format={format} />
            </Grid.Col>
          ))}
        </Grid>
      </div>
    </Stack>
  );
}

export const getServerSideProps = async ({ locale }: { locale: string }) => ({
  props: {
    ...(await serverSideTranslations(locale ?? "en", ["common"])),
  },
});
