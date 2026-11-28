import { useMemo } from "react";
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
  Group,
  Text,
  Tooltip,
} from "@mantine/core";
import { IconMail, IconPencil, IconTrash } from "@tabler/icons-react";
import { CircleFlag } from "react-circle-flags";

import { editIconAction, removeIconAction } from "../buttons/action_styles";
import { Club } from "../../interfaces/club";
import { requestSucceeded } from "../../services/adapter";
import { deleteClub } from "../../services/club";
import {
  countryCodeFromName,
  DEFAULT_COUNTRY,
} from "../../utils/countries";
import { EmptyTableInfo } from "../no_content/empty_table_info";
import RequestErrorAlert from "../utils/error_alert";
import { TableSkeletonSingleColumn } from "../utils/skeletons";
import {
  RosterSelectionAction,
  rosterTableInitialState,
  rosterTablePresentation,
} from "./roster_actions";
export default function ClubsTable({
  swrClubsResponse,
  onEditClub,
}: {
  swrClubsResponse: SWRResponse;
  onEditClub: (club: Club) => void;
}) {
  const clubs: Club[] =
    swrClubsResponse.data != null ? swrClubsResponse.data.data : [];
  const { t } = useTranslation();

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
    const results = await Promise.all(rows.map((r) => deleteClub(r.original.id)));
    // deleteClub already toasts API errors; only refresh when at least one delete succeeded.
    if (results.some((result) => result != null && requestSucceeded(result))) {
      await swrClubsResponse.mutate();
    }
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
                {...editIconAction}
                aria-label={t("edit_button", "Edit")}
                onClick={() => onEditClub(row.original)}
              >
                <IconPencil size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label={t("delete_button", "Delete")}>
              <ActionIcon
                {...removeIconAction}
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
    [onEditClub, t],
  );

  const table = useMantineReactTable({
    ...rosterTablePresentation,
    columns,
    data: clubs,
    getRowId: (row) => String(row.id),
    enableRowSelection: true,
    selectAllMode: "all",
    enableColumnFilters: true,
    enableSorting: true,
    enablePagination: true,
    enableColumnOrdering: true,
    enableColumnPinning: true,
    initialState: {
      ...rosterTableInitialState,
      showColumnFilters: false,
    },
    renderTopToolbarCustomActions: ({ table: tableInstance }) => {
      const selected = tableInstance.getSelectedRowModel().rows;
      return (
        <RosterSelectionAction
          showIcon
          disabled={!selected.length}
          onClick={() => void handleDeleteRows(selected)}
        >
          {t("delete_selected", "Delete selected")}
        </RosterSelectionAction>
      );
    },
  });

  if (swrClubsResponse.error) {
    return <RequestErrorAlert error={swrClubsResponse.error} />;
  }
  if (swrClubsResponse.isLoading) {
    return <TableSkeletonSingleColumn />;
  }

  if (clubs.length === 0) {
    return <EmptyTableInfo entity_name={t("clubs_title", "clubs")} />;
  }

  return <MantineReactTable table={table} />;
}
