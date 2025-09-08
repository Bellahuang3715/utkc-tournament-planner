import React, { useState, useEffect } from "react";
import {
  Modal,
  Button,
  Checkbox,
  Tabs,
  TextInput,
  NumberInput,
  Select,
  Stack,
  Group,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconUser, IconUsers } from "@tabler/icons-react";
import { useTranslation } from "next-i18next";
import { SWRResponse } from "swr";
import ExcelJS from "exceljs";

import { createPlayer } from "../../services/player";
// import { updatePlayerFields } from '../../services/player_fields';
import { getPlayerFields } from "../../services/adapter";
import {
  FieldInsertable,
  PlayerFieldTypes,
} from "../../interfaces/player_fields";
import PlayersImportModal, { PlayersUpload } from "./players_import_modal";
import { inferFieldsFromSheet } from "../utils/excel";
import { Player } from "../../interfaces/player";

function SinglePlayerTab({
  tournament_id,
  swrPlayersResponse,
  setOpened,
  player,
}: {
  tournament_id: number;
  swrPlayersResponse: SWRResponse;
  setOpened: (open: boolean) => void;
  player?: Player | null;
}) {
  const { t } = useTranslation();
  const isEdit = Boolean(player);

  console.log("player: ", player);

  const swrPlayerFieldsResponse = getPlayerFields(tournament_id);
  const playerFields: FieldInsertable[] =
    swrPlayerFieldsResponse.data?.fields ?? [];

  // build initial values, pulling from player.data when editing
  const initial: Record<string, any> = {
    name: player?.name ?? "",
    club: player?.club ?? "",
  };
  playerFields
    .filter((f) => f.include)
    .forEach((f) => {
      const existing = player?.data[f.key];
      if (existing !== undefined) {
        initial[f.key] = existing;
      } else {
        initial[f.key] =
          f.type === "CHECKBOX" ? false : f.type === "NUMBER" ? 0 : "";
      }
    });

  const form = useForm({
    initialValues: initial,
    validate: {
      name: (v) => (v.length > 0 ? null : t("too_short_name_validation")),
      club: (v) => (v.length > 0 ? null : t("too_short_club_validation")),
    },
  });

  // whenever player changes (or first mount), reset or set values
  useEffect(() => {
    if (player) {
      form.setValues(initial);
    } else {
      form.reset();
    }
  }, [player]);

  const onSubmit = form.onSubmit(async (values) => {
    if (isEdit && player) {
      // await updatePlayer(tournament_id, player.id, { data: values });
    } else {
      // await createPlayer(tournament_id, { data: values });
    }
    await swrPlayersResponse.mutate();
    setOpened(false);
  });

  return (
    <form onSubmit={onSubmit}>
      <Stack gap="sm">
        <TextInput
          withAsterisk
          label={t("name_input_label", "Name")}
          placeholder={t("player_name_input_placeholder")}
          {...form.getInputProps("name")}
        />
        <TextInput
          withAsterisk
          label={t("club_label", "Club")}
          placeholder={t("club_name_input_placeholder")}
          {...form.getInputProps("club")}
        />

        {/* dynamic fields */}
        {playerFields
          .filter((f) => f.include)
          .map((f) => {
            const key = f.key;
            const label = f.label;
            switch (f.type as PlayerFieldTypes) {
              case "TEXT":
                return (
                  <TextInput
                    key={key}
                    label={label}
                    placeholder={label}
                    {...form.getInputProps(key)}
                  />
                );
              case "NUMBER":
                return (
                  <NumberInput
                    key={key}
                    label={label}
                    placeholder={label}
                    hideControls
                    {...form.getInputProps(key)}
                  />
                );
              case "CHECKBOX":
                return (
                  <Checkbox
                    key={key}
                    label={label}
                    {...form.getInputProps(key, { type: "checkbox" })}
                  />
                );
              case "DROPDOWN":
                return (
                  <Select
                    key={key}
                    label={label}
                    data={f.options.map((o) => ({ value: o, label: o }))}
                    searchable
                    // nothingFound="―"
                    {...form.getInputProps(key)}
                  />
                );
              default:
                return null;
            }
          })}

        <Button fullWidth mt="md" color="green" type="submit">
          {isEdit ? t("save_button", "Save") : t("create_button", "Create")}
        </Button>
      </Stack>
    </form>
  );
}

