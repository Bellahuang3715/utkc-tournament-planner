import React, { useState } from 'react';
import { MaterialReactTable, type MRT_ColumnDef } from 'material-react-table';
import { useTranslation } from 'next-i18next';

import { getPlayerFields, getDivisionPlayers } from '../../services/adapter';
import { Player } from '../../interfaces/player';
import { FieldInsertable } from '../../interfaces/player_fields';
import RequestErrorAlert from '../utils/error_alert';
import { TableSkeletonSingleColumn } from '../utils/skeletons';
import { NoContent } from '../no_content/empty_table_info';

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

  if (swrPlayerFieldsResponse.error || swrDivisionPlayersResponse.error) {
    return (
      <RequestErrorAlert
        error={swrPlayerFieldsResponse.error || swrDivisionPlayersResponse.error}
      />
    );
  }
  if (swrPlayerFieldsResponse.isLoading || swrDivisionPlayersResponse.isLoading) {
    return <TableSkeletonSingleColumn />;
  }

  const players: Player[] =
    swrDivisionPlayersResponse.data?.data?.players ?? [];
  const playerFields: FieldInsertable[] =
    swrPlayerFieldsResponse.data?.fields ?? [];

  if (players.length === 0) {
    return <NoContent title={t('no_players_title')} />;
  }

  // columns: same as tables/players, but no actions/generator
  const columns = React.useMemo<MRT_ColumnDef<Player>[]>(() => {
    const nameCol: MRT_ColumnDef<Player> = {
      accessorKey: 'name',
      header: t('name_header', 'Name'),
      filterVariant: 'text',
    };
    const clubCol: MRT_ColumnDef<Player> = {
      accessorKey: 'club',
      header: t('club_header', 'Club'),
      filterVariant: 'text',
    };

    const fieldCols: MRT_ColumnDef<Player>[] = playerFields
      .filter((f) => f.include)
      .sort((a, b) => a.position - b.position)
      .map((f) => {
        const col: MRT_ColumnDef<Player> = {
          id: f.key,
          header: f.label,
          accessorFn: (row) => row.data[f.key],
          filterVariant:
            f.type === 'TEXT'
              ? 'text'
              : f.type === 'CHECKBOX'
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
        if (f.type === 'CHECKBOX') {
          col.accessorFn = (row) => (row.data[f.key] ? 'true' : 'false');
          col.Cell = ({ cell }) =>
            cell.getValue<string>() === 'true' ? t('yes') : t('no');
        }
        return col;
      });

    return [nameCol, clubCol, ...fieldCols];
  }, [playerFields, t]);

  return (
    <MaterialReactTable<Player>
      columns={columns}
      data={players}
      enableColumnOrdering
      enableStickyHeader
      enableColumnPinning
      enableRowPinning
      enableRowSelection
      rowPinningDisplayMode="select-sticky"
      getRowId={(row) => row.id.toString()}
      // no row actions, no bottom toolbar buttons here
      initialState={{ showColumnFilters: true }}
    />
  );
}
