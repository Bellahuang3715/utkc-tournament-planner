import {
  Button,
  Checkbox,
  Grid,
  Image,
  Modal,
  Select,
  TextInput,
  Textarea,
  Autocomplete
} from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { GoPlus } from 'react-icons/go';
import { IconCalendar } from "@tabler/icons-react";
import assert from "assert";
import { useTranslation } from "next-i18next";
import React, { useState } from "react";
import { SWRResponse } from "swr";

import { Club } from "../../interfaces/club";
import { Tournament } from "../../interfaces/tournament";
import { getBaseApiUrl, getClubs } from "../../services/adapter";
import { createTournament } from "../../services/tournament";
import SaveButton from "../buttons/save";

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
  clubs
}: {
  setOpened: any;
  swrTournamentsResponse: SWRResponse;
  clubs: Club[];
}) {
  const { t } = useTranslation();
  const form = useForm({
    initialValues: {
      start_time: new Date(),
      end_time: new Date(),
      name: "",
      location: "",
      description: "",
      club_id: null,
      auto_assign_courts: true,
    },

    validate: {
      name: (value) =>
        value.length > 0 ? null : t("too_short_name_validation"),
      club_id: (value) => (value != null ? null : t("club_choose_title")),
      location: (value) => (value != null ? null : t("location_choose_title")),
      start_time: (value) =>
        value != null ? null : t("start_time_choose_title"),
      end_time: (value) =>
        value != null ? null : t("end_time_choose_title"),
    },
  });

  return (
    <form
      onSubmit={form.onSubmit(async (values) => {
        assert(values.club_id != null);
        await createTournament(
          parseInt(values.club_id, 10),
          values.name,
          values.location,
          values.description,
          values.start_time.toISOString(),
          values.end_time.toISOString(),
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

      <Select
        withAsterisk
        data={clubs.map((p) => ({ value: `${p.id}`, label: p.name }))}
        label={t('club_select_label')}
        placeholder={t('club_select_placeholder')}
        searchable
        limit={20}
        style={{ marginTop: 10 }}
        {...form.getInputProps('club_id')}
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

      <Grid mt="1rem">
        <Grid.Col span={{ sm: 6 }}>
          <DateTimePicker
            withAsterisk
            label={t("start_time")}
            leftSection={<IconCalendar size="1.1rem" stroke={1.5} />}
            mx="auto"
            {...form.getInputProps("start_time")}
          />
        </Grid.Col>
        <Grid.Col span={{ sm: 6 }}>
          <DateTimePicker
            withAsterisk
            label={t("end_time")}
            leftSection={<IconCalendar size="1.1rem" stroke={1.5} />}
            mx="auto"
            {...form.getInputProps("end_time")}
          />
        </Grid.Col>
      </Grid>

      <Checkbox
        mt="md"
        label={t("dashboard_public_description")}
        {...form.getInputProps("dashboard_public", { type: "checkbox" })}
      />
      <Checkbox
        mt="md"
        label={t("auto_assign_courts_label")}
        {...form.getInputProps("auto_assign_courts", { type: "checkbox" })}
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
  const swrClubsResponse: SWRResponse = getClubs();
  const clubs: Club[] =
    swrClubsResponse.data != null ? swrClubsResponse.data.data : [];

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
          clubs={clubs}
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
