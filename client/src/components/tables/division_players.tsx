import React, { useMemo, useState } from "react";
import { MaterialReactTable, type MRT_ColumnDef } from "material-react-table";
import { useTranslation } from "next-i18next";

import { getPlayerFields, getDivisionPlayers, getPlayers } from "../../services/adapter";
import { Player } from "../../interfaces/player";
import RequestErrorAlert from "../utils/error_alert";
import { TableSkeletonSingleColumn } from "../utils/skeletons";
import { NoContent } from "../no_content/empty_table_info";
import { addPlayersToDivision, removePlayersFromDivision } from "../../services/division";
import { useRouter } from "next/router";
import { assignBrackets, pickClosestSizes } from "../utils/seeding";
import {
  fetchDivisionBracketsWithPlayers,
  postDivisionBrackets,
  replaceDivisionBrackets,
} from "../../services/bracket";
import type { DivisionPlayer } from "../../interfaces/division";
import type { BracketWithPlayers } from "../../interfaces/bracket";
import AddPlayersToDivisionModal from "../modals/add_players_to_division_modal";

export default function DivisionPlayersTable({
  tournamentId,
  divisionId,
  divisionName = "",
  divisionPrefix,
}: {
  tournamentId: number;
  divisionId: number;
  divisionName?: string;
  divisionPrefix?: string | null;
}) {
  const { t } = useTranslation();
  const router = useRouter();

  const swrPlayerFieldsResponse = getPlayerFields(tournamentId);
  const swrDivisionPlayersResponse = getDivisionPlayers(divisionId);
  const swrAllPlayersResponse = getPlayers(tournamentId);

  const [addModalOpen, setAddModalOpen] = useState(false);

  const players: Player[] = swrDivisionPlayersResponse.data?.players ?? [];
  const rawAllPlayers = swrAllPlayersResponse.data;
  const allPlayers: Player[] = Array.isArray(rawAllPlayers?.data?.players)
    ? rawAllPlayers.data.players
    : Array.isArray(rawAllPlayers)
      ? rawAllPlayers
      : [];
  const divisionPlayerIds = new Set(players.map((p) => p.id));
  const availableToAdd = allPlayers.filter((p) => !divisionPlayerIds.has(p.id));

  const playerMetaById = useMemo(() => {
    const m = new Map<number, Player>();
    for (const p of allPlayers) m.set(p.id, p);
    return m;
  }, [allPlayers]);

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

  const columns: MRT_ColumnDef<Player>[] = [
    { accessorKey: "name", header: t("name_header", "Name") },
    { accessorKey: "club", header: t("club_header", "Club") },
    { accessorKey: "code", header: t("code_header", "Code") },
    {
      accessorKey: "bias",
      header: t("bias", "Bias"),
      Cell: ({ cell }) => (cell.getValue<boolean>() ? t("yes") : t("no")),
    },
  ];

  const onChangeRosterAndBrackets = async (
    nextPlayerIds: number[],
    extraMeta?: Map<
      number,
      { id: number; name: string; club: string | null; club_id?: number; code: string | null }
    >
  ) => {
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
      const extra = extraMeta?.get(id);
      if (extra) {
        divisionPlayers.push({
          id: extra.id,
          name: extra.name,
          club: extra.club ?? "",
          code: extra.code,
          participant_number: extra.code ?? null,
          bias: false,
        });
        continue;
      }
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

    return true;
  };

  const handleAddPlayersClick = () => {
    setAddModalOpen(true);
  };

  const handleRemoveSelected = async (selectedIds: number[]) => {
    if (!selectedIds.length) return;

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

    const removedId = selectedIds[0];

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
      }
    }

    // 2) Detach the player from the division and refresh the table
    await removePlayersFromDivision(divisionId, selectedIds);
    await swrDivisionPlayersResponse.mutate();
  };

  return (
    <>
      <AddPlayersToDivisionModal
        opened={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        tournamentId={tournamentId}
        divisionId={divisionId}
        divisionName={divisionName}
        divisionPrefix={divisionPrefix}
        divisionPlayers={players}
        availableToAdd={availableToAdd}
        allPlayers={allPlayers}
        playerMetaById={playerMetaById}
        onChangeRosterAndBrackets={onChangeRosterAndBrackets}
        onSuccess={async () => {
          await swrDivisionPlayersResponse.mutate();
          await swrAllPlayersResponse.mutate();
        }}
      />
      <MaterialReactTable<Player>
        columns={columns}
        data={players}
        enableRowSelection
        enableColumnOrdering
        enableStickyHeader
        enableColumnPinning
        enableRowPinning
        rowPinningDisplayMode="select-sticky"
        enableRowNumbers={true}
        renderTopToolbarCustomActions={({ table }) => {
          const selected = table
            .getSelectedRowModel()
            .rows.map((r) => r.original.id);
          return (
            <>
              <button
                type="button"
                onClick={handleAddPlayersClick}
                style={{ marginRight: 8 }}
              >
                {t("add_players_to_division", "Add players to division")}
              </button>
              <button
                type="button"
                onClick={() => handleRemoveSelected(selected)}
                disabled={!selected.length}
              >
                {t("remove_from_division", "Remove from division")}
              </button>
            </>
          );
        }}
      initialState={{ showColumnFilters: false, density: 'compact' }}
    />
    </>
  );
}
