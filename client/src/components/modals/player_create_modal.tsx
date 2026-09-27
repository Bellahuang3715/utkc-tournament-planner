import React, { useState, useEffect, useRef } from "react";
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
  Text,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { showNotification } from "@mantine/notifications";
import { IconUser, IconUsers } from "@tabler/icons-react";
import { useTranslation } from "next-i18next/pages";
import { SWRResponse } from "swr";
import ExcelJS from "exceljs";

import { createPlayer } from "../../services/player";
import { updatePlayerFields } from "../../services/player_fields";
import { getClubs, getPlayerFields } from "../../services/adapter";
import {
  FieldInsertable,
  PlayerFieldTypes,
} from "../../interfaces/player_fields";
import PlayersImportModal, { PlayersUpload } from "./players_import_modal";
import PlayerDuplicateModal from "./player_duplicate_modal";
import { inferFieldsFromSheet } from "../utils/excel";
import {
  DuplicateGroup,
  PlayerSnapshot,
  findDuplicateGroups,
  playersToInsert,
} from "../utils/player_duplicates";
import { Player } from "../../interfaces/player";
import type { Club } from "../../interfaces/club";
import { resolveClubIdByName } from "../../utils/clubs";

function savedSnapshots(players: Player[]): PlayerSnapshot[] {
  return players.map((player) => ({
    id: `saved:${player.id}`,
    name: player.name,
    clubId: player.club_id,
    clubName: player.club ?? "",
    data: player.data ?? {},
    source: player.code
      ? `Already in this tournament · ${player.code}`
      : "Already in this tournament",
    saved: true,
    code: player.code,
  }));
}

