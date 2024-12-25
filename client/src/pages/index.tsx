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

export default function HomePage() {
  const swrTournamentsResponse = getTournaments();
  const { t } = useTranslation();

  // Mock Tournament Data
  const mockTournaments = [
    {
      id: 1,
      name: "Mock Tournament",
      created: "2024-01-01T00:00:00Z",
      start_time: "2024-02-01T10:00:00Z",
      club_id: 123,
      dashboard_public: true,
      dashboard_endpoint: "/dashboard/mock",
      players_can_be_in_multiple_teams: false,
      auto_assign_courts: true,
      logo_path: "mock-logo.png",
      duration_minutes: 120,
      margin_minutes: 15,
    },
  ];

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
