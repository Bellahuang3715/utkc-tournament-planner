// modal for creating and updating teams
import { useEffect, useRef, useState } from "react";
import {
  Button,
  Checkbox,
  Group,
  Modal,
  MultiSelect,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useTranslation } from "next-i18next/pages";
import { SWRResponse } from "swr";

import { Player } from "../../interfaces/player";
import { getClubs, getPlayers, getTeamCategories } from "../../services/adapter";
import { createTeam, updateTeam } from "../../services/team";
import CategoryConfigModal from "./category_config_modal";
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
  // e.g. { "1": "Senpo", "2": "Chuken", ... }
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

  const [configOpen, setConfigOpen] = useState(false);

  const { data } = getPlayers(tournament_id, false);
  const players: Player[] = data?.data.players || [];
  const swrClubs = getClubs();
  const clubs: Club[] = swrClubs.data?.data ?? [];
  const swrCats = getTeamCategories(tournament_id);
  const catList = swrCats.data?.data ?? [];
  const categorySeedRef = useRef(false);

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

  useEffect(() => {
    if (!opened) return;
    const ids =
      team?.club_ids && team.club_ids.length > 0
        ? team.club_ids.map(String)
        : team?.club_id != null
          ? [String(team.club_id)]
          : [];
    form.setFieldValue("club_ids", ids);
  }, [opened, team?.id, team?.club_id, team?.club_ids]);

  useEffect(() => {
    if (!opened) {
      categorySeedRef.current = false;
      return;
    }
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

  const handleSubmit = form.onSubmit(async (values) => {
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

  return (
    <>
      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title={
          isEdit
            ? t("edit_team_title", "Edit Team")
            : t("create_team", "Create Team")
        }
        size="lg"
        centered
      >
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
            data={[...clubs]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((c) => ({ value: String(c.id), label: c.name }))}
            comboboxProps={{ withinPortal: true }}
            {...form.getInputProps("club_ids")}
          />
          <Select
            withAsterisk
            label={t("category_label", "Category")}
            data={[
              ...catList.map((c: TeamCategoryInterface) => ({
                value: String(c.id),
                label: c.name,
              })),
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
            data={[...players]
              .sort(
                (a, b) =>
                  a.name.localeCompare(b.name) ||
                  (a.club ?? "").localeCompare(b.club ?? ""),
              )
              .map((player) => ({
                value: String(player.id),
                label: playerLabel(player),
              }))}
            renderOption={({ option }) => {
              const player = playerById.get(option.value);
              if (!player) return <Text size="sm">{option.label}</Text>;
              return (
                <Group
                  justify="space-between"
                  wrap="nowrap"
                  gap="lg"
                  style={{ width: "100%" }}
                >
                  <Text size="sm" fw={500} lineClamp={1} style={{ minWidth: 0 }}>
                    {player.name}
                  </Text>
                  {player.club && (
                    <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
                      {player.club}
                    </Text>
                  )}
                </Group>
              );
            }}
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

          <Button fullWidth mt="xl" color="green" type="submit">
            {t("save_button")}
          </Button>
        </form>
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