function SinglePlayerTab({
  tournament_id,
  swrPlayersResponse,
  setOpened,
  player,
  confirmDuplicates,
}: {
  tournament_id: number;
  swrPlayersResponse: SWRResponse;
  setOpened: (open: boolean) => void;
  player?: Player | null;
  confirmDuplicates?: (
    groups: DuplicateGroup[],
    fields: FieldInsertable[],
    context: "import" | "single",
  ) => Promise<string[] | null>;
}) {
  const { t } = useTranslation();
  const isEdit = Boolean(player);

  const swrPlayerFieldsResponse = getPlayerFields(tournament_id);
  const playerFields: FieldInsertable[] =
    swrPlayerFieldsResponse.data?.fields ?? [];

  // build initial values, pulling from player.data when editing
  const swrClubs = getClubs();
  const clubs: Club[] = swrClubs.data?.data ?? [];

  const initial: Record<string, any> = {
    name: player?.name ?? "",
    club_id: player?.club_id != null ? String(player.club_id) : "",
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
      club_id: (v) =>
        v != null && String(v).trim().length > 0 ? null : t("too_short_club_validation"),
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
      await swrPlayersResponse.mutate();
      setOpened(false);
      return;
    }

    const data: Record<string, any> = {};
    playerFields
      .filter((f) => f.include)
      .forEach((f) => {
        data[f.key] = values[f.key];
      });
    const clubName =
      clubs.find((club) => String(club.id) === String(values.club_id))?.name ??
      "";
    const pending: PlayerSnapshot = {
      id: "new",
      name: values.name.trim(),
      clubId: Number(values.club_id),
      clubName,
      data,
      source: "The player you are adding",
      saved: false,
    };
    const existing: Player[] = swrPlayersResponse.data?.data?.players ?? [];
    const groups = findDuplicateGroups([pending], savedSnapshots(existing));
    if (groups.length > 0 && confirmDuplicates) {
      const kept = await confirmDuplicates(groups, playerFields, "single");
      if (kept == null || !kept.includes("new")) return;
    }
    const result = await createPlayer(tournament_id, {
      name: pending.name,
      club_id: pending.clubId,
      data,
    });
    if (result == null) return;
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
        <Select
          withAsterisk
          label={t("club_label", "Club")}
          placeholder={t("club_name_input_placeholder")}
          data={clubs.map((c) => ({ value: String(c.id), label: c.name }))}
          searchable
          {...form.getInputProps("club_id")}
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
  swrPlayerFieldsResponse,
  opened,
  setOpened,
  initialTab = "single",
  allowSingle = true,
}: {
  tournament_id: number;
  swrPlayersResponse: SWRResponse;
  swrPlayerFieldsResponse?: SWRResponse;
  opened: boolean;
  setOpened: (open: boolean) => void;
  initialTab?: "single" | "multi";
  allowSingle?: boolean;
}) {
  const { t } = useTranslation();
  const swrClubsForImport = getClubs();
  const [tab, setTab] = useState<"single" | "multi">(initialTab);
  const [importDirty, setImportDirty] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [review, setReview] = useState<{
    groups: DuplicateGroup[];
    fields: FieldInsertable[];
    context: "import" | "single";
  } | null>(null);
  const reviewResolve = useRef<((ids: string[] | null) => void) | null>(null);
  const importing = !allowSingle || tab === "multi";

  const confirmDuplicates = (
    groups: DuplicateGroup[],
    fields: FieldInsertable[],
    context: "import" | "single",
  ) =>
    new Promise<string[] | null>((resolve) => {
      reviewResolve.current = resolve;
      setReview({ groups, fields, context });
    });

  const finishReview = (ids: string[] | null) => {
    reviewResolve.current?.(ids);
    reviewResolve.current = null;
    setReview(null);
  };

  useEffect(() => {
    if (opened) setTab(allowSingle ? initialTab : "multi");
  }, [opened, initialTab, allowSingle]);

  useEffect(() => {
    if (!opened) {
      setImportDirty(false);
      setConfirmLeave(false);
      reviewResolve.current?.(null);
      reviewResolve.current = null;
      setReview(null);
    }
  }, [opened]);

  const requestClose = () => {
    if (importing && importDirty) {
      setConfirmLeave(true);
      return;
    }
    setOpened(false);
  };

  const leaveImport = () => {
    setConfirmLeave(false);
    setOpened(false);
  };

  // import all club sheets
  const handleImportAll = async (uploads: PlayersUpload[]) => {
    if (uploads.length === 0) return false;
    const clubs: Club[] = swrClubsForImport.data?.data ?? [];
    console.log("uploads", uploads);

    const normLabel = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    const existingFields: FieldInsertable[] =
      swrPlayerFieldsResponse?.data?.fields ?? [];
    // The first spreadsheet defines columns only when none exist yet.
    // Later files must match those columns and must not replace them.
    const existingPlayers =
      swrPlayersResponse.data?.data?.players ?? [];
    let schemaFields = existingFields;
    let fieldsToSave: FieldInsertable[] | null = null;
    if (existingFields.length === 0) {
      if (existingPlayers.length > 0) {
        showNotification({
          color: "red",
          title: t("error", "Error"),
          message: t(
            "players_fields_locked",
            "Set the player fields before importing. A spreadsheet can’t choose new columns once players are already in the tournament.",
          ),
        });
        return false;
      }
      const first = uploads[0];
      const inferred = await inferFieldsFromSheet(
        first.file,
        first.sheet,
        first.headerRow,
      );
      schemaFields = inferred.fields;
      fieldsToSave = inferred.fields;
    }
    const keyByLabel = new Map(
      schemaFields.map((f) => [normLabel(f.label), f.key]),
    );

    const pending: PlayerSnapshot[] = [];
    // now import every upload
    for (const upload of uploads) {
      const { headerMap, nameCols } = await inferFieldsFromSheet(
        upload.file,
        upload.sheet,
        upload.headerRow,
      );
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(await upload.file.arrayBuffer());
      const ws = wb.getWorksheet(upload.sheet);
      if (!ws) continue;

      // for each row starting at dataRow, build a player
      // stop when we hit an empty row (no name)
      for (let r = upload.dataRow; r <= ws.rowCount; r++) {
        const row = ws.getRow(r);

        // helper to read a cell’s displayed text (handles formulas)
        const cellText = (c: ExcelJS.Cell) => {
          const v = c.value as any;
          const raw =
            v && typeof v === "object" && "result" in v ? v.result : v;
          return String(raw ?? "").trim();
        };

        const rowData: Record<string, any> = {};
        headerMap.forEach(({ col, header }) => {
          const key = keyByLabel.get(normLabel(header));
          if (!key) return;
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

        pending.push({
          id: `${pending.length}`,
          name: nameValue,
          clubId: resolveClubIdByName(clubs, upload.clubName, 2),
          clubName: upload.clubName,
          data: rowData,
          source: `${upload.file.name} · row ${r}`,
          saved: false,
        });
      }
    }

    const groups = findDuplicateGroups(pending, savedSnapshots(existingPlayers));
    let toInsert = pending;
    if (groups.length > 0) {
      const kept = await confirmDuplicates(groups, schemaFields, "import");
      if (kept == null) return false;
      toInsert = playersToInsert(pending, groups, kept);
    }

    if (fieldsToSave) {
      const saved = await updatePlayerFields(tournament_id, fieldsToSave);
      if (saved == null) return false;
      if (swrPlayerFieldsResponse) await swrPlayerFieldsResponse.mutate();
    }

    for (const player of toInsert) {
      const created = await createPlayer(tournament_id, {
        name: player.name,
        club_id: player.clubId,
        data: player.data,
      });
      if (created == null) {
        await swrPlayersResponse.mutate();
        return false;
      }
    }

    // refresh table
    await swrPlayersResponse.mutate();
    setOpened(false);
    return true;
  };

  return (
    <>
      <Modal
        opened={opened}
        onClose={requestClose}
        closeOnClickOutside={!importing}
        title={
          allowSingle
            ? t("create_player_modal_title")
            : t("import_players_title", "Import players")
        }
        size="lg"
        centered
      >
        {allowSingle ? (
          <Tabs
            value={tab}
            onChange={(value) => {
              if (value === "single" || value === "multi") setTab(value);
            }}
          >
            <Tabs.List justify="center" grow mb="xs">
              <Tabs.Tab value="single" leftSection={<IconUser size={16} />}>
                {t("single_player_title")}
              </Tabs.Tab>
              <Tabs.Tab value="multi" leftSection={<IconUsers size={16} />}>
                {t("club_header")}
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="single" pt="xs">
              <SinglePlayerTab
                swrPlayersResponse={swrPlayersResponse}
                tournament_id={tournament_id}
                setOpened={setOpened}
                confirmDuplicates={confirmDuplicates}
              />
            </Tabs.Panel>
            <Tabs.Panel value="multi" pt="xs">
              <Group gap="sm">
                <PlayersImportModal
                  onImportAll={handleImportAll}
                  onDirtyChange={setImportDirty}
                />
              </Group>
            </Tabs.Panel>
          </Tabs>
        ) : (
          <PlayersImportModal
            onImportAll={handleImportAll}
            onDirtyChange={setImportDirty}
          />
        )}
      </Modal>
      <PlayerDuplicateModal
        groups={review?.groups ?? null}
        fields={review?.fields ?? []}
        context={review?.context ?? "import"}
        onCancel={() => finishReview(null)}
        onConfirm={(keptIds) => finishReview(keptIds)}
      />
      <Modal
        opened={confirmLeave}
        onClose={() => setConfirmLeave(false)}
        title={t("leave_import_title", "Leave this import?")}
        centered
        size="sm"
      >
        <Stack gap="lg">
          <Text size="sm" lh={1.6}>
            {t(
              "leave_import_message",
              "Are you sure you want to leave? You will lose your progress.",
            )}
          </Text>
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={() => setConfirmLeave(false)}>
              {t("stay_button", "Stay")}
            </Button>
            <Button color="red" onClick={leaveImport}>
              {t("leave_button", "Leave")}
            </Button>
          </Group>
        </Stack>
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
