// modal for creating and updating teams
import { useState } from "react";
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
import { getPlayers } from "../../services/adapter";
import { createTeam, updateTeam } from "../../services/team";
import CategoryConfigModal, { Category } from "./category_config_modal";
import { TeamInterface } from "../../interfaces/team";

interface TeamValues {
  name: string;
  club: string;
  category: string;
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

  // 1) your normal categories
  const [categories, setCategories] = useState(
    team
      ? [{ value: team.category, label: team.category }]
      : [
          { value: "Mixed", label: t("mixed", "Mixed") },
          { value: "Womens", label: t("womens", "Womens") },
        ]
  );

  // 2) control whether the TeamConfigModal is up
  const [configOpen, setConfigOpen] = useState(false);

  const { data } = getPlayers(tournament_id, false);
  const players: Player[] = data?.data.players || [];

  // 3) hook up your form
  const form = useForm<TeamValues>({
    initialValues: {
      name: team?.name || "",
      club: team?.club || "",
      category: team?.category || categories[0].value,
      active: true,
      player_ids: [],
      specifyPositions: false,
      positions: {},
    },
    validate: {
      name: (v) => (v.length > 0 ? null : t("too_short_name_validation")),
      club: (v) => (v.length > 0 ? null : t("too_short_club_validation")),
    },
  });

  // helper arrays
  const pos = ["Senpo", "Jihou", "Chuken", "Fukushou", "Taisho"];

  const handleSubmit = form.onSubmit(async (values) => {
    // if (isEdit) {
    //   await updateTeam(
    //     tournament_id,
    //     team!.id,
    //     values.name,
    //     values.active,
    //     values.player_ids,
    //     values.club,
    //     values.category,
    //     values.specifyPositions ? values.positions : undefined
    //   );
    // } else {
    //   await createTeam(
    //     tournament_id,
    //     values.name,
    //     values.active,
    //     values.player_ids,
    //     values.club,
    //     values.category,
    //     values.specifyPositions ? values.positions : undefined
    //   );
    // }
    // await swrTeamsResponse.mutate();
    setOpened(false);
  });

  return (
    <>
      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title={t("create_team", "Create Team")}
        size="lg"
        centered
      >
        <form onSubmit={handleSubmit}>
          <TextInput
            withAsterisk
            label={t("team_name_input_label", "Team ID")}
            placeholder={t("team_name_input_placeholder")}
            {...form.getInputProps("name")}
          />
          <Checkbox
            mt="sm"
            label={t("active_team_checkbox_label")}
            {...form.getInputProps("active", { type: "checkbox" })}
          />
          <TextInput
            label={t("club_label", "Club")}
            placeholder={t("club_name_input_placeholder")}
            mt="sm"
            {...form.getInputProps("club")}
          />
          <Select
            withAsterisk
            label={t("category_label", "Category")}
            data={[
              ...categories,
              {
                value: "__add__",
                label: `+ ${t("add_category", "Add category…")}`,
              },
            ]}
            value={form.values.category}
            onChange={(val) => {
              if (!val) return;
              if (val === "__add__") {
                // instead of setting form, open the modal
                setConfigOpen(true);
              } else {
                form.setFieldValue("category", val);
              }
            }}
            // make sure the placeholder still works
            placeholder={t("select_category", "Select category")}
            searchable
            mt="sm"
          />
          <MultiSelect
            // data={players.map(p => ({ value: `${p.id}`, label: p.name }))}
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
              {form.values.player_ids.map((pid, idx) => (
                <Select
                  key={pid}
                  // label={`${players.find(p => p.id.toString() === pid)?.name || ''}`}
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
        onSave={(updated: Category[]) => {
          const newList = updated.map((c) => ({
            value: c.id,
            label: c.name,
          }));
          setCategories(newList);

          // select the last one you added
          if (newList.length) {
            form.setFieldValue("category", newList[newList.length - 1].value);
          }

          setConfigOpen(false);
        }}
      />
    </>
  );
}
