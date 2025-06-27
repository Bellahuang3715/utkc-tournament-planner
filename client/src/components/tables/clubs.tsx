import React, { useState } from "react";
import { Table, Center, Text, Modal, Group, Button } from "@mantine/core";
import { useTranslation } from "next-i18next";
import { SWRResponse } from "swr";

import { Club } from "../../interfaces/club";
import { deleteClub } from "../../services/club";
import DeleteButton from "../buttons/delete";
import ClubModal from "../modals/club_modal";
import { EmptyTableInfo } from "../no_content/empty_table_info";
import RequestErrorAlert from "../utils/error_alert";
import { TableSkeletonSingleColumn } from "../utils/skeletons";
import { DateTime } from "../utils/datetime";
import TableLayout, {
  ThNotSortable,
  ThSortable,
  getTableState,
  sortTableEntries,
} from "./table";

export default function ClubsTable({
  swrClubsResponse,
}: {
  swrClubsResponse: SWRResponse;
}) {
  const clubs: Club[] =
    swrClubsResponse.data != null ? swrClubsResponse.data.data : [];
  const tableState = getTableState("name");
  const { t } = useTranslation();

  // state for confirmation modal
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [clubToDelete, setClubToDelete] = useState<Club | null>(null);

  const openConfirm = (club: Club) => {
    setClubToDelete(club);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (clubToDelete) {
      await deleteClub(clubToDelete.id);
      await swrClubsResponse.mutate();
    }
    setConfirmOpen(false);
    setClubToDelete(null);
  };

  if (swrClubsResponse.error)
    return <RequestErrorAlert error={swrClubsResponse.error} />;
  if (swrClubsResponse.isLoading) return <TableSkeletonSingleColumn />;
  if (clubs.length === 0)
    return <EmptyTableInfo entity_name={t("clubs_title")} />;

  const rows = clubs
    .sort((a, b) => sortTableEntries(a, b, tableState))
    .map((club) => (
      <Table.Tr key={club.id}>
        <Table.Td>{club.name}</Table.Td>
        <Table.Td>{club.abbreviation}</Table.Td>
        <Table.Td>{club.representative ?? "—"}</Table.Td>
        <Table.Td>
          {club.contact_email ? (
            <a href={`mailto:${club.contact_email}`}>{club.contact_email}</a>
          ) : (
            "—"
          )}
        </Table.Td>
        <Table.Td>
          <DateTime datetime={club.updated} />
        </Table.Td>
        <Table.Td>
          <ClubModal swrClubsResponse={swrClubsResponse} club={club} />
          <DeleteButton
            onClick={() => openConfirm(club)}
            title={t("delete_button")}
          />
        </Table.Td>
      </Table.Tr>
    ));

  return (
    <>
      <TableLayout>
        <Table.Thead>
          <Table.Tr>
            <ThSortable state={tableState} field="name">
              {t("name_header", "Name")}
            </ThSortable>
            <ThSortable state={tableState} field="abbreviation">
              {t("abbreviation_header", "Abbreviation")}
            </ThSortable>
            <ThSortable state={tableState} field="representative">
              {t("representative_header", "Representative")}
            </ThSortable>
            <ThSortable state={tableState} field="contact_email">
              {t("email_header", "Contact Email")}
            </ThSortable>
            <ThSortable state={tableState} field="updated">
              {t("updated_header", "Last Updated")}
            </ThSortable>
            <ThNotSortable>{null}</ThNotSortable>
          </Table.Tr>
        </Table.Thead>

        <Table.Tbody>{rows}</Table.Tbody>
      </TableLayout>

      {/* Confirmation Modal */}
      <Modal
        opened={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={t("confirm_delete_title", "Confirm deletion")}
        centered
      >
        <Text mb="md">
          {t(
            "confirm_delete_message",
            'Are you sure you want to delete "{name}"?',
            { name: clubToDelete?.name }
          )}
        </Text>
        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={() => setConfirmOpen(false)}>
            {t("no", "No")}
          </Button>
          <Button color="red" onClick={handleConfirmDelete}>
            {t("yes", "Yes")}
          </Button>
        </Group>
      </Modal>
    </>
  );
}
