// modal for creating and updating teams
import { useEffect, useId, useRef, useState } from "react";
import {
  ActionIcon,
  Alert,
  Button,
  Center,
  Checkbox,
  Group,
  Loader,
  Modal,
  MultiSelect,
  Select,
  Stack,
  Tabs,
  Text,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { showNotification } from "@mantine/notifications";
import {
  IconInfoCircle,
  IconPlus,
  IconUsersGroup,
  IconUser,
  IconX,
} from "@tabler/icons-react";
import { useTranslation } from "next-i18next/pages";
import { SWRResponse } from "swr";

import { Player } from "../../interfaces/player";
import { getClubs, getPlayers, getTeamCategories } from "../../services/adapter";
import { createTeam, updateTeam } from "../../services/team";
import CategoryConfigModal from "./category_config_modal";
import NoPlayersForTeam from "./no_players_for_team";
import ModalFooter from "./modal_footer";
import { TeamInterface } from "../../interfaces/team";
import type { Club } from "../../interfaces/club";
import type { TeamCategoryInterface } from "../../interfaces/team_category";

interface TeamValues {
  code: string;
  club_ids: string[];
  category_id: string;
  player_ids: string[];
  specifyPositions: boolean;
  positions?: Record<string, string>;
}

type DraftTeam = {
  key: string;
  category_id: string;
  code: string;
  codeTouched: boolean;
  player_ids: string[];
  specifyPositions: boolean;
  positions: Record<string, string>;
};

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function teamLetter(index: number) {
  return LETTERS[index] ?? String(index + 1);
}

function teamBelongsToClub(team: TeamInterface, clubId: number) {
  if (team.club_ids?.includes(clubId)) return true;
  return team.club_id === clubId;
}

function defaultTeamCode(
  abbrev: string,
  categoryId: string,
  clubId: number,
  existingTeams: TeamInterface[],
  drafts: DraftTeam[],
  draftIndex: number,
) {
  if (!abbrev || !categoryId) return "";
  const existingCount = existingTeams.filter(
    (team) =>
      teamBelongsToClub(team, clubId) && String(team.category_id) === categoryId,
  ).length;
  const priorDraftCount = drafts
    .slice(0, draftIndex)
    .filter((draft) => draft.category_id === categoryId).length;
  return `${abbrev} ${teamLetter(existingCount + priorDraftCount)}`;
}

function withRefilledCodes(
  drafts: DraftTeam[],
  abbrev: string,
  clubId: number,
  existingTeams: TeamInterface[],
): DraftTeam[] {
  return drafts.map((draft, index) => {
    if (draft.codeTouched) return draft;
    return {
      ...draft,
      code: defaultTeamCode(
        abbrev,
        draft.category_id,
        clubId,
        existingTeams,
        drafts,
        index,
      ),
    };
  });
}

export default function TeamModal({
  team,
  tournament_id,
  swrTeamsResponse,
  opened,
  setOpened,
}: {
  team?: TeamInterface;
  tournament_id: number;
  swrTeamsResponse: SWRResponse;
  opened: boolean;
  setOpened: (o: boolean) => void;
}) {
  const { t } = useTranslation();
  const isEdit = Boolean(team);
  const draftKeyPrefix = useId();

  const [configOpen, setConfigOpen] = useState(false);
  const [tab, setTab] = useState<"single" | "multi">("single");
  const [multiClubId, setMultiClubId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<DraftTeam[]>([]);
  const [multiSubmitting, setMultiSubmitting] = useState(false);
  const [multiError, setMultiError] = useState<string | null>(null);

  const playersResponse = getPlayers(tournament_id, false);
  const players: Player[] = playersResponse.data?.data.players || [];
  const playersLoaded = playersResponse.data != null;
  const blockCreate = !isEdit && playersLoaded && players.length === 0;
  const swrClubs = getClubs();
  const clubs: Club[] = swrClubs.data?.data ?? [];
  const swrCats = getTeamCategories(tournament_id);
  const catList = swrCats.data?.data ?? [];
  const existingTeams: TeamInterface[] =
    swrTeamsResponse.data?.data?.teams ?? [];
  const categorySeedRef = useRef(false);
  const draftSeq = useRef(0);

  const form = useForm<TeamValues>({
    initialValues: {
      code: team?.code || "",
      club_ids:
        team?.club_ids && team.club_ids.length > 0
          ? team.club_ids.map(String)
          : team?.club_id != null
            ? [String(team.club_id)]
            : [],
      category_id:
        team?.category_id != null ? String(team.category_id) : "",
      player_ids: [],
      specifyPositions: false,
      positions: {},
    },
    validate: {
      code: (v) => (v.length > 0 ? null : t("too_short_name_validation")),
      category_id: (v) =>
        v && v.length > 0 ? null : t("category_required", "Select a category"),
    },
  });

  const defaultCategoryId = () => {
    if (catList.length === 0) return "";
    const mixed = catList.find(
      (c: TeamCategoryInterface) => c.name.toLowerCase() === "mixed",
    );
    return String(mixed?.id ?? catList[0].id);
  };

  const selectedMultiClub = clubs.find((c) => String(c.id) === multiClubId);
  const multiAbbrev = selectedMultiClub?.abbreviation?.trim() ?? "";

  const newDraft = (categoryId: string, index: number, list: DraftTeam[]): DraftTeam => {
    draftSeq.current += 1;
    return {
      key: `${draftKeyPrefix}-${draftSeq.current}`,
      category_id: categoryId,
      code: multiClubId
        ? defaultTeamCode(
            multiAbbrev,
            categoryId,
            Number(multiClubId),
            existingTeams,
            list,
            index,
          )
        : "",
      codeTouched: false,
      player_ids: [],
      specifyPositions: false,
      positions: {},
    };
  };

  useEffect(() => {
    if (!opened) {
      categorySeedRef.current = false;
      setTab("single");
      setMultiClubId(null);
      setDrafts([]);
      setMultiError(null);
      setMultiSubmitting(false);
      draftSeq.current = 0;
      return;
    }

    const clubIds =
      team?.club_ids && team.club_ids.length > 0
        ? team.club_ids.map(String)
        : team?.club_id != null
          ? [String(team.club_id)]
          : [];
    const roster = team?.players ?? [];
    const memberIds = roster
      .map((player) => String(player.id))
      .filter(Boolean);
    const positions: Record<string, string> = {};
    for (const player of roster) {
      if (!player?.id || !player.position) continue;
      const label =
        player.position.charAt(0) + player.position.slice(1).toLowerCase();
      positions[String(player.id)] = label;
    }

    form.setValues({
      code: team?.code || "",
      club_ids: clubIds,
      category_id:
        team?.category_id != null ? String(team.category_id) : "",
      player_ids: memberIds,
      specifyPositions: Object.keys(positions).length > 0,
      positions,
    });
  }, [opened, team?.id, team?.code, team?.club_id, team?.club_ids, team?.category_id, team?.players]);

  useEffect(() => {
    if (!opened) return;
    if (team?.category_id != null) {
      form.setFieldValue("category_id", String(team.category_id));
      categorySeedRef.current = true;
      return;
    }
    if (!categorySeedRef.current && catList.length > 0) {
      form.setFieldValue("category_id", String(catList[0].id));
      categorySeedRef.current = true;
    }
  }, [opened, team?.category_id, team?.id, catList]);

  const pos = ["Senpo", "Jihou", "Chuken", "Fukushou", "Taisho"];

  const playerLabel = (player: Player) =>
    player.club ? `${player.name} (${player.club})` : player.name;
  const playerById = new Map(players.map((player) => [String(player.id), player]));

  const sortedPlayers = [...players].sort(
    (a, b) =>
      a.name.localeCompare(b.name) ||
      (a.club ?? "").localeCompare(b.club ?? ""),
  );

  const playerSelectData = sortedPlayers.map((player) => ({
    value: String(player.id),
    label: playerLabel(player),
  }));

  const renderPlayerOption = ({
    option,
  }: {
    option: { value: string; label: string };
  }) => {
    const selected = playerById.get(option.value);
    if (!selected) return <Text size="sm">{option.label}</Text>;
    return (
      <Group
        justify="space-between"
        wrap="nowrap"
        gap="lg"
        style={{ width: "100%" }}
      >
        <Text size="sm" fw={500} lineClamp={1} style={{ minWidth: 0 }}>
          {selected.name}
        </Text>
        {selected.club && (
          <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
            {selected.club}
          </Text>
        )}
      </Group>
    );
  };

  const clubOptions = [...clubs]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((c) => ({
      value: String(c.id),
      label: `${c.name} (${c.abbreviation})`,
    }));

  const categoryOptions = catList.map((c: TeamCategoryInterface) => ({
    value: String(c.id),
    label: c.name,
  }));

  const playersForDraft = (draftKey: string) => {
    const taken = new Set(
      drafts
        .filter((draft) => draft.key !== draftKey)
        .flatMap((draft) => draft.player_ids),
    );
    return playerSelectData.filter(
      (option) =>
        !taken.has(option.value) ||
        drafts
          .find((draft) => draft.key === draftKey)
          ?.player_ids.includes(option.value),
    );
  };

  const handleSubmit = form.onSubmit(async (values) => {
    if (!isEdit && playersLoaded && players.length === 0) return;
    const cid = Number(values.category_id);
    if (!Number.isFinite(cid)) return;

    if (isEdit) {
      await updateTeam(
        tournament_id,
        team!.id,
        values.code,
        values.player_ids,
        values.club_ids.map(Number),
        cid,
        values.specifyPositions ? values.positions : undefined,
      );
    } else {
      await createTeam(
        tournament_id,
        values.code,
        values.player_ids,
        values.club_ids.map(Number),
        cid,
        values.specifyPositions ? values.positions : undefined,
      );
    }
    await swrTeamsResponse.mutate();
    setOpened(false);
  });

  const handleMultiClubChange = (value: string | null) => {
    setMultiClubId(value);
    setMultiError(null);
    if (!value) {
      setDrafts([]);
      return;
    }
    const club = clubs.find((c) => String(c.id) === value);
    const abbrev = club?.abbreviation?.trim() ?? "";
    const categoryId = defaultCategoryId();
    const first = newDraft(categoryId, 0, []);
    first.code = defaultTeamCode(
      abbrev,
      categoryId,
      Number(value),
      existingTeams,
      [first],
      0,
    );
    setDrafts([first]);
  };

  const updateDraft = (key: string, patch: Partial<DraftTeam>) => {
    setDrafts((current) => {
      const next = current.map((draft) =>
        draft.key === key ? { ...draft, ...patch } : draft,
      );
      if (!multiClubId || !multiAbbrev) return next;
      return withRefilledCodes(next, multiAbbrev, Number(multiClubId), existingTeams);
    });
  };

  const addDraft = () => {
    if (!multiClubId) return;
    setDrafts((current) => {
      const categoryId = defaultCategoryId();
      const next = [...current, newDraft(categoryId, current.length, current)];
      return withRefilledCodes(
        next,
        multiAbbrev,
        Number(multiClubId),
        existingTeams,
      );
    });
  };

  const removeDraft = (key: string) => {
    setDrafts((current) => {
      const next = current.filter((draft) => draft.key !== key);
      if (!multiClubId || !multiAbbrev) return next;
      return withRefilledCodes(next, multiAbbrev, Number(multiClubId), existingTeams);
    });
  };

  const handleMultiSubmit = async () => {
    if (playersLoaded && players.length === 0) return;
    if (!multiClubId) {
      setMultiError(t("club_required", "Select a club."));
      return;
    }
    if (drafts.length === 0) {
      setMultiError(t("add_at_least_one_team", "Add at least one team."));
      return;
    }
    for (const draft of drafts) {
      if (!draft.category_id) {
        setMultiError(t("category_required", "Select a category"));
        return;
      }
      if (!draft.code.trim()) {
        setMultiError(t("team_name_required", "Team name is required."));
        return;
      }
    }

    setMultiError(null);
    setMultiSubmitting(true);
    try {
      for (const draft of drafts) {
        const created = await createTeam(
          tournament_id,
          draft.code.trim(),
          draft.player_ids,
          [Number(multiClubId)],
          Number(draft.category_id),
          draft.specifyPositions ? draft.positions : undefined,
        );
        if (created == null) {
          showNotification({
            color: "red",
            title: t("error", "Error"),
            message: t("create_team_error", "Failed to create team."),
          });
          await swrTeamsResponse.mutate();
          return;
        }
      }
      await swrTeamsResponse.mutate();
      setOpened(false);
    } catch {
      setMultiError(t("create_team_error", "Failed to create team."));
    } finally {
      setMultiSubmitting(false);
    }
  };

  const singleForm = (
    <form onSubmit={handleSubmit}>
      <TextInput
        withAsterisk
        label={t("team_name_input_label", "Team ID")}
        placeholder={t("team_name_input_placeholder")}
        {...form.getInputProps("code")}
      />
      <MultiSelect
        label={t("team_clubs_label", "Clubs")}
        placeholder={t(
          "team_clubs_placeholder",
          "Select the clubs on this team",
        )}
        mt="sm"
        clearable
        searchable
        data={clubOptions}
        comboboxProps={{ withinPortal: true }}
        {...form.getInputProps("club_ids")}
      />
      <Select
        withAsterisk
        label={t("category_label", "Category")}
        data={[
          ...categoryOptions,
          {
            value: "__add__",
            label: `+ ${t("add_category", "Add category…")}`,
          },
        ]}
        value={form.values.category_id}
        onChange={(val) => {
          if (!val) return;
          if (val === "__add__") {
            setConfigOpen(true);
          } else {
            form.setFieldValue("category_id", val);
          }
        }}
        placeholder={t("select_category", "Select category")}
        searchable
        mt="sm"
      />
      <MultiSelect
        data={playerSelectData}
        renderOption={renderPlayerOption}
        label={t("team_member_select_title")}
        placeholder={t("team_member_select_placeholder", "Search players")}
        searchable
        maxDropdownHeight={280}
        comboboxProps={{ withinPortal: true }}
        mt="sm"
        {...form.getInputProps("player_ids")}
      />

      <Checkbox
        mt="md"
        label={t("specify_positions", "Specify Player Positions")}
        {...form.getInputProps("specifyPositions", { type: "checkbox" })}
      />

      {form.values.specifyPositions && (
        <Stack gap="xs" mt="xs">
          {form.values.player_ids.map((pid) => {
            const selected = playerById.get(pid);
            return (
              <Select
                key={pid}
                label={selected ? playerLabel(selected) : pid}
                placeholder={t("select_position", "Select a position")}
                data={pos.map((p) => ({ value: p, label: p }))}
                {...form.getInputProps(`positions.${pid}` as any)}
              />
            );
          })}
        </Stack>
      )}

      <ModalFooter
        onCancel={() => setOpened(false)}
        primaryLabel={t("save_button")}
        primaryType="submit"
      />
    </form>
  );

  const multiForm = (
    <Stack gap="md">
      <Alert variant="light" color="blue" icon={<IconInfoCircle size={16} />}>
        {t(
          "multi_teams_intro",
          "Create one or more teams for the same club. Team names default to the club ID plus a letter for each category (A, B, …).",
        )}
      </Alert>
      <Select
        withAsterisk
        label={t("club_header", "Club")}
        placeholder={t("club_select_placeholder", "Select club")}
        data={clubOptions}
        searchable
        value={multiClubId}
        onChange={handleMultiClubChange}
      />
      {multiClubId && (
        <Stack gap="sm">
          {drafts.map((draft, index) => (
            <Stack
              key={draft.key}
              gap="xs"
              p="sm"
              style={{
                border: "1px solid var(--mantine-color-gray-3)",
                borderRadius: "var(--mantine-radius-md)",
              }}
            >
              <Group justify="space-between" align="center">
                <Text fw={600} size="sm">
                  {t("team_number", "Team {{n}}", { n: index + 1 })}
                </Text>
                {drafts.length > 1 && (
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    aria-label={t("remove", "Remove")}
                    onClick={() => removeDraft(draft.key)}
                  >
                    <IconX size={16} />
                  </ActionIcon>
                )}
              </Group>
              <Group grow align="flex-start" gap="sm">
                <Select
                  withAsterisk
                  label={t("category_label", "Category")}
                  placeholder={t("select_category", "Select category")}
                  data={[
                    ...categoryOptions,
                    {
                      value: "__add__",
                      label: `+ ${t("add_category", "Add category…")}`,
                    },
                  ]}
                  value={draft.category_id || null}
                  onChange={(val) => {
                    if (!val) return;
                    if (val === "__add__") {
                      setConfigOpen(true);
                      return;
                    }
                    updateDraft(draft.key, {
                      category_id: val,
                      codeTouched: false,
                    });
                  }}
                  searchable
                  disabled={catList.length === 0}
                />
                <TextInput
                  withAsterisk
                  label={t("team_name_input_label", "Team ID")}
                  placeholder={
                    multiAbbrev
                      ? `${multiAbbrev} A`
                      : t("team_name_input_placeholder")
                  }
                  value={draft.code}
                  onChange={(e) =>
                    updateDraft(draft.key, {
                      code: e.currentTarget.value,
                      codeTouched: true,
                    })
                  }
                />
              </Group>
              <MultiSelect
                data={playersForDraft(draft.key)}
                renderOption={renderPlayerOption}
                label={t("team_member_select_title")}
                placeholder={t(
                  "team_member_select_placeholder",
                  "Search players",
                )}
                searchable
                clearable
                maxDropdownHeight={220}
                comboboxProps={{ withinPortal: true }}
                value={draft.player_ids}
                onChange={(ids) => {
                  const keep = new Set(ids);
                  const positions = Object.fromEntries(
                    Object.entries(draft.positions).filter(([pid]) =>
                      keep.has(pid),
                    ),
                  );
                  updateDraft(draft.key, {
                    player_ids: ids,
                    positions,
                    specifyPositions:
                      ids.length === 0 ? false : draft.specifyPositions,
                  });
                }}
              />
              <Checkbox
                label={t("specify_positions", "Specify Player Positions")}
                checked={draft.specifyPositions}
                disabled={draft.player_ids.length === 0}
                onChange={(e) =>
                  updateDraft(draft.key, {
                    specifyPositions: e.currentTarget.checked,
                    positions: e.currentTarget.checked ? draft.positions : {},
                  })
                }
              />
              {draft.specifyPositions && draft.player_ids.length > 0 && (
                <Stack gap="xs">
                  {draft.player_ids.map((pid) => {
                    const selected = playerById.get(pid);
                    return (
                      <Select
                        key={pid}
                        label={selected ? playerLabel(selected) : pid}
                        placeholder={t("select_position", "Select a position")}
                        data={pos.map((p) => ({ value: p, label: p }))}
                        value={draft.positions[pid] || null}
                        onChange={(val) => {
                          const positions = { ...draft.positions };
                          if (val) positions[pid] = val;
                          else delete positions[pid];
                          updateDraft(draft.key, { positions });
                        }}
                        clearable
                      />
                    );
                  })}
                </Stack>
              )}
            </Stack>
          ))}
          <Button
            variant="light"
            leftSection={<IconPlus size={16} />}
            onClick={addDraft}
            disabled={catList.length === 0}
          >
            {t("add_another_team", "Add another team")}
          </Button>
        </Stack>
      )}
      {multiError && (
        <Alert variant="light" color="red">
          {multiError}
        </Alert>
      )}
      <ModalFooter
        onCancel={() => setOpened(false)}
        primaryLabel={t("create_teams", "Create teams")}
        primaryLoading={multiSubmitting}
        primaryDisabled={!multiClubId || drafts.length === 0}
        onPrimary={() => void handleMultiSubmit()}
      />
    </Stack>
  );

  return (
    <>
      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        closeOnClickOutside={false}
        title={
          blockCreate
            ? t("no_players_title", "No players yet")
            : isEdit
              ? t("edit_team_title", "Edit Team")
              : t("create_team", "Create Team")
        }
        size="lg"
        centered
      >
        {!isEdit && !playersLoaded && !playersResponse.error ? (
          <Center py="md">
            <Loader size="sm" />
          </Center>
        ) : blockCreate ? (
          <NoPlayersForTeam
            tournamentId={tournament_id}
            onClose={() => setOpened(false)}
          />
        ) : isEdit ? (
          singleForm
        ) : (
          <Tabs
            value={tab}
            onChange={(value) => {
              if (value === "single" || value === "multi") setTab(value);
            }}
          >
            <Tabs.List justify="center" grow mb="xs">
              <Tabs.Tab value="single" leftSection={<IconUser size={16} />}>
                {t("single_team_title", "Single team")}
              </Tabs.Tab>
              <Tabs.Tab
                value="multi"
                leftSection={<IconUsersGroup size={16} />}
              >
                {t("multi_teams_title", "Multiple teams")}
              </Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="single" pt="xs">
              {singleForm}
            </Tabs.Panel>
            <Tabs.Panel value="multi" pt="xs">
              {multiForm}
            </Tabs.Panel>
          </Tabs>
        )}
      </Modal>
      <CategoryConfigModal
        tournament_id={tournament_id}
        opened={configOpen}
        onClose={() => setConfigOpen(false)}
        onSaved={() => {
          swrCats.mutate();
          swrTeamsResponse.mutate();
        }}
      />
    </>
  );
}
