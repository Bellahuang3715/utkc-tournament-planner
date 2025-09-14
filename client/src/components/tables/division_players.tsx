import React from "react";
import { MaterialReactTable, type MRT_ColumnDef } from "material-react-table";
import { useTranslation } from "next-i18next";

import { getPlayerFields, getDivisionPlayers } from "../../services/adapter";
import { Player } from "../../interfaces/player";
import RequestErrorAlert from "../utils/error_alert";
import { TableSkeletonSingleColumn } from "../utils/skeletons";
import { NoContent } from "../no_content/empty_table_info";

export default function DivisionPlayersTable({
  tournamentId,
  divisionId,
}: {
  tournamentId: number;
  divisionId: number;
}) {
  const { t } = useTranslation();

  const swrPlayerFieldsResponse = getPlayerFields(tournamentId);
  const swrDivisionPlayersResponse = getDivisionPlayers(divisionId);
  console.log("division players", swrDivisionPlayersResponse);

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

  const players: Player[] = swrDivisionPlayersResponse.data?.players ?? [];

  console.log("players", players);

  if (players.length === 0) {
    return <NoContent title={t("no_players_title")} />;
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

  return (
    <MaterialReactTable<Player>
      columns={columns}
      data={players}
      enableColumnOrdering
      enableStickyHeader
      enableColumnPinning
      enableRowPinning
      rowPinningDisplayMode="select-sticky"
      enableRowNumbers={true}
      // no row actions, no bottom toolbar buttons here
      initialState={{ showColumnFilters: false, density: 'compact' }}
    />
  );
}
