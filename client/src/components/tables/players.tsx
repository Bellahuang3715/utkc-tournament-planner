import { Badge, Center, Pagination, Table, Text, TextInput,
  NumberInput,
  MultiSelect,
  Checkbox, } from '@mantine/core';
import { useTranslation } from 'next-i18next';
import React from 'react';
import { SWRResponse } from 'swr';

import { Player } from '../../interfaces/player';
import { FieldInsertable } from '../../interfaces/player_fields';
import { TournamentMinimal } from '../../interfaces/tournament';
import { deletePlayer } from '../../services/player';
import DeleteButton from '../buttons/delete';
import PlayerUpdateModal from '../modals/player_update_modal';
import { NoContent } from '../no_content/empty_table_info';
import RequestErrorAlert from '../utils/error_alert';
import { TableSkeletonSingleColumn } from '../utils/skeletons';
import TableLayout, { TableState, ThNotSortable, ThSortable, sortTableEntries } from './table';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  ColumnDef,
  FilterFn,
} from '@tanstack/react-table';

export default function PlayersTable({
  swrPlayersResponse,
  swrPlayerFieldsResponse,
  tournamentData,
  tableState,
  playerCount,
}: {
  swrPlayersResponse: SWRResponse;
  swrPlayerFieldsResponse: SWRResponse;
  tournamentData: TournamentMinimal;
  tableState: TableState;
  playerCount: number;
}) {
  const { t } = useTranslation();

  const players: Player[] =
  swrPlayersResponse.data != null ? swrPlayersResponse.data.data.players : [];
  console.log("players", players);

  const playerFields: FieldInsertable[] =
    swrPlayerFieldsResponse.data?.fields ?? [];
  console.log("playerFields", playerFields);

  if (swrPlayersResponse.error) return <RequestErrorAlert error={swrPlayersResponse.error} />;

  if (swrPlayersResponse.isLoading) {
    return <TableSkeletonSingleColumn />;
  }

  const columns =  playerFields.filter((f) => f.include).sort((a, b) => a.position - b.position)

  function renderCell(value: any) {
    if (value === null || value === undefined) return '—';
    return String(value);
  }

  const rows = players
    .sort((p1: Player, p2: Player) => sortTableEntries(p1, p2, tableState))
    .map((player) => (
      <Table.Tr key={player.id}>
        {columns.map((col) => (
          <Table.Td key={col.key}>
            {renderCell(player.data[col.key])}
          </Table.Td>
        ))}
        <Table.Td>
          <PlayerUpdateModal
            swrPlayersResponse={swrPlayersResponse}
            tournament_id={tournamentData.id}
            player={player}
          />
          <DeleteButton
            onClick={async () => {
              await deletePlayer(tournamentData.id, player.id);
              await swrPlayersResponse.mutate();
            }}
            title={t('delete_player_button')}
          />
        </Table.Td>
      </Table.Tr>
    ));

  if (rows.length < 1) return <NoContent title={t('no_players_title')} />;

  return (
    <>
      <TableLayout miw={900}>
        <Table.Thead>
          <Table.Tr>
            {columns.map((col) => (
              <ThSortable
                key={col.key}
                state={tableState}
                field={col.key}
              >
                {col.label}
              </ThSortable>
            ))}
            <ThNotSortable>{null}</ThNotSortable>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>{rows}</Table.Tbody>
      </TableLayout>
      <Center mt="1rem">
        <Pagination
          value={tableState.page}
          onChange={tableState.setPage}
          total={1 + playerCount / tableState.pageSize}
          size="lg"
        />
      </Center>
    </>
  );
}
