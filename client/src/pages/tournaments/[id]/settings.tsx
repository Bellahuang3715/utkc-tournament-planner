import {
  Button,
  Center,
  Checkbox,
  Container,
  CopyButton,
  Fieldset,
  Grid,
  Image,
  NumberInput,
  Text,
  TextInput,
} from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { MdDelete } from "react-icons/md";
import { IconCalendar, IconCalendarTime, IconCopy } from "@tabler/icons-react";
import assert from "assert";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useRouter } from "next/router";
import React from "react";
import { SWRResponse } from "swr";

import NotFoundTitle from "../../404";
import { DropzoneButton } from "../../../components/utils/file_upload";
import { GenericSkeletonThreeRows } from "../../../components/utils/skeletons";
import {
  getBaseURL,
  getTournamentIdFromRouter,
} from "../../../components/utils/util";
import { Tournament } from "../../../interfaces/tournament";
import {
  getBaseApiUrl,
  getTournamentById,
  handleRequestError,
  removeTournamentLogo,
} from "../../../services/adapter";
import {
  deleteTournament,
  updateTournament,
} from "../../../services/tournament";
import TournamentLayout from "../_tournament_layout";


export function TournamentLogo({
  tournament,
}: {
  tournament: Tournament | null;
}) {
  if (tournament == null || tournament.logo_path == null) return null;
  return (
    <Image
      radius="md"
      src={`${getBaseApiUrl()}/static/tournament-logos/${tournament.logo_path}`}
    />
  );
}

