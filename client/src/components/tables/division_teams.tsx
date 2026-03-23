import React, { useState } from "react";
import { MaterialReactTable, type MRT_ColumnDef } from "material-react-table";
import { useTranslation } from "next-i18next";
import { Button, Group } from "@mantine/core";

import { getDivisionTeams, getTeams } from "../../services/adapter";
import AddNewTeamModal from "../modals/add_new_team_modal";
import RequestErrorAlert from "../utils/error_alert";
import { TableSkeletonSingleColumn } from "../utils/skeletons";
import { NoContent } from "../no_content/empty_table_info";
import {
  addTeamsToDivision,
  removeTeamsFromDivision,
} from "../../services/division";
import {
  fetchDivisionBracketsWithTeams,
  postDivisionBracketsTeams,
  replaceDivisionBracketsTeams,
} from "../../services/bracket";
import type { DivisionTeam } from "../../interfaces/division";
import type { BracketWithTeams } from "../../interfaces/bracket";
import { assignTeamBrackets, pickClosestSizesTeams } from "../utils/seeding_teams";

export default function DivisionTeamsTable({
  tournamentId,
  divisionId,
}: {
  tournamentId: number;
  divisionId: number;
}) {
  const { t } = useTranslation();
  const [addNewTeamModalOpen, setAddNewTeamModalOpen] = useState(false);

  const swrDivisionTeamsResponse = getDivisionTeams(divisionId);
  const swrAllTeamsResponse = getTeams(tournamentId);

  if (swrDivisionTeamsResponse.error) {
    return <RequestErrorAlert error={swrDivisionTeamsResponse.error} />;
  }
  if (swrDivisionTeamsResponse.isLoading) {
    return <TableSkeletonSingleColumn />;
  }

  const teams: DivisionTeam[] = swrDivisionTeamsResponse.data?.teams ?? [];

  const rawAllTeams = swrAllTeamsResponse.data;
  const allTeams: DivisionTeam[] = Array.isArray(rawAllTeams?.data?.teams)
    ? rawAllTeams.data.teams
    : Array.isArray(rawAllTeams?.teams)
      ? rawAllTeams.teams
      : Array.isArray(rawAllTeams?.data)
        ? rawAllTeams.data
        : [];

  const divisionTeamIds = new Set(teams.map((x) => x.id));
  const availableToAdd = allTeams.filter((team) => !divisionTeamIds.has(team.id));

  const columns: MRT_ColumnDef<DivisionTeam>[] = [
    { accessorKey: "name", header: t("team_name", "Team name") },
    { accessorKey: "category", header: t("category_table_header", "Category") },
    {
      accessorKey: "bias",
      header: t("bias", "Bias"),
      Cell: ({ cell }) => (cell.getValue<boolean>() ? t("yes") : t("no")),
    },
  ];

  const onChangeRosterAndBrackets = async (
    nextTeamIds: number[],
    nextTeamsOverride?: DivisionTeam[],
  ) => {
    const currentBracketsRes = await fetchDivisionBracketsWithTeams(divisionId);
    const currentBrackets = (currentBracketsRes.data?.data ?? []) as BracketWithTeams[];
    const currentSizes = currentBrackets.map((b) => Number(b.num_players ?? 0));

    const totalNew = nextTeamIds.length;
    const proposedSizes = pickClosestSizesTeams(currentSizes, totalNew);

    const currentSummary = currentSizes.length
      ? `${currentSizes.length} ${t("brackets", "brackets")}: [${currentSizes.join(", ")}]`
      : t("no_existing_brackets", "No existing brackets (fresh seeding).");

    const proposedSummary = `${proposedSizes.length} ${t("brackets", "brackets")}: [${proposedSizes.join(", ")}]`;

    const ok = window.confirm(
      t(
        "update_division_brackets_confirm_teams",
        "You currently have {{current}}.\nWith {{count}} teams, the new layout will be {{proposed}}.\n\nDo you want to apply this new layout and regenerate all seeding for this division?",
        {
          current: currentSummary,
          proposed: proposedSummary,
          count: totalNew,
        },
      ),
    );
    if (!ok) return false;

    const nextTeams =
      nextTeamsOverride ??
      (() => {
        const teamMetaById = new Map<number, DivisionTeam>();
        for (const x of allTeams) teamMetaById.set(x.id, x);
        return nextTeamIds
          .map((id) => teamMetaById.get(id))
          .filter((x): x is DivisionTeam => !!x);
      })();

    const teamNames = nextTeams.map((team) => team.name);
    const biasTeamIds = nextTeams.filter((team) => team.bias).map((team) => team.id);
    const seeded = assignTeamBrackets(teamNames, {
      teamIds: nextTeamIds,
      biasTeamIds: biasTeamIds.length ? biasTeamIds : undefined,
      sizes: proposedSizes,
    });

    await postDivisionBracketsTeams(divisionId, seeded, true);
    return true;
  };

  const handleAddNewTeamSuccess = async (
    newTeamId: number,
    newTeam: { name: string; category: string; club: string },
  ) => {
    await addTeamsToDivision(divisionId, [newTeamId]);
    const nextIds = [...divisionTeamIds, newTeamId];
    const nextTeams: DivisionTeam[] = [
      ...teams,
      {
        id: newTeamId,
        name: newTeam.name,
        club: newTeam.club,
        category: newTeam.category,
        bias: false,
      },
    ];
    const applied = await onChangeRosterAndBrackets(nextIds, nextTeams);
    if (!applied) return;
    await swrDivisionTeamsResponse.mutate();
    await swrAllTeamsResponse.mutate();
  };

  const handleAddTeams = async () => {
    if (!availableToAdd.length) {
      window.alert(
        t("no_available_teams_to_add", "There are no additional teams to add to this division."),
      );
      return;
    }

    const names = availableToAdd.map((team) => `${team.name} (${team.category ?? "-"})`).join("\n");
    const ok = window.confirm(
      t(
        "confirm_add_all_teams_division",
        "Add the following teams to this division?\n\n{{names}}",
        { names },
      ),
    );
    if (!ok) return;

    const nextIds = [...divisionTeamIds, ...availableToAdd.map((team) => team.id)];
    const applied = await onChangeRosterAndBrackets(Array.from(nextIds));
    if (!applied) return;

    await addTeamsToDivision(
      divisionId,
      availableToAdd.map((team) => team.id),
    );
    await swrDivisionTeamsResponse.mutate();
  };

  const handleRemoveSelected = async (selectedIds: number[]) => {
    if (!selectedIds.length) return;

    if (selectedIds.length > 1) {
      window.alert(
        t(
          "remove_one_team_at_a_time",
          "Please remove one team at a time if you want bracket groups to be minimally adjusted.",
        ),
      );
      return;
    }

    const removedId = selectedIds[0];

    const bracketsRes = await fetchDivisionBracketsWithTeams(divisionId);
    const brackets = (bracketsRes.data?.data ?? []) as BracketWithTeams[];

    if (brackets.length) {
      const updated = brackets.map((b) => ({
        ...b,
        teams: [...(b.teams ?? [])],
      }));

      const findTeamLoc = (teamId: number) => {
        for (const b of updated) {
          const idx = b.teams.findIndex((slot) => Number(slot.team_id) === teamId);
          if (idx >= 0) return { bracket: b, bracketTeamIndex: idx };
        }
        return null;
      };

      const loc = findTeamLoc(removedId);

      if (loc) {
        const { bracket: sourceBracket, bracketTeamIndex } = loc;
        const sourceSize = sourceBracket.num_players;

        const maxSize = Math.max(...updated.map((b) => b.num_players));
        const largestBrackets = updated
          .filter((b) => b.num_players === maxSize)
          .sort((a, b) => a.index - b.index);
        const largestBracket =
          largestBrackets.find((b) => b.id !== sourceBracket.id) ?? largestBrackets[0] ?? null;

        const isSourceLargest = sourceBracket.num_players === maxSize;

        if (isSourceLargest) {
          const lastIdx = sourceSize - 1;
          const slots = sourceBracket.teams;
          const removedSlot = slots[bracketTeamIndex];

          if (lastIdx !== bracketTeamIndex) {
            const lastSlot = slots.find((s) => s.bracket_idx === lastIdx);
            if (lastSlot) {
              lastSlot.bracket_idx = removedSlot.bracket_idx;
            }
          }

          sourceBracket.teams = slots
            .filter((s) => s.team_id !== removedId)
            .filter((s) => s.bracket_idx < lastIdx);
          sourceBracket.num_players = sourceSize - 1;
        } else if (largestBracket && largestBracket.num_players > 0) {
          const targetSlots = sourceBracket.teams;
          const removedSlot = targetSlots[bracketTeamIndex];

          sourceBracket.teams = targetSlots.filter((s) => s.team_id !== removedId);

          const largeSize = largestBracket.num_players;
          const lastIdxLarge = largeSize - 1;
          const largeSlots = largestBracket.teams;
          const donor = largeSlots.find((s) => s.bracket_idx === lastIdxLarge);

          if (donor) {
            largestBracket.teams = largeSlots.filter(
              (s) => s.team_id !== donor.team_id,
            );
            largestBracket.num_players = largeSize - 1;

            const moved = { ...donor, bracket_idx: removedSlot.bracket_idx };
            sourceBracket.teams = [...sourceBracket.teams, moved];
          }
        }

        await replaceDivisionBracketsTeams(divisionId, updated);
      }
    }

    await removeTeamsFromDivision(divisionId, selectedIds);
    await swrDivisionTeamsResponse.mutate();
  };

  const renderTopToolbarCustomActions = ({ table }: { table: any }) => {
    const selected = table
      .getSelectedRowModel()
      .rows.map((r: { original: DivisionTeam }) => r.original.id);
    return (
      <Group gap="xs">
        <Button
          variant="light"
          size="xs"
          onClick={() => setAddNewTeamModalOpen(true)}
        >
          {t("add_new_team", "Add new team")}
        </Button>
        <Button
          variant="light"
          size="xs"
          onClick={handleAddTeams}
        >
          {t("add_teams_to_division", "Add teams to division")}
        </Button>
        <Button
          variant="light"
          color="red"
          size="xs"
          onClick={() => handleRemoveSelected(selected)}
          disabled={!selected.length}
        >
          {t("remove_from_division", "Remove from division")}
        </Button>
      </Group>
    );
  };

  if (teams.length === 0) {
    return (
      <>
        <Group mb="sm" justify="flex-start" gap="xs">
          <Button variant="light" size="sm" onClick={() => setAddNewTeamModalOpen(true)}>
            {t("add_new_team", "Add new team")}
          </Button>
          <Button variant="light" size="sm" onClick={handleAddTeams}>
            {t("add_teams_to_division", "Add teams to division")}
          </Button>
        </Group>
        <NoContent title={t("no_teams_title", "No teams in this division")} />
        <AddNewTeamModal
          tournamentId={tournamentId}
          opened={addNewTeamModalOpen}
          onClose={() => setAddNewTeamModalOpen(false)}
          onSuccess={handleAddNewTeamSuccess}
        />
      </>
    );
  }

  return (
    <>
      <AddNewTeamModal
        tournamentId={tournamentId}
        opened={addNewTeamModalOpen}
        onClose={() => setAddNewTeamModalOpen(false)}
        onSuccess={handleAddNewTeamSuccess}
      />
      <MaterialReactTable<DivisionTeam>
      columns={columns}
      data={teams}
      enableRowSelection
      enableStickyHeader
      enableColumnPinning
      enableRowNumbers={true}
      renderTopToolbarCustomActions={renderTopToolbarCustomActions}
      initialState={{ showColumnFilters: false, density: "compact" }}
    />
    </>
  );
}
