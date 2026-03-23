import React, { useMemo, useState } from "react";
import {
  Modal,
  Tabs,
  Button,
  Stack,
  TextInput,
  NumberInput,
  Select,
  Checkbox,
  Group,
  Text,
  ScrollArea,
  MultiSelect,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useTranslation } from "next-i18next";
import { getClubs, getPlayerFields } from "../../services/adapter";
import { createPlayer } from "../../services/player";
import { updatePlayerCodes } from "../../services/player";
import { addPlayersToDivision } from "../../services/division";
import type { Player } from "../../interfaces/player";
import type { DivisionPlayer } from "../../interfaces/division";
import type { FieldInsertable, PlayerFieldTypes } from "../../interfaces/player_fields";
import type { Club } from "../../interfaces/club";

/** Infer division code prefix from name (e.g. "Division E" -> "E") when prefix is empty. */
function effectivePrefix(divisionName: string, divisionPrefix: string | null | undefined): string {
  const p = (divisionPrefix ?? "").trim();
  if (p) return p;
  const match = divisionName.match(/Division\s+([A-Za-z])/i);
  return match ? match[1].toUpperCase() : "";
}

/** Get the numeric part of a division code (e.g. "E37" -> 37). */
function codeNumber(code: string | null | undefined): number | null {
  if (!code || typeof code !== "string") return null;
  const m = code.match(/(\d+)$/);
  return m ? parseInt(m[1], 10) : null;
}

/** Next code(s) for this division: continue from current max (e.g. E37 -> E38, E39, ...). */
function nextDivisionCodes(
  divisionName: string,
  divisionPrefix: string | null | undefined,
  currentDivisionPlayers: { code?: string | null }[],
  count: number
): string[] {
  const prefix = effectivePrefix(divisionName, divisionPrefix);
  if (!prefix) return [];
  let maxNum = 0;
  for (const p of currentDivisionPlayers) {
    const n = codeNumber(p.code);
    if (n != null && maxNum < n) maxNum = n;
  }
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const num = maxNum + 1 + i;
    out.push(prefix + String(num).padStart(2, "0"));
  }
  return out;
}

interface AddPlayersToDivisionModalProps {
  opened: boolean;
  onClose: () => void;
  tournamentId: number;
  divisionId: number;
  divisionName: string;
  divisionPrefix?: string | null;
  divisionPlayers: Player[];
  availableToAdd: Player[];
  allPlayers: Player[];
  playerMetaById: Map<number, Player>;
  onChangeRosterAndBrackets: (
    nextPlayerIds: number[],
    extraMeta?: Map<
      number,
      { id: number; name: string; club: string | null; club_id: number; code: string | null }
    >
  ) => Promise<boolean>;
  onSuccess: () => void;
}

