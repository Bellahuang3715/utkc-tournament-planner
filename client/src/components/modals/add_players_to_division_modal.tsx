import React, { useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Stack,
  MultiSelect,
} from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { useTranslation } from "next-i18next/pages";
import { getErrorDetail } from "../../services/adapter";
import { updatePlayerCodes } from "../../services/player";
import { addPlayersToDivision } from "../../services/division";
import type { Player } from "../../interfaces/player";
import { WarningAlert } from "../utils/warning_alert";
import ModalFooter from "./modal_footer";

/** Get the numeric part of a division code (e.g. "E37" -> 37). */
function codeNumber(code: string | null | undefined): number | null {
  if (!code || typeof code !== "string") return null;
  const m = code.match(/(\d+)$/);
  return m ? parseInt(m[1], 10) : null;
}

/** Next code(s) for this division: continue from current max (e.g. E37 -> E38, E39, ...). */
function nextDivisionCodes(
  divisionPrefix: string | null | undefined,
  currentDivisionPlayers: { code?: string | null }[],
  count: number,
): string[] {
  const prefix = (divisionPrefix ?? "").trim();
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
  divisionPrefix,
  divisionPlayers,
  availableToAdd,
  onChangeRosterAndBrackets,
  onSuccess,
}: AddPlayersToDivisionModalProps) {
  const { t } = useTranslation();
  const [adding, setAdding] = useState(false);
  const [selectedExistingIds, setSelectedExistingIds] = useState<string[]>([]);
  const [formWarning, setFormWarning] = useState<string | null>(null);

  const hasPrefix = Boolean((divisionPrefix ?? "").trim());

  const existingOptions = useMemo(
    () =>
      availableToAdd.map((p) => ({
        value: String(p.id),
        label: `${p.name ?? ""} (${p.club ?? "-"})`,
      })),
    [availableToAdd],
  );

  const handleAddExisting = async () => {
    const ids = selectedExistingIds.map((x) => Number(x)).filter(Number.isFinite);
    if (ids.length === 0) {
      return;
    }
    setAdding(true);
    setFormWarning(null);
    try {
      if (hasPrefix) {
        const codes = nextDivisionCodes(divisionPrefix, divisionPlayers, ids.length);
        if (codes.length !== ids.length) {
          setFormWarning(
            t(
              "add_players_code_error",
              "Could not generate codes for this division.",
            ),
          );
          return;
        }
        await updatePlayerCodes(
          tournamentId,
          ids.map((id, i) => ({ player_id: id, code: codes[i] })),
        );
      }
      const nextIds = [...divisionPlayers.map((p) => p.id), ...ids];
      const applied = await onChangeRosterAndBrackets(nextIds);
      if (!applied) return;
      const res = await addPlayersToDivision(divisionId, ids);
      if (res?.response?.status === 409 || res?.isAxiosError) {
        setFormWarning(
          getErrorDetail(res) ??
            t(
              "add_players_conflict",
              "One or more selected players cannot be added to this division.",
            ),
        );
        return;
      }
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
      onClose={() => {
        setFormWarning(null);
        onClose();
      }}
      closeOnClickOutside={false}
      centered
      title={t("add_players_to_division", "Add players to division")}
      size="md"
    >
      <Stack gap="md">
        {formWarning ? <WarningAlert>{formWarning}</WarningAlert> : null}
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
              onChange={(next) => {
                setFormWarning(null);
                setSelectedExistingIds(next);
              }}
              searchable
              clearable
            />
            <ModalFooter
              onCancel={onClose}
              primaryAction="save"
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
