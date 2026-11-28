import { Button, Group, Stack } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "next-i18next/pages";
import { serverSideTranslations } from "next-i18next/pages/serverSideTranslations";

import { PageHeader } from "../components/layout/page_header";
import ClubModal from "../components/modals/club_modal";
import ClubsTable from "../components/tables/clubs";
import { capitalize } from "../components/utils/util";
import { Club } from "../interfaces/club";
import { checkForAuthError, getClubs } from "../services/adapter";
import Layout from "./_layout";
import classes from "./index.module.css";

export default function Clubs() {
  const { t } = useTranslation();
  const swrClubsResponse = getClubs();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClub, setEditingClub] = useState<Club | null>(null);

  const openClub = (club: Club | null) => {
    setEditingClub(club);
    setModalOpen(true);
  };

  checkForAuthError(swrClubsResponse);

  return (
    <Layout>
      <Stack gap="lg">
        <PageHeader
          title={capitalize(t("clubs_title", "Clubs"))}
          description={t(
            "clubs_page_subtitle",
            "Manage dojos and clubs used across tournaments.",
          )}
          actions={
            <Group gap="sm" className={classes.fullWithMobile}>
              <Button
                leftSection={<IconPlus size={16} />}
                onClick={() => openClub(null)}
              >
                {t("create_club_button", "Add club")}
              </Button>
            </Group>
          }
        />
        <ClubsTable swrClubsResponse={swrClubsResponse} onEditClub={openClub} />
        <ClubModal
          club={editingClub}
          swrClubsResponse={swrClubsResponse}
          opened={modalOpen}
          setOpened={setModalOpen}
        />
      </Stack>
    </Layout>
  );
}

export const getServerSideProps = async ({ locale }: { locale: string }) => ({
  props: {
    ...(await serverSideTranslations(locale, ["common"])),
  },
});
