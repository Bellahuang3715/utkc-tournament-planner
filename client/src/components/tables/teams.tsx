import React, { useState, useMemo } from "react";
import { useTranslation } from "next-i18next";
import { SWRResponse } from "swr";
import { MaterialReactTable, type MRT_ColumnDef } from "material-react-table";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { Box, IconButton, Tooltip } from "@mui/material";
import AddBoxIcon from "@mui/icons-material/AddBox";
import DeleteIcon from "@mui/icons-material/Delete";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import { BiEditAlt } from "react-icons/bi";
import { Badge, Button } from "@mantine/core";
import { mkConfig, generateCsv, download } from "export-to-csv";

import { TeamInterface } from "../../interfaces/team";
import { TournamentMinimal } from "../../interfaces/tournament";
import { deleteTeam } from "../../services/team";
import { GenerateBracketsButtonTeams } from "../modals/bracket_create_modal";
import TeamModal from "../modals/team_modal";
import { NoContent } from "../no_content/empty_table_info";
import RequestErrorAlert from "../utils/error_alert";
import { TableSkeletonSingleColumn } from "../utils/skeletons";

export default function TeamsTable({
  tournamentData,
  swrTeamsResponse,
  teams,
}: {
  tournamentData: TournamentMinimal;
  swrTeamsResponse: SWRResponse;
  teams: TeamInterface[];
}) {
  const { t } = useTranslation();
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // ────── CSV EXPORT ─────────────────────────────────────────────
  const csvConfig = mkConfig({
    fieldSeparator: ",",
    decimalSeparator: ".",
    useKeysAsHeaders: true,
  });

  const handleExportAll = () => {
    const rows = teams.map((team) => ({
      id: team.id,
      code: team.code,
      name: team.name,
      club: team.club,
      category: team.category,
      created: team.created,
      active: team.active,
      wins: team.wins,
    }));
    const csv = generateCsv(csvConfig)(rows);
    download(csvConfig)(csv);
  };

  const columns = useMemo<MRT_ColumnDef<TeamInterface>[]>(
    () => [
      {
        accessorKey: "active",
        header: t("status"),
        enableColumnFilter: false,
        Cell: ({ cell }) =>
          cell.getValue<boolean>() ? (
            <Badge color="green">{t("active")}</Badge>
          ) : (
            <Badge color="red">{t("inactive")}</Badge>
          ),
      },
      {
        accessorKey: "name",
        header: t("name_table_header"),
        filterVariant: "text",
      },
      {
        accessorKey: "club",
        header: t("members_table_header"),
        enableSorting: false,
        filterVariant: "text",
      },
      {
        accessorKey: "category",
        header: t("category_table_header"),
        enableSorting: false,
        filterVariant: "multi-select",
        filterSelectOptions: ["Mixed", "Womens"],
      },
      {
        accessorKey: "created",
        header: t("created"),
        enableColumnFilter: false,
        Cell: ({ cell }) => (
          <time dateTime={cell.getValue<string>()}>
            {new Date(cell.getValue<string>()).toLocaleString()}
          </time>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        enableColumnFilter: false,
        enableSorting: false,
        enableEditing: false,
        size: 100,
        Cell: ({ row }) => (
          <Box sx={{ display: "flex", gap: "0.5rem" }}>
            <Tooltip title={t("edit_team_button", "Edit")}>
              <Button
                color="green"
                size="xs"
                style={{ marginRight: 10 }}
                onClick={() => setCreateModalOpen(true)}
                leftSection={<BiEditAlt size={20} />}
              >
                {t("edit_team_title")}
              </Button>
            </Tooltip>
          </Box>
        ),
      },
    ],
    [t, tournamentData.id, swrTeamsResponse]
  );

  if (swrTeamsResponse.error)
    return <RequestErrorAlert error={swrTeamsResponse.error} />;

  if (swrTeamsResponse.isLoading) {
    return <TableSkeletonSingleColumn />;
  }

  return (
    <>
      <TeamModal
        tournament_id={tournamentData.id}
        swrTeamsResponse={swrTeamsResponse}
        opened={createModalOpen}
        setOpened={setCreateModalOpen}
      />
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <MaterialReactTable<TeamInterface>
          columns={columns}
          data={teams}
          enableColumnOrdering={false}
          enableColumnPinning
          enableColumnFilters
          enableRowSelection
          enableSorting
          enablePagination
          renderTopToolbarCustomActions={({ table }) => {
            const handleRemoveTeams = async () => {
              const selected = table.getSelectedRowModel().flatRows;
              if (selected.length === 0) return;
              const ok = window.confirm(
                t("confirm_remove_teams", "Are you sure you want to remove the selected team(s)?")
              );
              if (!ok) return;
              const tournamentId = tournamentData.id;
              try {
                await Promise.all(
                  selected.map((row) =>
                    deleteTeam(tournamentId, row.original.id)
                  )
                );
                table.resetRowSelection();
                await swrTeamsResponse.mutate();
              } catch (err) {
                console.error("Failed to delete team(s):", err);
              }
            };

            return (
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mb={2}
              >
                <Tooltip title="Add Team">
                  <IconButton onClick={() => setCreateModalOpen(true)}>
                    <AddBoxIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Remove Team(s)">
                  <span>
                    <IconButton
                      disabled={
                        table.getSelectedRowModel().flatRows.length === 0
                      }
                      onClick={handleRemoveTeams}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>
            );
          }}
          renderBottomToolbarCustomActions={({ table }) => (
            <Box
              sx={{
                display: "flex",
                gap: "16px",
                padding: "8px",
                flexWrap: "wrap",
              }}
            >
              <Button
                leftSection={<FileDownloadIcon />}
                onClick={handleExportAll}
                style={{ textTransform: "none" }}
              >
                {t("export_all_data", "Export All Data")}
              </Button>

              <GenerateBracketsButtonTeams table={table} />
            </Box>
          )}
          initialState={{ density: 'compact' }}
        />
      </LocalizationProvider>
    </>
  );
}