export default function AddPlayersToDivisionModal({
  opened,
  onClose,
  tournamentId,
  divisionId,
  divisionName,
  divisionPrefix,
  divisionPlayers,
  availableToAdd,
  allPlayers,
  playerMetaById,
  onChangeRosterAndBrackets,
  onSuccess,
}: AddPlayersToDivisionModalProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<string | null>("existing");
  const [adding, setAdding] = useState(false);

  const swrPlayerFieldsResponse = getPlayerFields(tournamentId);
  const playerFields: FieldInsertable[] = swrPlayerFieldsResponse.data?.fields ?? [];
  const swrClubs = getClubs();
  const clubs: Club[] = swrClubs.data?.data ?? [];

  const initialNewPlayer: Record<string, any> = useMemo(() => {
    const init: Record<string, any> = { name: "", club_id: "" };
    playerFields
      .filter((f) => f.include)
      .forEach((f) => {
        init[f.key] = f.type === "CHECKBOX" ? false : f.type === "NUMBER" ? 0 : "";
      });
    return init;
  }, [playerFields]);

  const form = useForm({
    initialValues: initialNewPlayer,
    validate: {
      name: (v) => (v && String(v).trim().length > 0 ? null : t("too_short_name_validation", "Name is required")),
      club_id: (v) =>
        v != null && String(v).trim().length > 0
          ? null
          : t("too_short_club_validation", "Club is required"),
    },
  });

  const [selectedExistingIds, setSelectedExistingIds] = useState<string[]>([]);
  const existingOptions = useMemo(
    () =>
      availableToAdd.map((p) => ({
        value: String(p.id),
        label: `${p.name ?? ""} (${p.club ?? "-"})`,
      })),
    [availableToAdd]
  );

  const handleAddExisting = async () => {
    const ids = selectedExistingIds.map((x) => Number(x)).filter(Number.isFinite);
    if (ids.length === 0) {
      return;
    }
    setAdding(true);
    try {
      const codes = nextDivisionCodes(divisionName, divisionPrefix, divisionPlayers, ids.length);
      if (codes.length !== ids.length) {
        window.alert(t("add_players_code_error", "Could not generate codes for this division."));
        return;
      }
      await updatePlayerCodes(
        tournamentId,
        ids.map((id, i) => ({ player_id: id, code: codes[i] }))
      );
      const nextIds = [...divisionPlayers.map((p) => p.id), ...ids];
      const applied = await onChangeRosterAndBrackets(nextIds);
      if (!applied) return;
      await addPlayersToDivision(divisionId, ids);
      onSuccess();
      onClose();
      setSelectedExistingIds([]);
    } finally {
      setAdding(false);
    }
  };

  const handleAddNew = form.onSubmit(async (values) => {
    setAdding(true);
    try {
      const data: Record<string, any> = {};
      playerFields.filter((f) => f.include).forEach((f) => {
        const v = values[f.key];
        if (v !== undefined && v !== "" && v !== null) data[f.key] = v;
      });
      const clubIdNum = Number(values.club_id);
      const body = {
        name: String(values.name).trim(),
        club_id: clubIdNum,
        data,
      };
      const res = await createPlayer(tournamentId, body);
      const newId = res?.data?.id;
      if (newId == null) {
        window.alert(t("add_players_create_failed", "Failed to create player."));
        return;
      }
      const codes = nextDivisionCodes(divisionName, divisionPrefix, divisionPlayers, 1);
      if (codes.length === 0) {
        window.alert(t("add_players_code_error", "Could not generate codes for this division."));
        return;
      }
      const code = codes[0];
      await updatePlayerCodes(tournamentId, [{ player_id: newId, code }]);
      const nextIds = [...divisionPlayers.map((p) => p.id), newId];
      const clubLabel = clubs.find((c) => c.id === clubIdNum)?.name ?? null;
      const extraMeta = new Map<
        number,
        { id: number; name: string; club: string | null; club_id: number; code: string | null }
      >();
      extraMeta.set(newId, { id: newId, name: body.name, club: clubLabel, club_id: clubIdNum, code });
      const applied = await onChangeRosterAndBrackets(nextIds, extraMeta);
      if (!applied) return;
      await addPlayersToDivision(divisionId, [newId]);
      onSuccess();
      form.reset();
      onClose();
    } finally {
      setAdding(false);
    }
  });

  const canAddExisting = selectedExistingIds.length > 0 && !adding;
  const prefix = effectivePrefix(divisionName, divisionPrefix);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t("add_players_to_division", "Add players to division")}
      size="md"
    >
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="existing">
            {t("add_players_from_tournament", "From tournament")} ({availableToAdd.length})
          </Tabs.Tab>
          <Tabs.Tab value="new">{t("add_players_new", "New player")}</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="existing" pt="md">
          <Stack gap="md">
            {availableToAdd.length === 0 ? (
              <Text size="sm" c="dimmed">
                {t("no_available_players_to_add", "There are no additional players to add to this division.")}
              </Text>
            ) : (
              <>
                <MultiSelect
                  label={t("select_players", "Select players")}
                  placeholder={t("search_players", "Search or select…")}
                  data={existingOptions}
                  value={selectedExistingIds}
                  onChange={setSelectedExistingIds}
                  searchable
                  clearable
                />
                <Button onClick={handleAddExisting} disabled={!canAddExisting} loading={adding}>
                  {t("add_selected", "Add selected")}
                </Button>
              </>
            )}
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="new" pt="md">
          {!prefix ? (
            <Text size="sm" c="dimmed">
              {t("add_players_no_prefix", "Set a division prefix (e.g. E, F) in division details to auto-assign codes.")}
            </Text>
          ) : null}
          <form onSubmit={handleAddNew}>
            <Stack gap="sm">
              <TextInput
                withAsterisk
                label={t("name_header", "Name")}
                {...form.getInputProps("name")}
              />
              <Select
                withAsterisk
                label={t("club_header", "Club")}
                placeholder={t("club_select_placeholder", "Select club")}
                data={clubs.map((c) => ({ value: String(c.id), label: c.name }))}
                searchable
                {...form.getInputProps("club_id")}
              />
              {playerFields
                .filter((f) => f.include)
                .map((f) => {
                  const key = f.key;
                  const label = f.label;
                  switch (f.type as PlayerFieldTypes) {
                    case "TEXT":
                      return (
                        <TextInput key={key} label={label} {...form.getInputProps(key)} />
                      );
                    case "NUMBER":
                      return (
                        <NumberInput key={key} label={label} hideControls {...form.getInputProps(key)} />
                      );
                    case "CHECKBOX":
                      return (
                        <Checkbox key={key} label={label} {...form.getInputProps(key, { type: "checkbox" })} />
                      );
                    case "DROPDOWN":
                      return (
                        <Select
                          key={key}
                          label={label}
                          data={(f.options ?? []).map((o) => ({ value: o, label: o }))}
                          searchable
                          {...form.getInputProps(key)}
                        />
                      );
                    default:
                      return null;
                  }
                })}
              <Button type="submit" loading={adding}>
                {t("create_and_add", "Create and add to division")}
              </Button>
            </Stack>
          </form>
        </Tabs.Panel>
      </Tabs>
    </Modal>
  );
}
