import React, { useMemo, useState } from "react";
import { Alert, Button, Group } from "@mantine/core";
import {
  MantineReactTable,
  useMantineReactTable,
  type MRT_ColumnDef,
} from "mantine-react-table-open";
import { useTranslation } from "next-i18next/pages";

import { saveAction } from "../buttons/action_styles";
import {
  getPlayerFields,
  getDivisionPlayers,
  getPlayers,
  getDivisionLock,
  getIndividualsMemberships,
} from "../../services/adapter";
import { Player } from "../../interfaces/player";
import RequestErrorAlert from "../utils/error_alert";
import { WarningAlert } from "../utils/warning_alert";
import { TableSkeletonSingleColumn } from "../utils/skeletons";
import { removePlayersFromDivision } from "../../services/division";
import { assignBrackets, MIN_BRACKET_SIZE, pickClosestSizes } from "../utils/seeding";
import {
  fetchDivisionBracketsWithPlayers,
  postDivisionBrackets,
  replaceDivisionBrackets,
} from "../../services/bracket";
import type {
  DivisionPlayer,
  IndividualsPlayerMembership,
} from "../../interfaces/division";
import type { BracketWithPlayers } from "../../interfaces/bracket";
import AddPlayersToDivisionModal from "../modals/add_players_to_division_modal";
import {
  RosterActions,
  RosterSelectionAction,
  rosterTableInitialState,
  rosterTablePresentation,
} from "./roster_actions";

