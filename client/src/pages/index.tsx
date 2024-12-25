import { Grid, Title } from "@mantine/core";
import { GetStaticProps } from "next";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { SWRResponse } from "swr";

import TournamentsCardTable from "../components/card_tables/tournaments";
import TournamentModal from "../components/modals/tournament_modal";
import { capitalize } from "../components/utils/util";
import { getTournaments } from "../services/adapter";
import Layout from "./_layout";
import classes from "./index.module.css";
import { mockTournaments } from "../data/mock_tournaments";

export default function HomePage() {
  const swrTournamentsResponse = getTournaments();
  const { t } = useTranslation();

  // Mimic SWRResponse structure
  const mockSWRResponse: SWRResponse = {
    data: { data: mockTournaments },
    error: null,
    isLoading: false,
    mutate: async () => Promise.resolve(),
    isValidating: false,
  };

  return (
    <Layout>
      <Grid justify="space-between">
        <Grid.Col span="auto">
          <Title>{capitalize(t("tournaments_title"))}</Title>
        </Grid.Col>
        <Grid.Col span="content" className={classes.fullWithMobile}>
          <TournamentModal swrTournamentsResponse={swrTournamentsResponse} />
        </Grid.Col>
      </Grid>
      {/* <TournamentsCardTable swrTournamentsResponse={swrTournamentsResponse} /> */}
      <TournamentsCardTable swrTournamentsResponse={mockSWRResponse} />
    </Layout>
  );
}

type Props = {};
export const getStaticProps: GetStaticProps<Props> = async ({ locale }) => ({
  props: {
    ...(await serverSideTranslations(locale ?? "en", ["common"])),
  },
});
