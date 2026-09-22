import { Button, Grid, Group, Title } from "@mantine/core";
import { GetStaticProps } from "next";
import { useTranslation } from "next-i18next/pages";
import { serverSideTranslations } from "next-i18next/pages/serverSideTranslations";
import Link from "next/link";

import TournamentsCardTable from "../components/card_tables/tournaments";
import TournamentModal from "../components/modals/tournament_modal";
import { capitalize } from "../components/utils/util";
import { getTournaments } from "../services/adapter";
import Layout from "./_layout";
import classes from "./index.module.css";

export default function HomePage() {
  const swrTournamentsResponse = getTournaments();
  const { t } = useTranslation();

  return (
    <Layout>
      <Grid justify="space-between" align="center">
        <Grid.Col span="auto">
          <Title>{capitalize(t("tournaments_title"))}</Title>
        </Grid.Col>
        <Grid.Col span="content" className={classes.fullWithMobile}>
          <Group gap="sm">
            <Button component={Link} href="/scorekeeping" variant="light">
              Enter scorekeeper code
            </Button>
            <TournamentModal swrTournamentsResponse={swrTournamentsResponse} />
          </Group>
        </Grid.Col>
      </Grid>
      <TournamentsCardTable swrTournamentsResponse={swrTournamentsResponse} />
    </Layout>
  );
}

type Props = {};
export const getStaticProps: GetStaticProps<Props> = async ({ locale }) => ({
  props: {
    ...(await serverSideTranslations(locale ?? "en", ["common"])),
  },
});