export default function DivisionPlayersTable({
  tournamentId,
  divisionId,
  divisionName = "",
  divisionPrefix,
  onBracketsChanged,
}: {
  tournamentId: number;
  divisionId: number;
  divisionName?: string;
  divisionPrefix?: string | null;
  onBracketsChanged?: () => void | Promise<void>;
}) {
  const { t } = useTranslation();

  const swrPlayerFieldsResponse = getPlayerFields(tournamentId);
  const swrDivisionPlayersResponse = getDivisionPlayers(divisionId);
  const swrAllPlayersResponse = getPlayers(tournamentId);
  const swrMemberships = getIndividualsMemberships(tournamentId);
  const swrLock = getDivisionLock(divisionId);
  const locked = Boolean(swrLock.data?.data?.locked);

  const [addModalOpen, setAddModalOpen] = useState(false);

  const players: Player[] = swrDivisionPlayersResponse.data?.players ?? [];
  const rawAllPlayers = swrAllPlayersResponse.data;
  const allPlayers: Player[] = Array.isArray(rawAllPlayers?.data?.players)
    ? rawAllPlayers.data.players
    : Array.isArray(rawAllPlayers)
      ? rawAllPlayers
      : [];
  const memberships: IndividualsPlayerMembership[] =
    swrMemberships.data?.data ?? [];
  const targetHasPrefix = Boolean((divisionPrefix ?? "").trim());
  const availableToAdd = useMemo(() => {
    const inThisDivision = new Set(players.map((p) => p.id));
    const blocked = new Set<number>();
    for (const m of memberships) {
      if (m.division_id === divisionId) continue;
      const otherHasPrefix = Boolean((m.prefix ?? "").trim());
      if (targetHasPrefix || otherHasPrefix) {
        blocked.add(m.player_id);
      }
    }
    return allPlayers.filter(
      (p) => !inThisDivision.has(p.id) && !blocked.has(p.id),
    );
  }, [allPlayers, memberships, divisionId, targetHasPrefix, players]);

  const playerMetaById = useMemo(() => {
    const m = new Map<number, Player>();
    for (const p of allPlayers) m.set(p.id, p);
    return m;
  }, [allPlayers]);

  const columns = useMemo<MRT_ColumnDef<Player>[]>(
    () => [
      { accessorKey: "name", header: t("name_header", "Name") },
      { accessorKey: "club", header: t("club_header", "Club") },
      { accessorKey: "code", header: t("code_header", "Code") },
      {
        accessorKey: "bias",
        header: t("bias", "Bias"),
        Cell: ({ cell }) => (cell.getValue<boolean>() ? t("yes") : t("no")),
      },
    ],
    [t],
  );

  const onChangeRosterAndBrackets = async (nextPlayerIds: number[]) => {
    const currentBracketsRes = await fetchDivisionBracketsWithPlayers(divisionId);
    const currentBrackets = (currentBracketsRes.data?.data ?? []) as {
      num_players: number;
    }[];
    const currentSizes = currentBrackets.map((b) => Number(b.num_players ?? 0));

    const totalNew = nextPlayerIds.length;
    const proposedSizes = pickClosestSizes(currentSizes, totalNew);

    const currentSummary = currentSizes.length
      ? `${currentSizes.length} ${t("brackets", "brackets")}: [${currentSizes.join(", ")}]`
      : t("no_existing_brackets", "No existing brackets (fresh seeding).");

    const proposedSummary = `${proposedSizes.length} ${t("brackets", "brackets")}: [${proposedSizes.join(", ")}]`;

    const ok = window.confirm(
      t(
        "update_division_brackets_confirm",
        "You currently have {{current}}.\nWith {{count}} players, the new layout will be {{proposed}}.\n\nDo you want to apply this new layout and regenerate all seeding for this division?",
        {
          current: currentSummary,
          proposed: proposedSummary,
          count: totalNew,
        },
      ),
    );
    if (!ok) return false;

    const divisionPlayers: DivisionPlayer[] = [];
    for (const id of nextPlayerIds) {
      const p = playerMetaById.get(id);
      if (p) {
        divisionPlayers.push({
          id: p.id,
          name: p.name,
          club: p.club ?? "",
          code: p.code ?? null,
          participant_number: (p as any).participant_number ?? null,
          bias: false,
        });
      }
    }

    const seeded = assignBrackets(divisionPlayers, proposedSizes);

    await postDivisionBrackets(divisionId, seeded, true);
    await onBracketsChanged?.();

    return true;
  };

  const handleAddPlayersClick = () => {
    if (locked) return;
    setAddModalOpen(true);
  };

  const handleRemoveSelected = async (
    tableInstance: { resetRowSelection: () => void; resetRowPinning: () => void },
    selectedIds: number[],
  ) => {
    if (locked || !selectedIds.length) return;

    const remaining = players.length - selectedIds.length;
    if (remaining < MIN_BRACKET_SIZE) {
      window.alert(
        t(
          "cannot_remove_below_min_players",
          "A division needs at least {{min}} players. Removing these would leave {{remaining}}.",
          { min: MIN_BRACKET_SIZE, remaining },
        ),
      );
      return;
    }

    const names = players
      .filter((p) => selectedIds.includes(p.id))
      .map((p) => `${p.name} (${p.club ?? "-"})`)
      .join("\n");

    const ok = window.confirm(
      t(
        "confirm_remove_players_division",
        "Remove the following players from this division?\n\n{{names}}",
        { names },
      ),
    );
    if (!ok) return;

    // For now, only support minimal-change logic when a single player is removed
    if (selectedIds.length > 1) {
      window.alert(
        t(
          "remove_one_player_at_a_time",
          "Please remove one player at a time if you want bracket groups to be minimally adjusted.",
        ),
      );
      return;
    }

    // Clear select-sticky pin/selection before roster updates — otherwise MRT
    // calls getRow() on the removed id and throws.
    tableInstance.resetRowSelection();
    tableInstance.resetRowPinning();

    const removedId = selectedIds[0];
    const nextPlayerIds = players.map((p) => p.id).filter((id) => id !== removedId);

    // 1) Adjust brackets minimally around the removed player
    const bracketsRes = await fetchDivisionBracketsWithPlayers(divisionId);
    const brackets = (bracketsRes.data?.data ?? []) as BracketWithPlayers[];

    if (brackets.length) {
      const updated = brackets.map((b) => ({
        ...b,
        players: [...(b.players ?? [])],
      }));

      // Helper to find bracket & index containing a player
      const findPlayerLoc = (playerId: number) => {
        for (const b of updated) {
          const idx = b.players.findIndex((slot) => Number(slot.player_id) === playerId);
          if (idx >= 0) return { bracket: b, bracketPlayerIndex: idx };
        }
        return null;
      };

      const loc = findPlayerLoc(removedId);

      if (loc) {
        const { bracket: sourceBracket, bracketPlayerIndex } = loc;
        const sourceSize = sourceBracket.num_players;

        // Find the largest bracket (prefer different bracket than source when needed)
        const maxSize = Math.max(...updated.map((b) => b.num_players));
        const largestBrackets = updated
          .filter((b) => b.num_players === maxSize)
          .sort((a, b) => a.index - b.index);
        const largestBracket =
          largestBrackets.find((b) => b.id !== sourceBracket.id) ?? largestBrackets[0] ?? null;

        const isSourceLargest = sourceBracket.num_players === maxSize;
        // Minimal shrink always reduces some group by 1 — reseed if that would go below min.
        const shrinkTargetSize = isSourceLargest
          ? sourceSize
          : (largestBracket?.num_players ?? sourceSize);
        if (shrinkTargetSize - 1 < MIN_BRACKET_SIZE) {
          const applied = await onChangeRosterAndBrackets(nextPlayerIds);
          if (!applied) return;
          await removePlayersFromDivision(divisionId, selectedIds);
          await swrDivisionPlayersResponse.mutate();
          return;
        }

        if (isSourceLargest) {
          // Case 1: removed player is from one of the largest groups
          // Just shrink that group by 1; if not last index, swap with last so others keep positions.
          const lastIdx = sourceSize - 1;
          const slots = sourceBracket.players;
          const removedSlot = slots[bracketPlayerIndex];

          if (lastIdx !== bracketPlayerIndex) {
            const lastSlot = slots.find((s) => s.bracket_idx === lastIdx);
            if (lastSlot) {
              lastSlot.bracket_idx = removedSlot.bracket_idx;
            }
          }

          // Drop the highest index slot and update num_players
          sourceBracket.players = slots
            .filter((s) => s.player_id !== removedId)
            .filter((s) => s.bracket_idx < lastIdx);
          sourceBracket.num_players = sourceSize - 1;
        } else if (largestBracket && largestBracket.num_players > 0) {
          // Case 2: removed player is from a smaller group
          // Move highest-index player from largest group into the removed player's slot,
          // shrink largest group by 1.
          const targetSlots = sourceBracket.players;
          const removedSlot = targetSlots[bracketPlayerIndex];

          // Remove the slot for the removed player from its group
          sourceBracket.players = targetSlots.filter((s) => s.player_id !== removedId);

          const largeSize = largestBracket.num_players;
          const lastIdxLarge = largeSize - 1;
          const largeSlots = largestBracket.players;
          const donor = largeSlots.find((s) => s.bracket_idx === lastIdxLarge);

          if (donor) {
            // Remove donor from largest group and shrink its size
            largestBracket.players = largeSlots.filter(
              (s) => s.player_id !== donor.player_id,
            );
            largestBracket.num_players = largeSize - 1;

            // Insert donor into the removed player's bracket at the same index
            const moved = { ...donor, bracket_idx: removedSlot.bracket_idx };
            sourceBracket.players = [...sourceBracket.players, moved];
          }
        }

        await replaceDivisionBrackets(divisionId, updated);
        await onBracketsChanged?.();
      }
    }

    // 2) Detach the player from the division and refresh the table
    await removePlayersFromDivision(divisionId, selectedIds);
    await swrDivisionPlayersResponse.mutate();
  };

  const table = useMantineReactTable({
    ...rosterTablePresentation,
    columns,
    data: players,
    getRowId: (row) => String(row.id),
    enableRowSelection: true,
    selectAllMode: "all",
    enableColumnOrdering: true,
    enableStickyHeader: true,
    enableColumnPinning: true,
    enableRowPinning: true,
    rowPinningDisplayMode: "select-sticky",
    enableRowNumbers: true,
    initialState: { ...rosterTableInitialState, showColumnFilters: false },
    renderTopToolbarCustomActions: ({ table: tableInstance }) => {
      const selected = tableInstance
        .getSelectedRowModel()
        .rows.map((r) => r.original.id);
      return (
        <RosterActions>
          <Button
            {...saveAction}
            type="button"
            onClick={handleAddPlayersClick}
            disabled={locked}
          >
            {t("add_players_to_division", "Add players to division")}
          </Button>
          <RosterSelectionAction
            onClick={() => void handleRemoveSelected(tableInstance, selected)}
            disabled={locked || !selected.length}
          >
            {t("remove_from_division", "Remove from division")}
          </RosterSelectionAction>
        </RosterActions>
      );
    },
  });

  if (swrPlayerFieldsResponse.error || swrDivisionPlayersResponse.error) {
    return (
      <RequestErrorAlert
        error={
          swrPlayerFieldsResponse.error || swrDivisionPlayersResponse.error
        }
      />
    );
  }
  if (
    swrPlayerFieldsResponse.isLoading ||
    swrDivisionPlayersResponse.isLoading
  ) {
    return <TableSkeletonSingleColumn />;
  }

  return (
    <>
      {locked && (
        <WarningAlert mb="sm" title={t("division_locked", "Locked")}>
          {t(
            "division_locked_roster_alert",
            "Scorekeeping has started — roster and seeding are locked. Unlock from Scores by clearing all scores.",
          )}
        </WarningAlert>
      )}
      <AddPlayersToDivisionModal
        opened={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        tournamentId={tournamentId}
        divisionId={divisionId}
        divisionName={divisionName}
        divisionPrefix={divisionPrefix}
        divisionPlayers={players}
        availableToAdd={availableToAdd}
        onChangeRosterAndBrackets={onChangeRosterAndBrackets}
        onSuccess={async () => {
          await swrDivisionPlayersResponse.mutate();
          await swrAllPlayersResponse.mutate();
          await swrMemberships.mutate();
        }}
      />
      <MantineReactTable table={table} />
    </>
  );
}
