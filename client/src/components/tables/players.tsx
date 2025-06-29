import { useTranslation } from 'next-i18next';
import React, { useMemo } from 'react';
import { SWRResponse } from 'swr';
import {
  MaterialReactTable,
  MaterialReactTableProps,
  type MRT_ColumnDef,
  type MRT_Row,
} from 'material-react-table';
import { Box, IconButton, Tooltip } from '@mui/material';
import SaveButton from '../buttons/save';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { IconUserPlus } from '@tabler/icons-react';

import { Player } from '../../interfaces/player';
import {
  createPlayer,
  updatePlayer,
  deletePlayer,
} from '../../services/player';
import { FieldInsertable } from '../../interfaces/player_fields';
import { TournamentMinimal } from '../../interfaces/tournament';
import { NoContent } from '../no_content/empty_table_info';
import RequestErrorAlert from '../utils/error_alert';
import { TableSkeletonSingleColumn } from '../utils/skeletons';

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

  const players: Player[] =
  swrPlayersResponse.data != null ? swrPlayersResponse.data.data.players : [];
  console.log("players", players);

  const playerFields: FieldInsertable[] =
    swrPlayerFieldsResponse.data?.fields ?? [];
  console.log("playerFields", playerFields);

  // 1) build the column definitions
  const columns = useMemo<MRT_ColumnDef<Player>[]>(
    () =>
      playerFields
        .filter((f) => f.include)
        .sort((a, b) => a.position - b.position)
        .map((f) => {
          const col: MRT_ColumnDef<Player> = {
            id: f.key,
            header: f.label,
            accessorFn: (row) => row.data[f.key],
            size: 150,
            // pick filterVariant by field type
            filterVariant:
              f.type === 'TEXT'
                ? 'text'
                : f.type === 'BOOLEAN'
                ? 'checkbox'
                : f.type === 'NUMBER'
                ? 'range'
                : 'multi-select',
          };

          if (f.type === 'DROPDOWN') {
            col.filterSelectOptions = f.options;
          }
          if (f.type === 'NUMBER') {
            col.filterFn = 'between';
          }
          if (f.type === 'BOOLEAN') {
            // MRT expects strings for checkbox filters
            col.accessorFn = (row) => (row.data[f.key] ? 'true' : 'false');
            col.Cell = ({ cell }) =>
              cell.getValue<string>() === 'true'
                ? t('yes')
                : t('no');
          }
          return col;
        }),
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
    return <NoContent title={t('no_players_title')} />;
  }

  // 4) define create/update/delete handlers
  const handleCreate: MaterialReactTableProps<Player>['onCreatingRowSave'] = async ({ values, table }) => {
    // values is Record<fieldKey, any>
    await createPlayer(tournamentData.id, { data: values });
    await swrPlayersResponse.mutate();
    table.setCreatingRow(null);
  };

  const handleSave: MaterialReactTableProps<Player>['onEditingRowSave'] = async ({ values, row, table }) => {
    await updatePlayer(
      tournamentData.id,
      row.original.id,
      { data: values }
    );
    await swrPlayersResponse.mutate();
    table.setEditingRow(null);
  };

  const handleDelete = (row: MRT_Row<Player>) => {
    if (
      window.confirm(
        t('confirm_delete_message', {
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
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <MaterialReactTable<Player>
        columns={columns} 
        data={players}
        getRowId={(row) => row.id.toString()}
        enableEditing
        createDisplayMode="row"
        editDisplayMode="row"
        onCreatingRowSave={handleCreate}
        onEditingRowSave={handleSave}
        renderRowActions={({ row, table }) => (
          <Box sx={{ display: 'flex', gap: '0.5rem' }}>
            <Tooltip title={t('edit')}>
              <IconButton
                size="small"
                onClick={() => table.setEditingRow(row)}
              >
                <EditIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('delete')}>
              <IconButton
                size="small"
                color="error"
                onClick={() => handleDelete(row)}
              >
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </Box>
        )}
        renderTopToolbarCustomActions={({ table }) => (
          <SaveButton
            variant="contained"
            leftSection={<IconUserPlus size={24} />}
            title={t('add_player_button')}
            onClick={() => table.setCreatingRow(true)}
          >
            {t('add_player_button')}
          </SaveButton>
        )}
        initialState={{ showColumnFilters: true }}
      />
    </LocalizationProvider>
  );
}
