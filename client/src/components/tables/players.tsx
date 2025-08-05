import { useTranslation } from "next-i18next";
import React, { useState, useMemo } from "react";
import { SWRResponse } from "swr";
import {
  MaterialReactTable,
  MaterialReactTableProps,
  type MRT_ColumnDef,
  type MRT_Row,
} from "material-react-table";
import { Box, IconButton, Tooltip, Button } from "@mui/material";

import AddBoxIcon from "@mui/icons-material/AddBox";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import PlayerCreateModal from "../modals/player_create_modal";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { mkConfig, generateCsv, download } from "export-to-csv";

import { Player } from "../../interfaces/player";
import {
  createPlayer,
  updatePlayer,
  deletePlayer,
} from "../../services/player";
import { FieldInsertable } from "../../interfaces/player_fields";
import { TournamentMinimal } from "../../interfaces/tournament";
import { NoContent } from "../no_content/empty_table_info";
import RequestErrorAlert from "../utils/error_alert";
import { TableSkeletonSingleColumn } from "../utils/skeletons";

export default function PlayersTable({
  swrPlayersResponse,
  swrPlayerFieldsResponse,
  tournamentData,
}: {
  swrPlayersResponse: SWRResponse;
  swrPlayerFieldsResponse: SWRResponse;
  tournamentData: TournamentMinimal;
}) {
  const { t } = useTranslation();
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const players: Player[] =
    swrPlayersResponse.data != null ? swrPlayersResponse.data.data.players : [];
  console.log("players", players);

  const playerFields: FieldInsertable[] =
    swrPlayerFieldsResponse.data?.fields ?? [];
    
  // console.log("playerFields", playerFields);

  // ────── CSV CONFIG ─────────────────────────────────────────────
  const csvConfig = mkConfig({
    fieldSeparator: ",",
    decimalSeparator: ".",
    useKeysAsHeaders: true,
  });

  // export all rows (unfiltered/unpaginated)
  const handleExportAll = () => {
    // const csv = generateCsv(csvConfig)(players);
    // download(csvConfig)(csv);
  };

  // export only selected rows
  const handleExportSelected = (rows: MRT_Row<Player>[]) => {
    // const rowData = rows.map((r) => r.original);
    // const csv = generateCsv(csvConfig)(rowData);
    // download(csvConfig)(csv);
  };

  // 1) build the column definitions
   const columns = useMemo<MRT_ColumnDef<Player>[]>(
     () => {
      // 1a) explicit "club" column
      const clubCol: MRT_ColumnDef<Player> = {
        accessorKey: 'club',
        header: t('club_header', 'Club'),
        filterVariant: 'text',
      };

       const fieldCols = playerFields
         .filter((f) => f.include)
         .sort((a, b) => a.position - b.position)
         .map((f) => {
           const col: MRT_ColumnDef<Player> = {
             id: f.key,
             header: f.label,
             accessorFn: (row) => row.data[f.key],
             filterVariant:
               f.type === "TEXT"
                 ? "text"
                 : f.type === "CHECKBOX"
                 ? "checkbox"
                 : f.type === "NUMBER"
                 ? "range"
                 : "multi-select",
           };
           if (f.type === "DROPDOWN") {
             col.filterSelectOptions = f.options;
           }
           if (f.type === "NUMBER") {
             col.filterFn = "between";
           }
           if (f.type === "CHECKBOX") {
             col.accessorFn = (row) => (row.data[f.key] ? "true" : "false");
             col.Cell = ({ cell }) =>
               cell.getValue<string>() === "true" ? t("yes") : t("no");
           }
           return col;
         });

      // if there’s at least one field column, put it first, then club, then the rest
      if (fieldCols.length > 2) {
        return [
          fieldCols[0],
          clubCol,
          ...fieldCols.slice(1),
        ];
      }
      // fallback: no fields at all
      return [clubCol];
      },
     [playerFields, t]
   );

  if (swrPlayersResponse.error || swrPlayerFieldsResponse.error) {
    return (
      <RequestErrorAlert
        error={swrPlayersResponse.error || swrPlayerFieldsResponse.error}
      />
    );
  }

  if (swrPlayersResponse.isLoading || swrPlayerFieldsResponse.isLoading) {
    return <TableSkeletonSingleColumn />;
  }

  if (players.length === 0) {
    return <NoContent title={t("no_players_title")} />;
  }

  // 4) define create/update/delete handlers
  const handleCreate: MaterialReactTableProps<Player>["onCreatingRowSave"] =
    async ({ values, table }) => {
      // values is Record<fieldKey, any>
      await createPlayer(tournamentData.id, values);
      await swrPlayersResponse.mutate();
      table.setCreatingRow(null);
    };

  const handleSave: MaterialReactTableProps<Player>["onEditingRowSave"] =
    async ({ values, row, table }) => {
      await updatePlayer(tournamentData.id, row.original.id, values );
      await swrPlayersResponse.mutate();
      table.setEditingRow(null);
    };

  const handleDelete = (row: MRT_Row<Player>) => {
    if (
      window.confirm(
        t("confirm_delete_message", {
          name: row.original.data.name ?? row.original.id,
        })
      )
    ) {
      deletePlayer(tournamentData.id, row.original.id);
      swrPlayersResponse.mutate();
    }
  };

  // 4) render
  return (
    <>
      <PlayerCreateModal
        swrPlayersResponse={swrPlayersResponse}
        tournament_id={tournamentData.id}
        opened={createModalOpen}
        setOpened={setCreateModalOpen}
      />
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <MaterialReactTable<Player>
          columns={columns}
          data={players}
          enableColumnOrdering
          enableStickyHeader
          enableColumnPinning
          enableRowPinning
          enableRowSelection
          enableEditing
          // enableRowNumbers={true}
          // enableColumnResizing={true}
          rowPinningDisplayMode="select-sticky"
          getRowId={(row) => row.id.toString()}
          renderRowActions={({ row, table }) => (
            <Box sx={{ display: "flex", gap: "0.5rem" }}>
              <Tooltip title={t("edit")}>
                <IconButton
                  size="small"
                  onClick={() => table.setEditingRow(row)}
                >
                  <EditIcon />
                </IconButton>
              </Tooltip>
            </Box>
          )}
          renderTopToolbarCustomActions={({ table }) => {
            const handleRemoveUsers = () => {
              confirm("Are you sure you want to remove the selected players?");
            };

            return (
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mb={2}
              >
                <Tooltip title="Add Player">
                  <IconButton onClick={() => setCreateModalOpen(true)}>
                    <AddBoxIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Remove Player(s)">
                  <span>
                    <IconButton
                      disabled={
                        table.getSelectedRowModel().flatRows.length === 0
                      }
                      onClick={handleRemoveUsers}
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
              {/* export all data */}
              <Button
                startIcon={<FileDownloadIcon />}
                onClick={handleExportAll}
                sx={{ textTransform: "none" }}
              >
                {t("export_all_data", "Export All Data")}
              </Button>

              {/* export selected rows */}
              <Button
                startIcon={<FileDownloadIcon />}
                disabled={!table.getIsSomeRowsSelected()}
                onClick={() =>
                  handleExportSelected(table.getSelectedRowModel().rows)
                }
                sx={{ textTransform: "none" }}
              >
                {t("export_selected_rows", "Export Selected Rows")}
              </Button>
            </Box>
          )}
          initialState={{ showColumnFilters: true }}
        />
      </LocalizationProvider>
    </>
  );
}
