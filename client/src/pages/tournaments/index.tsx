import { Stack } from "@mantine/core";
import { GetStaticProps } from "next";
import { useTranslation } from "next-i18next/pages";
import { serverSideTranslations } from "next-i18next/pages/serverSideTranslations";

import TournamentsCardTable from "../../components/card_tables/tournaments";
import { PageHeader } from "../../components/layout/page_header";
import TournamentModal from "../../components/modals/tournament_modal";
import { capitalize } from "../../components/utils/util";
import { getTournaments } from "../../services/adapter";
import Layout from "../_layout";

export default function TournamentsPage() {
  const swrTournamentsResponse = getTournaments();
  const { t } = useTranslation();

  return (
    <Layout>
      <Stack gap="lg">
        <PageHeader
          title={capitalize(t("tournaments_title"))}
          description={t(
            "tournaments_page_subtitle",
            "Create a tournament or open one to manage players, brackets, and scores.",
          )}
          actions={
            <TournamentModal swrTournamentsResponse={swrTournamentsResponse} />
          }
        />
        <TournamentsCardTable swrTournamentsResponse={swrTournamentsResponse} />
      </Stack>
    </Layout>
  );
}

type Props = {};
export const getStaticProps: GetStaticProps<Props> = async ({ locale }) => ({
  props: {
    ...(await serverSideTranslations(locale ?? "en", ["common"])),
  },
});
