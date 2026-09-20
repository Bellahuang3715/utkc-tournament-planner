import { Group, Stack, Text, Title } from "@mantine/core";
import { useTranslation } from "next-i18next/pages";
import { serverSideTranslations } from "next-i18next/pages/serverSideTranslations";

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
        <Stack gap={4}>
          <Group justify="space-between" align="flex-end" wrap="wrap">
            <Title order={2}>{capitalize(t("clubs_title", "Clubs"))}</Title>
          </Group>
          <Text size="sm" c="dimmed" maw={520}>
            {t(
              "clubs_page_subtitle",
              "Manage dojos/clubs used across tournaments",
            )}
          </Text>
        </Stack>
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
