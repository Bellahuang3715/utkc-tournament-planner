import React, { useState, useMemo } from "react";
import { useTranslation } from "next-i18next";
import { SWRResponse } from "swr";
import {
  MaterialReactTable,
  MaterialReactTableProps,
  type MRT_ColumnDef,
  type MRT_Row,
} from "material-react-table";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { Box, IconButton, Tooltip } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { Button, Anchor, Group, Text } from "@mantine/core";
import { BiEditAlt } from "react-icons/bi";
import AddBoxIcon from "@mui/icons-material/AddBox";
import { IconMail } from '@tabler/icons-react';

import { Club } from "../../interfaces/club";
import { deleteClub } from "../../services/club";
import ClubModal from "../modals/club_modal";
import { EmptyTableInfo } from "../no_content/empty_table_info";
import RequestErrorAlert from "../utils/error_alert";
import { TableSkeletonSingleColumn } from "../utils/skeletons";

export default function ClubsTable({
  swrClubsResponse,
}: {
  swrClubsResponse: SWRResponse;
}) {
  const clubs: Club[] =
    swrClubsResponse.data != null ? swrClubsResponse.data.data : [];
  const { t } = useTranslation();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingClub, setEditingClub] = useState<Club | null>(null);

  // column definitions
  const columns = useMemo<MRT_ColumnDef<Club>[]>(
    () => [
      {
        accessorKey: "name",
        header: t("name_header", "Name"),
      },
      {
        accessorKey: "abbreviation",
        header: t("abbreviation_header", "Abbreviation"),
      },
      {
        accessorKey: "representative",
        header: t("representative_header", "Representative"),
        Cell: ({ cell }) => cell.getValue<string>() || "—",
      },
      {
        accessorKey: 'contact_email',
        header: t('email_header', 'Contact Email'),
        enableColumnFilter: false,
        Cell: ({ cell }) => {
          const email = cell.getValue<string>();
          if (!email) {
            return <Text color="dimmed">—</Text>;
          }
          return (
            <Tooltip title={t('send_email', 'Send email')} placement="top" arrow>
              <Anchor href={`mailto:${email}`} size="sm" style={{ textDecoration: 'none' }}>
                <Group gap="xs">
                  <IconMail size={16} stroke={1.5} />
                  <Text
                    lineClamp={1}
                    style={{
                      maxWidth: 150,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {email}
                  </Text>
                </Group>
              </Anchor>
            </Tooltip>
          );
        },
      },
      {
        accessorKey: "updated",
        header: t("updated_header", "Last Updated"),
        Cell: ({ cell }) => (
          <time dateTime={cell.getValue<string>()}>
            {new Date(cell.getValue<string>()).toLocaleString()}
          </time>
        ),
      },
      {
        id: "actions",
        header: t("actions_header", "Actions"),
        enableColumnFilter: false,
        enableSorting: false,
        enableEditing: false,
        size: 120,
        Cell: ({ row }) => (
          <Box sx={{ display: "flex", gap: 8 }}>
            <Tooltip title={t("edit_button", "Edit")}>
              <Button
                color="green"
                size="xs"
                onClick={() => {
                  setEditingClub(row.original);
                  setModalOpen(true);
                }}
                leftSection={<BiEditAlt size={20} />}
              >
                {t("edit_club_title")}
              </Button>
            </Tooltip>
          </Box>
        ),
      },
    ],
    [t, swrClubsResponse]
  );

  const handleDelete = (row: MRT_Row<Club>) => {
    if (
      window.confirm(t("confirm_delete_message", { name: row.original.name }))
    ) {
      deleteClub(row.original.id);
      swrClubsResponse.mutate();
    }
  };

  if (swrClubsResponse.error)
    return <RequestErrorAlert error={swrClubsResponse.error} />;
  if (swrClubsResponse.isLoading) return <TableSkeletonSingleColumn />;
  if (clubs.length === 0)
    return <EmptyTableInfo entity_name={t("clubs_title")} />;

  return (
    <>
      <ClubModal
        club={editingClub}
        swrClubsResponse={swrClubsResponse}
        opened={modalOpen}
        setOpened={setModalOpen}
      />
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <MaterialReactTable<Club>
          columns={columns}
          data={clubs}
          enableColumnOrdering={true}
          enableColumnPinning
          enableColumnFilters
          enableRowSelection
          enableSorting
          enablePagination
          renderTopToolbarCustomActions={({ table }) => {
            const handleRemoveUsers = () => {
              confirm("Are you sure you want to remove the selected team(s)?");
            };

            return (
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mb={2}
              >
                <Tooltip title="Add Team">
                  <IconButton
                    onClick={() => {
                      setEditingClub(null);
                      setModalOpen(true);
                    }}
                  >
                    <AddBoxIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Remove Team(s)">
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
          initialState={{ density: 'compact' }}
        />
      </LocalizationProvider>
    </>
  );
}
