import React, { useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Stack,
  MultiSelect,
} from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { useTranslation } from "next-i18next/pages";
import { updatePlayerCodes } from "../../services/player";
import { addPlayersToDivision } from "../../services/division";
import type { Player } from "../../interfaces/player";
import ModalFooter from "./modal_footer";

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
  onChangeRosterAndBrackets: (nextPlayerIds: number[]) => Promise<boolean>;
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
  onChangeRosterAndBrackets,
  onSuccess,
}: AddPlayersToDivisionModalProps) {
  const { t } = useTranslation();
  const [adding, setAdding] = useState(false);
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

  const canAddExisting = selectedExistingIds.length > 0 && !adding;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      closeOnClickOutside={false}
      centered
      title={t("add_players_to_division", "Add players to division")}
      size="md"
    >
      <Stack gap="md">
        {availableToAdd.length === 0 ? (
          <Alert
            variant="light"
            color="gray"
            icon={<IconInfoCircle size={16} />}
          >
            {t(
              "no_available_players_to_add",
              "There are no additional players to add to this division.",
            )}
          </Alert>
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
            <ModalFooter
              onCancel={onClose}
              primaryLabel={t("add_selected", "Add selected")}
              primaryDisabled={!canAddExisting}
              primaryLoading={adding}
              onPrimary={() => void handleAddExisting()}
            />
          </>
        )}
      </Stack>
    </Modal>
  );
}
