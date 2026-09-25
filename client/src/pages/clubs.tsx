import { Stack } from "@mantine/core";
import { useTranslation } from "next-i18next/pages";
import { serverSideTranslations } from "next-i18next/pages/serverSideTranslations";

import { PageHeader } from "../components/layout/page_header";
import ClubsTable from "../components/tables/clubs";
import { capitalize } from "../components/utils/util";
import { checkForAuthError, getClubs } from "../services/adapter";
import Layout from "./_layout";

export default function Clubs() {
  const { t } = useTranslation();
  const swrClubsResponse = getClubs();

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
        />
        <ClubsTable swrClubsResponse={swrClubsResponse} />
      </Stack>
    </Layout>
  );
}

export const getServerSideProps = async ({ locale }: { locale: string }) => ({
  props: {
    ...(await serverSideTranslations(locale, ["common"])),
  },
});
