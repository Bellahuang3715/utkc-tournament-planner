import { Button, Group, Stack } from "@mantine/core";
import { GetStaticProps } from "next";
import { useTranslation } from "next-i18next/pages";
import { serverSideTranslations } from "next-i18next/pages/serverSideTranslations";
import Link from "next/link";

import TournamentsCardTable from "../components/card_tables/tournaments";
import { PageHeader } from "../components/layout/page_header";
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
      <Stack gap="lg">
        <PageHeader
          title={capitalize(t("tournaments_title"))}
          description={t(
            "tournaments_page_subtitle",
            "Create a tournament or open one to manage players, brackets, and scores.",
          )}
          actions={
            <Group gap="sm" className={classes.fullWithMobile}>
              <Button component={Link} href="/scorekeeping" variant="light">
                Enter scorekeeper code
              </Button>
              <TournamentModal swrTournamentsResponse={swrTournamentsResponse} />
            </Group>
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
