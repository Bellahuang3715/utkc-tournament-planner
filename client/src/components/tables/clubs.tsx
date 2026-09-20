import React, { useMemo, useState } from "react";
import { useTranslation } from "next-i18next/pages";
import { SWRResponse } from "swr";
import {
  MantineReactTable,
  useMantineReactTable,
  type MRT_ColumnDef,
  type MRT_Row,
} from "mantine-react-table-open";
import {
  ActionIcon,
  Anchor,
  Button,
  Group,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { IconMail, IconPencil, IconPlus, IconTrash } from "@tabler/icons-react";
import { CircleFlag } from "react-circle-flags";

import { Club } from "../../interfaces/club";
import { deleteClub } from "../../services/club";
import {
  countryCodeFromName,
  DEFAULT_COUNTRY,
} from "../../utils/countries";
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

  const handleDeleteRows = async (rows: MRT_Row<Club>[]) => {
    if (!rows.length) return;
    const names = rows.map((r) => r.original.name).join(", ");
    const ok = window.confirm(
      t("confirm_delete_message", {
        name: names,
        defaultValue: `Delete ${names}?`,
      }),
    );
    if (!ok) return;
    await Promise.all(rows.map((r) => deleteClub(r.original.id)));
    await swrClubsResponse.mutate();
  };

  const columns = useMemo<MRT_ColumnDef<Club>[]>(
    () => [
      {
        accessorKey: "name",
        header: t("name_header", "Name"),
        Cell: ({ cell }) => (
          <Text fw={600} size="sm">
            {cell.getValue<string>()}
          </Text>
        ),
      },
      {
        accessorKey: "abbreviation",
        header: t("abbreviation_header", "Abbreviation"),
      },
      {
        accessorKey: "country",
        header: t("country_header", "Country"),
        size: 80,
        Cell: ({ cell }) => {
          const country = cell.getValue<string>() || DEFAULT_COUNTRY;
          const code = countryCodeFromName(country);
          return (
            <Tooltip label={country}>
              <span style={{ display: "inline-flex", lineHeight: 0 }}>
                <CircleFlag
                  countryCode={code}
                  height="22"
                  title={country}
                  aria-label={country}
                />
              </span>
            </Tooltip>
          );
        },
      },
      {
        accessorKey: "representative",
        header: t("representative_header", "Representative"),
        Cell: ({ cell }) => cell.getValue<string>() || "—",
      },
      {
        accessorKey: "contact_email",
        header: t("email_header", "Contact Email"),
        enableColumnFilter: false,
        Cell: ({ cell }) => {
          const email = cell.getValue<string>();
          if (!email) return <Text c="dimmed">—</Text>;
          return (
            <Tooltip label={t("send_email", "Send email")}>
              <Anchor
                href={`mailto:${email}`}
                size="sm"
                underline="hover"
                style={{ textDecoration: "none" }}
              >
                <Group gap={6} wrap="nowrap">
                  <IconMail size={16} stroke={1.5} />
                  <Text size="sm" lineClamp={1} maw={180}>
                    {email}
                  </Text>
                </Group>
              </Anchor>
            </Tooltip>
          );
        },
      },
      {
        id: "actions",
        header: t("actions_header", "Actions"),
        enableColumnFilter: false,
        enableSorting: false,
        size: 100,
        Cell: ({ row }) => (
          <Group gap={4} wrap="nowrap">
            <Tooltip label={t("edit_button", "Edit")}>
              <ActionIcon
                variant="subtle"
                color="green"
                aria-label={t("edit_button", "Edit")}
                onClick={() => {
                  setEditingClub(row.original);
                  setModalOpen(true);
                }}
              >
                <IconPencil size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label={t("delete_button", "Delete")}>
              <ActionIcon
                variant="subtle"
                color="red"
                aria-label={t("delete_button", "Delete")}
                onClick={() => void handleDeleteRows([row])}
              >
                <IconTrash size={18} />
              </ActionIcon>
            </Tooltip>
          </Group>
        ),
      },
    ],
    [t],
  );

  const openCreate = () => {
    setEditingClub(null);
    setModalOpen(true);
  };

  const table = useMantineReactTable({
    columns,
    data: clubs,
    getRowId: (row) => String(row.id),
    enableRowSelection: true,
    enableColumnFilters: true,
    enableSorting: true,
    enablePagination: true,
    enableColumnOrdering: true,
    enableColumnPinning: true,
    initialState: {
      density: "xs",
      showColumnFilters: false,
    },
    renderTopToolbarCustomActions: ({ table: tableInstance }) => {
      const selected = tableInstance.getSelectedRowModel().rows;
      return (
        <Group gap="xs">
          <Button
            leftSection={<IconPlus size={16} />}
            variant="filled"
            onClick={openCreate}
          >
            {t("create_club_button", "Add club")}
          </Button>
          <Button
            leftSection={<IconTrash size={16} />}
            variant="light"
            color="red"
            disabled={!selected.length}
            onClick={() => void handleDeleteRows(selected)}
          >
            {t("delete_selected", "Delete selected")}
          </Button>
        </Group>
      );
    },
  });

  if (swrClubsResponse.error) {
    return <RequestErrorAlert error={swrClubsResponse.error} />;
  }
  if (swrClubsResponse.isLoading) {
    return <TableSkeletonSingleColumn />;
  }

  return (
    <>
      <ClubModal
        club={editingClub}
        swrClubsResponse={swrClubsResponse}
        opened={modalOpen}
        setOpened={setModalOpen}
      />
      {clubs.length === 0 ? (
        <Stack gap="md" align="flex-start">
          <EmptyTableInfo entity_name={t("clubs_title", "clubs")} />
          <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
            {t("create_club_button", "Add club")}
          </Button>
        </Stack>
      ) : (
        <MantineReactTable table={table} />
      )}
    </>
  );
}
