import {
  Button,
  Grid,
  Image,
  Modal,
  TextInput,
  Textarea,
} from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { GoPlus } from 'react-icons/go';
import { IconCalendar } from "@tabler/icons-react";
import { useTranslation } from "next-i18next/pages";
import React, { useState } from "react";
import { SWRResponse } from "swr";

import { Tournament } from "../../interfaces/tournament";
import { getBaseApiUrl } from "../../services/adapter";
import { createTournament } from "../../services/tournament";
import SaveButton from "../buttons/save";
import { toIsoFromPicker } from "../utils/datetime";

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
  setOpened,
  swrTournamentsResponse,
}: {
  setOpened: any;
  swrTournamentsResponse: SWRResponse;
}) {
  const { t } = useTranslation();
  const form = useForm({
    initialValues: {
      start_time: new Date(),
      name: "",
      organizer: "",
      location: "",
      description: "",
      dashboard_public: false,
      players_can_be_in_multiple_teams: true,
      auto_assign_courts: true,
    },

    validate: {
      name: (value) =>
        value.length > 0 ? null : t("too_short_name_validation"),
      organizer: (value) =>
        value.trim().length > 0
          ? null
          : t("organizer_enter_title", "Please enter an organizer"),
      location: (value) =>
        value && value.length > 0
          ? null
          : t("location_choose_title", "Please choose a location"),
      start_time: (value) =>
        value != null ? null : t("start_time_choose_title"),
    },
  });

  return (
    <form
      onSubmit={form.onSubmit(async (values) => {
        await createTournament(
          values.organizer,
          values.name,
          values.location,
          values.description,
          toIsoFromPicker(values.start_time),
          values.dashboard_public,
          values.players_can_be_in_multiple_teams,
          values.auto_assign_courts,
        );
        await swrTournamentsResponse.mutate();
        setOpened(false);
      })}
    >
      <TextInput
        withAsterisk
        label={t("name_input_label")}
        placeholder={t("tournament_name_input_placeholder")}
        {...form.getInputProps("name")}
      />

      <TextInput
        withAsterisk
        label={t("organizer_input_label", "Organizer")}
        placeholder={t("organizer_input_placeholder", "Organizer name")}
        mt="lg"
        {...form.getInputProps("organizer")}
      />

      <DateTimePicker
        withAsterisk
        label={t("start_time")}
        leftSection={<IconCalendar size="1.1rem" stroke={1.5} />}
        mt="lg"
        {...form.getInputProps("start_time")}
      />

      <TextInput
        label={t("location_input_label")}
        placeholder={t("location_input_placeholder")}
        mt="lg"
        {...form.getInputProps("location")}
      />

      <Textarea
        label={t("description_input_label")}
        placeholder={t("description_input_placeholder")}
        mt="lg"
        {...form.getInputProps("description")}
      />

      <Grid mt={8}>
        <Grid.Col span={6}>
          <Button fullWidth color="green" type="submit">
            {t("save_button")}
          </Button>
        </Grid.Col>
        <Grid.Col span={6}>
          <Button fullWidth color="red" onClick={() => setOpened(false)}>
            {t("cancel_button")}
          </Button>
        </Grid.Col>
      </Grid>
    </form>
  );
}

export default function TournamentModal({
  swrTournamentsResponse,
}: {
  swrTournamentsResponse: SWRResponse;
}) {
  const { t } = useTranslation();
  const [opened, setOpened] = useState(false);
  const operation_text = t("create_tournament_button");

  return (
    <>
      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title={operation_text}
        size="50rem"
      >
        <GeneralTournamentForm
          setOpened={setOpened}
          swrTournamentsResponse={swrTournamentsResponse}
        />
      </Modal>
      <SaveButton
        mx="0px"
        fullWidth
        onClick={() => setOpened(true)}
        leftSection={<GoPlus size={24} />}
        title={operation_text}
      />
    </>
  );
}
