import React from "react";
import { MaterialReactTable, type MRT_ColumnDef } from "material-react-table";
import { useTranslation } from "next-i18next";

import { getDivisionTeams } from "../../services/adapter";
import RequestErrorAlert from "../utils/error_alert";
import { TableSkeletonSingleColumn } from "../utils/skeletons";
import { NoContent } from "../no_content/empty_table_info";
import type { DivisionTeam } from "../../interfaces/division";

export default function DivisionTeamsTable({
  divisionId,
}: {
  divisionId: number;
}) {
  const { t } = useTranslation();

  const swrDivisionTeamsResponse = getDivisionTeams(divisionId);

  if (swrDivisionTeamsResponse.error) {
    return (
      <RequestErrorAlert error={swrDivisionTeamsResponse.error} />
    );
  }
  if (swrDivisionTeamsResponse.isLoading) {
    return <TableSkeletonSingleColumn />;
  }

  const teams: DivisionTeam[] = swrDivisionTeamsResponse.data?.teams ?? [];

  if (teams.length === 0) {
    return <NoContent title={t("no_teams_title", "No teams in this division")} />;
  }

  const columns: MRT_ColumnDef<DivisionTeam>[] = [
    { accessorKey: "name", header: t("team_name", "Team name") },
    { accessorKey: "category", header: t("category_table_header", "Category") },
    {
      accessorKey: "bias",
      header: t("bias", "Bias"),
      Cell: ({ cell }) => (cell.getValue<boolean>() ? t("yes") : t("no")),
    },
  ];

  return (
    <MaterialReactTable<DivisionTeam>
      columns={columns}
      data={teams}
      enableStickyHeader
      enableColumnPinning
      enableRowNumbers={true}
      initialState={{ showColumnFilters: false, density: "compact" }}
    />
  );
}
