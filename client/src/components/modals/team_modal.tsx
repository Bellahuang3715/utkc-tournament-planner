// modal for creating and updating teams
import { useEffect, useRef, useState } from "react";
import {
  Button,
  Checkbox,
  Modal,
  MultiSelect,
  Select,
  TextInput,
  Stack,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useTranslation } from "next-i18next";
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
  club_id: string;
  category_id: string;
  active: boolean;
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
      club_id: team?.club_id != null ? String(team.club_id) : "",
      category_id:
        team?.category_id != null ? String(team.category_id) : "",
      active: true,
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

  const handleSubmit = form.onSubmit(async (values) => {
    const cid = Number(values.category_id);
    if (!Number.isFinite(cid)) return;

    if (isEdit) {
      await updateTeam(
        tournament_id,
        team!.id,
        values.code,
        values.active,
        values.player_ids,
        values.club_id ? Number(values.club_id) : null,
        cid,
        values.specifyPositions ? values.positions : undefined,
      );
    } else {
      await createTeam(
        tournament_id,
        values.code,
        values.active,
        values.player_ids,
        values.club_id ? Number(values.club_id) : null,
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
          <Checkbox
            mt="sm"
            label={t("active_team_checkbox_label")}
            {...form.getInputProps("active", { type: "checkbox" })}
          />
          <Select
            label={t("club_label", "Club")}
            placeholder={t("club_select_placeholder", "Select club")}
            mt="sm"
            clearable
            data={clubs.map((c) => ({ value: String(c.id), label: c.name }))}
            searchable
            {...form.getInputProps("club_id")}
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
            data={players.map((p) => ({ value: `${p.id}`, label: "temp" }))}
            label={t("team_member_select_title")}
            searchable
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
              {form.values.player_ids.map((pid) => (
                <Select
                  key={pid}
                  label="temp"
                  placeholder={t("select_position")}
                  data={pos.map((p) => ({ value: p, label: p }))}
                  {...form.getInputProps(`positions.${pid}` as any)}
                />
              ))}
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
