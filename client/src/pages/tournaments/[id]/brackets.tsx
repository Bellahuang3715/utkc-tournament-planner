// pages/brackets.tsx
import React, { useState, useEffect } from "react";
import {
  Accordion,
  Tabs,
  Button,
  Group,
  Modal,
  Stack,
  Title,
  Loader,
  Center,
  Grid,
  TextInput,
  NumberInput,
} from "@mantine/core";
import { useTranslation } from "next-i18next";
import { IconPencil, IconDownload } from "@tabler/icons-react";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { saveAs } from "file-saver";
// import html2canvas from 'html2canvas';
// import jsPDF from 'jspdf';

import TournamentLayout from "../_tournament_layout";
import { getTournamentIdFromRouter } from "../../../components/utils/util";

//
// --- Types ---
//
interface BracketData {
  id: string;
  name: string;
  payload: any; // your real bracket payload
}

interface Group {
  id: number;
  name: string;
  categoryId: string;
  matchDuration: number; // in minutes
  overtimeDuration: number; // in minutes
  totalPlayers: number;
  brackets: BracketData[];
}

//
// --- Stubbed data fetch --- replace with your SWR/API call
//
async function fetchGroups(): Promise<Group[]> {
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
    // ...
  ];
}

//
// --- BracketView --- replace with your real renderer
//
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

//
// --- Batch Editor --- pop up all bracket editors at once
//
function BracketEditorBatch({
  group,
  onSave,
  onCancel,
}: {
  group: Group;
  onSave: (updatedGroup: Group) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<Group>(group);

  return (
    <Stack gap="md">
      <Title order={4}>{t("edit_group", "Edit Group")}</Title>

      {/* 1) Group settings */}
      <TextInput
        label={t("group_name", "Group Name")}
        value={draft.name}
        onChange={(e) =>
          setDraft((d) => ({ ...d, name: e.currentTarget.value }))
        }
      />
      <TextInput
        label={t("category_id", "Category ID")}
        value={draft.categoryId}
        onChange={(e) =>
          setDraft((d) => ({ ...d, categoryId: e.currentTarget.value }))
        }
      />
      <NumberInput
        label={t("match_duration", "Match Duration (min)")}
        min={0}
        value={draft.matchDuration}
        onChange={(v) =>
          typeof v === "number" && setDraft((d) => ({ ...d, matchDuration: v }))
        }
      />
      <NumberInput
        label={t("overtime_duration", "Overtime Duration (min)")}
        min={0}
        value={draft.overtimeDuration}
        onChange={(v) =>
          typeof v === "number" &&
          setDraft((d) => ({ ...d, overtimeDuration: v }))
        }
      />
      <NumberInput
        label={t("total_players", "Total Players")}
        min={0}
        value={draft.totalPlayers}
        onChange={(v) =>
          typeof v === "number" && setDraft((d) => ({ ...d, totalPlayers: v }))
        }
      />

      {/* 2) All bracket editors */}
      {draft.brackets.map((b, idx) => (
        <Stack key={b.id} gap="xs">
          <Title order={5}>
            {t("bracket", "Bracket")}: {b.name}
          </Title>
          {/* Replace this with your real bracket‐specific editor */}
          <TextInput
            placeholder={t("edit_placeholder", "Edit bracket title")}
            value={b.payload.title || ""}
            onChange={(e) => {
              const newBrackets = [...draft.brackets];
              newBrackets[idx] = {
                ...b,
                payload: { ...b.payload, title: e.currentTarget.value },
              };
              setDraft((d) => ({ ...d, brackets: newBrackets }));
            }}
          />
        </Stack>
      ))}

      <Group gap="right" mt="md">
        <Button variant="default" onClick={onCancel}>
          {t("cancel")}
        </Button>
        <Button onClick={() => onSave(draft)}>{t("save_all")}</Button>
      </Group>
    </Stack>
  );
}

export default function BracketsPage() {
  const { t } = useTranslation();
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

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

  // update a single group's bracket sets
  const handleSaveEdits = (updated: Group) => {
    setGroups((gs) => gs!.map((g) => (g.id === updated.id ? updated : g)));
    setModalOpen(false);
    setEditingGroup(null);
  };

  // PDF export entire grid of brackets for a group/format
  const downloadPDF = async (groupId: number, format: string) => {
    // const container = document.getElementById(`bracket-${groupId}-${format}`);
    // if (!container) return;
    // const canvas = await html2canvas(container, { scale: 2 });
    // const img = canvas.toDataURL('image/png');
    // const pdf = new jsPDF('landscape','pt','a4');
    // const w = pdf.internal.pageSize.getWidth();
    // const h = (canvas.height*w)/canvas.width;
    // pdf.addImage(img,'PNG',0,0,w,h);
    // saveAs(pdf.output('blob'), `group-${groupId}-${format}.pdf`);
  };

  return (
    <TournamentLayout tournament_id={tournamentData.id}>
      <Stack gap="xl" p="md">
        <Title order={2}>{t("brackets")}</Title>
        <Accordion variant="separated">
          {groups.map((group) => (
            <Accordion.Item key={group.id} value={String(group.id)}>
              <Accordion.Control>
                {group.name} ({group.totalPlayers} {t("players")})
              </Accordion.Control>
              <Accordion.Panel>
                <Tabs defaultValue="booklet">
                  <Tabs.List>
                    <Tabs.Tab value="booklet">{t("booklet")}</Tabs.Tab>
                    <Tabs.Tab value="posterCollapsed">
                      {t("poster_collapsed")}
                    </Tabs.Tab>
                    <Tabs.Tab value="posterExpanded">
                      {t("poster_expanded")}
                    </Tabs.Tab>
                  </Tabs.List>

                  {(
                    ["booklet", "posterCollapsed", "posterExpanded"] as const
                  ).map((fmt) => (
                    <Tabs.Panel key={fmt} value={fmt} pt="md">
                      <Group gap="right" mb="sm">
                        {fmt === "booklet" && (
                          <Button
                            leftSection={<IconPencil size={16} />}
                            onClick={() => {
                              setEditingGroup(group);
                              setModalOpen(true);
                            }}
                          >
                            {t("edit_all")}
                          </Button>
                        )}
                        <Button
                          leftSection={<IconDownload size={16} />}
                          onClick={() => downloadPDF(group.id, fmt)}
                        >
                          {t("download_pdf")}
                        </Button>
                      </Group>

                      <div id={`bracket-${group.id}-${fmt}`}>
                        <Grid gutter="md">
                          {group.brackets.map((b) => (
                            <Grid.Col key={b.id} span={4}>
                              <BracketView
                                data={b.payload}
                                title={b.name}
                                format={fmt}
                              />
                            </Grid.Col>
                          ))}
                        </Grid>
                      </div>
                    </Tabs.Panel>
                  ))}
                </Tabs>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>

        <Modal
          opened={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingGroup?.name}
          size="lg"
          centered
        >
          {editingGroup && (
            <BracketEditorBatch
              group={editingGroup}
              onSave={handleSaveEdits}
              onCancel={() => setModalOpen(false)}
            />
          )}
        </Modal>
      </Stack>
    </TournamentLayout>
  );
}

export const getServerSideProps = async ({ locale }: { locale: string }) => ({
  props: {
    ...(await serverSideTranslations(locale ?? "en", ["common"])),
  },
});