function GeneralTournamentForm({
  tournament,
  swrTournamentResponse,
}: {
  tournament: Tournament;
  swrTournamentResponse: SWRResponse;
}) {
  const router = useRouter();
  const { t } = useTranslation();

  const form = useForm({
    initialValues: {
      start_time: new Date(tournament.start_time),
      name: tournament.name,
      dashboard_public: tournament.dashboard_public,
      dashboard_endpoint: tournament.dashboard_endpoint,
      players_can_be_in_multiple_teams:
        tournament.players_can_be_in_multiple_teams,
      auto_assign_courts: tournament.auto_assign_courts,
      duration_minutes: tournament.duration_minutes,
      margin_minutes: tournament.margin_minutes,
    },

    validate: {
      name: (value) =>
        value.length > 0 ? null : t("too_short_name_validation"),
      start_time: (value) =>
        value != null ? null : t("start_time_choose_title"),
      duration_minutes: (value) =>
        value != null && value > 0 ? null : t("duration_minutes_choose_title"),
      margin_minutes: (value) =>
        value != null && value > 0 ? null : t("margin_minutes_choose_title"),
    },
  });

  return (
    <form
      onSubmit={form.onSubmit(async (values) => {

        await updateTournament(
          tournament.id,
          values.name,
          values.dashboard_public,
          values.dashboard_endpoint,
          values.players_can_be_in_multiple_teams,
          values.auto_assign_courts,
          values.start_time.toISOString(),
          values.duration_minutes,
          values.margin_minutes
        );

        await swrTournamentResponse.mutate();
      })}
    >
      <TextInput
        withAsterisk
        label={t("name_input_label")}
        placeholder={t("tournament_name_input_placeholder")}
        {...form.getInputProps("name")}
      />

      <Fieldset legend={t("planning_of_matches_legend")} mt="lg" radius="md">
        <Text fz="sm">{t("planning_of_matches_description")}</Text>
        <Grid>
          <Grid.Col span={{ sm: 9 }}>
            <DateTimePicker
              rightSection={<IconCalendar size="1.1rem" stroke={1.5} />}
              mx="auto"
              {...form.getInputProps("start_time")}
            />
          </Grid.Col>
          <Grid.Col span={{ sm: 3 }}>
            <Button
              fullWidth
              color="indigo"
              leftSection={<IconCalendarTime size="1.1rem" stroke={1.5} />}
              onClick={() => {
                form.setFieldValue("start_time", new Date());
              }}
            >
              {t("set_to_new_button")}
            </Button>
          </Grid.Col>
        </Grid>

        <Grid>
          <Grid.Col span={{ sm: 6 }}>
            <NumberInput
              label={t("match_duration_label")}
              mt="lg"
              {...form.getInputProps("duration_minutes")}
            />
          </Grid.Col>
          <Grid.Col span={{ sm: 6 }}>
            <NumberInput
              label={t("time_between_matches_label")}
              mt="lg"
              {...form.getInputProps("margin_minutes")}
            />
          </Grid.Col>
        </Grid>
      </Fieldset>
      <Fieldset legend={t("dashboard_settings_title")} mt="lg" radius="md">
        <Text fz="sm">{t("dashboard_link_label")}</Text>
        <Grid>
          <Grid.Col span={{ sm: 9 }}>
            <TextInput
              placeholder={t("dashboard_link_placeholder")}
              {...form.getInputProps("dashboard_endpoint")}
            />
          </Grid.Col>
          <Grid.Col span={{ sm: 3 }}>
            <CopyButton
              value={`${getBaseURL()}/tournaments/${
                tournament.dashboard_endpoint
              }/dashboard`}
            >
              {({ copied, copy }) => (
                <Button
                  disabled={form.values.dashboard_endpoint === ""}
                  leftSection={<IconCopy size="1.1rem" stroke={1.5} />}
                  fullWidth
                  color={copied ? "teal" : "indigo"}
                  onClick={copy}
                >
                  {copied ? t("copied_url_button") : t("copy_url_button")}
                </Button>
              )}
            </CopyButton>
          </Grid.Col>
        </Grid>

        <Checkbox
          mt="lg"
          label={t("dashboard_public_description")}
          {...form.getInputProps("dashboard_public", { type: "checkbox" })}
        />

        <DropzoneButton
          tournamentId={tournament.id}
          swrResponse={swrTournamentResponse}
          variant="tournament"
        />
        <Center my="lg">
          <div style={{ width: "50%" }}>
            <TournamentLogo tournament={tournament} />
          </div>
        </Center>
        <Button
          variant="outline"
          color="red"
          fullWidth
          onClick={async () => {
            await removeTournamentLogo(tournament.id);
            await swrTournamentResponse.mutate();
          }}
        >
          {t("remove_logo")}
        </Button>
      </Fieldset>
      <Fieldset legend={t("miscellaneous_title")} mt="lg" radius="md">
        <Checkbox
          label={t("miscellaneous_label")}
          {...form.getInputProps("players_can_be_in_multiple_teams", {
            type: "checkbox",
          })}
        />
        <Checkbox
          mt="md"
          label={t("auto_assign_courts_label")}
          {...form.getInputProps("auto_assign_courts", { type: "checkbox" })}
        />
      </Fieldset>

      <Button fullWidth mt={24} color="green" type="submit">
        {t("save_button")}
      </Button>

      <Button
        fullWidth
        variant="outline"
        mt="sm"
        color="red"
        size="sm"
        leftSection={<MdDelete size={20} />}
        onClick={async () => {
          await deleteTournament(tournament.id)
            .then(async () => {
              await router.push("/");
            })
            .catch((response: any) => handleRequestError(response));
        }}
      >
        {t("delete_tournament_button")}
      </Button>
    </form>
  );
}

export default function SettingsPage() {
  const { tournamentData } = getTournamentIdFromRouter();
  const swrTournamentResponse = getTournamentById(tournamentData.id);
  const tournamentDataFull =
    swrTournamentResponse.data != null ? swrTournamentResponse.data.data : null;

  let content = <NotFoundTitle />;

  if (swrTournamentResponse.isLoading) {
    content = <GenericSkeletonThreeRows />;
  }

  if (tournamentDataFull != null) {
    content = (
      <GeneralTournamentForm
        tournament={tournamentDataFull}
        swrTournamentResponse={swrTournamentResponse}
      />
    );
  }

  return (
    <TournamentLayout tournament_id={tournamentData.id}>
      <Container>{content}</Container>
    </TournamentLayout>
  );
}

export const getServerSideProps = async ({ locale }: { locale: string }) => ({
  props: {
    ...(await serverSideTranslations(locale ?? "en", ["common"])),
  },
});