export default function PlayerCreateModal({
  tournament_id,
  swrPlayersResponse,
  opened,
  setOpened,
}: {
  tournament_id: number;
  swrPlayersResponse: SWRResponse;
  opened: boolean;
  setOpened: (open: boolean) => void;
}) {
  const { t } = useTranslation();

  // import all club sheets
  const handleImportAll = async (uploads: PlayersUpload[]) => {
    if (uploads.length === 0) return;
    console.log("uploads", uploads);

    // infer schema once
    const { file, sheet, headerRow, dataRow } = uploads[0];
    const { fields, headerMap, nameCols } = await inferFieldsFromSheet(
      file,
      sheet,
      headerRow
    );
    console.log("fields", fields);
    // push schema to players_field
    // await updatePlayerFields(tournamentData.id, fields);

    // now import every upload
    for (const { file, clubName, sheet } of uploads) {
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(await file.arrayBuffer());
      const ws = wb.getWorksheet(sheet);
      if (!ws) continue;

      // for each row starting at dataRow, build a player
      // stop when we hit an empty row (no name)
      for (let r = dataRow; r <= ws.rowCount; r++) {
        const row = ws.getRow(r);

        // helper to read a cell’s displayed text (handles formulas)
        const cellText = (c: ExcelJS.Cell) => {
          const v = c.value as any;
          const raw =
            v && typeof v === "object" && "result" in v ? v.result : v;
          return String(raw ?? "").trim();
        };

        // build a raw map header→value, pulling out .result if it's a formula
        const rowData: Record<string, any> = {};
        headerMap.forEach(({ col, header }) => {
          // normalize the header into a lowercase_snake_case key:
          const key = header.toLowerCase().replace(/\s+/g, "_");
          const txt = cellText(row.getCell(col));
          rowData[key] = txt === "" ? null : txt;
        });

        // console.log("rowData", rowData);

        // derive player display name (prefer single Name; else First + Last)
        let nameValue = "";
        if (nameCols.name) {
          nameValue = cellText(row.getCell(nameCols.name));
        } else {
          const first = nameCols.first
            ? cellText(row.getCell(nameCols.first))
            : "";
          const last = nameCols.last
            ? cellText(row.getCell(nameCols.last))
            : "";
          nameValue = [first, last].filter(Boolean).join(" ").trim();
        }
        if (!nameValue) {
          break; // break at the first empty row
        }

        const body = {
          name: nameValue,
          club: clubName,
          data: rowData,
        };

        console.log("posting player:", body);
        await createPlayer(tournament_id, body);
      }
    }

    // refresh table
    await swrPlayersResponse.mutate();
    setOpened(false);
  };

  return (
    <>
      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title={t("create_player_modal_title")}
        size="lg"
        centered
      >
        <Tabs defaultValue="single">
          <Tabs.List justify="center" grow mb="xs">
            <Tabs.Tab value="single" leftSection={<IconUser size={16} />}>
              {t("single_player_title")}
            </Tabs.Tab>
            <Tabs.Tab value="multi" leftSection={<IconUsers size={16} />}>
              {t("club_players_title")}
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="single" pt="xs">
            <SinglePlayerTab
              swrPlayersResponse={swrPlayersResponse}
              tournament_id={tournament_id}
              setOpened={setOpened}
            />
          </Tabs.Panel>
          <Tabs.Panel value="multi" pt="xs">
            <Group gap="sm">
              <PlayersImportModal onImportAll={handleImportAll} />
            </Group>
          </Tabs.Panel>
        </Tabs>
      </Modal>
    </>
  );
}

export function PlayerEditModal({
  tournament_id,
  swrPlayersResponse,
  opened,
  setOpened,
  player,
}: {
  tournament_id: number;
  swrPlayersResponse: SWRResponse;
  opened: boolean;
  setOpened: (open: boolean) => void;
  player: Player | null;
}) {
  const { t } = useTranslation();

  return (
    <>
      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title={t("create_player_modal_title")}
        size="lg"
        centered
      >
        <SinglePlayerTab
          swrPlayersResponse={swrPlayersResponse}
          tournament_id={tournament_id}
          setOpened={setOpened}
          player={player}
        />
      </Modal>
    </>
  );
}
