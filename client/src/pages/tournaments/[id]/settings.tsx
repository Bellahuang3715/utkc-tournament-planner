import {
  Box,
  Button,
  Checkbox,
  CopyButton,
  Fieldset,
  Group,
  Image,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { MdDelete } from "react-icons/md";
import { IconCalendar, IconCalendarTime, IconCopy, IconRefresh, IconTrash } from "@tabler/icons-react";
import assert from "assert";
import { useTranslation } from "next-i18next/pages";
import { serverSideTranslations } from "next-i18next/pages/serverSideTranslations";
import { useRouter } from "next/router";
import React from "react";
import { SWRResponse, mutate } from "swr";

import { PageHeader } from "../../../components/layout/page_header";
import { toIsoFromPicker } from "../../../components/utils/datetime";
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
  clearScorekeeperToken,
  deleteTournament,
  rotateDashboardPreviewToken,
  rotateScorekeeperToken,
  setTournamentStatus,
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
    },

    validate: {
      name: (value) =>
        value.length > 0 ? null : t("too_short_name_validation"),
      start_time: (value) =>
        value != null ? null : t("start_time_choose_title"),
    },
  });

  return (
    <form
      onSubmit={form.onSubmit(async (values) => {

        await updateTournament(
          tournament.id,
          values.name,
          values.dashboard_public,
          values.dashboard_endpoint ?? "",
          values.players_can_be_in_multiple_teams,
          values.auto_assign_courts,
          toIsoFromPicker(values.start_time),
        );

        await swrTournamentResponse.mutate();
      })}
    >
      <Stack gap="lg">
      <TextInput
        withAsterisk
        label={t("name_input_label")}
        placeholder={t("tournament_name_input_placeholder")}
        {...form.getInputProps("name")}
      />

      <Fieldset legend={t("planning_of_matches_legend")} radius="md">
        <Stack gap="sm">
          <Text fz="sm">{t("planning_of_matches_description")}</Text>
          <Group align="flex-end" wrap="wrap" gap="sm">
            <DateTimePicker
              style={{ flex: "1 1 16rem" }}
              rightSection={<IconCalendar size="1.1rem" stroke={1.5} />}
              {...form.getInputProps("start_time")}
            />
            <Button
              color="indigo"
              leftSection={<IconCalendarTime size="1.1rem" stroke={1.5} />}
              onClick={() => {
                form.setFieldValue("start_time", new Date());
              }}
            >
              {t("set_to_new_button")}
            </Button>
          </Group>
        </Stack>
      </Fieldset>
      <Fieldset legend={t("dashboard_settings_title")} radius="md">
        <Stack gap="sm">
        <Text fz="sm">
          Tournament code for participants (share this — they enter it on the join page)
        </Text>
        <Group align="flex-end" wrap="wrap" gap="sm">
          <TextInput
            style={{ flex: "1 1 12rem" }}
            placeholder={t("dashboard_link_placeholder")}
            {...form.getInputProps("dashboard_endpoint")}
          />
          <CopyButton
            value={form.values.dashboard_endpoint ?? ""}
          >
            {({ copied, copy }) => (
              <Button
                disabled={!form.values.dashboard_endpoint}
                leftSection={<IconCopy size="1.1rem" stroke={1.5} />}
                color={copied ? "teal" : "indigo"}
                onClick={copy}
              >
                {copied ? t("copied_url_button") : "Copy code"}
              </Button>
            )}
          </CopyButton>
        </Group>

        <Text fz="sm" mt="xs">
          Direct participant link
        </Text>
        <CopyButton
          value={
            form.values.dashboard_endpoint
              ? `${getBaseURL()}/t/${form.values.dashboard_endpoint}`
              : ""
          }
        >
          {({ copied, copy }) => (
            <Button
              disabled={!form.values.dashboard_endpoint}
              leftSection={<IconCopy size="1.1rem" stroke={1.5} />}
              variant="light"
              color={copied ? "teal" : "indigo"}
              onClick={copy}
            >
              {copied ? t("copied_url_button") : "Copy participant URL"}
            </Button>
          )}
        </CopyButton>

        <Checkbox
          mt="xs"
          label="Publish participant site (anyone with the public link can view)"
          {...form.getInputProps("dashboard_public", { type: "checkbox" })}
        />

        <Text fz="sm" mt="xs">
          Preview link (works even when unpublished). Share only with staff.
        </Text>
        <Group align="flex-end" wrap="wrap" gap="sm">
          <CopyButton
            value={
              form.values.dashboard_endpoint && tournament.dashboard_preview_token
                ? `${getBaseURL()}/t/${form.values.dashboard_endpoint}?preview=${tournament.dashboard_preview_token}`
                : ""
            }
          >
            {({ copied, copy }) => (
              <Button
                disabled={
                  !form.values.dashboard_endpoint ||
                  !tournament.dashboard_preview_token
                }
                leftSection={<IconCopy size="1.1rem" stroke={1.5} />}
                color={copied ? "teal" : "gray"}
                variant="light"
                onClick={copy}
              >
                {copied ? t("copied_url_button") : "Copy preview URL"}
              </Button>
            )}
          </CopyButton>
          <Button
            variant="outline"
            color="orange"
            leftSection={<IconRefresh size="1.1rem" stroke={1.5} />}
            onClick={async () => {
              await rotateDashboardPreviewToken(tournament.id);
              await swrTournamentResponse.mutate();
            }}
          >
            Regenerate preview
          </Button>
        </Group>
        <Text size="xs" c="dimmed">
          Regenerating invalidates the previous preview link immediately.
        </Text>
        </Stack>
      </Fieldset>

      <Fieldset legend="Scorekeeper access" radius="md">
        <Stack gap="sm">
        <Text fz="sm">
          Share this code with volunteers. They enter it at /scorekeeping to
          open the scores page only (no account required).
        </Text>
        <Group align="flex-end" wrap="wrap" gap="sm">
          <CopyButton value={tournament.scorekeeper_token ?? ""}>
            {({ copied, copy }) => (
              <Button
                disabled={!tournament.scorekeeper_token}
                leftSection={<IconCopy size="1.1rem" stroke={1.5} />}
                color={copied ? "teal" : "indigo"}
                variant="light"
                onClick={copy}
              >
                {copied
                  ? t("copied_url_button")
                  : tournament.scorekeeper_token
                    ? "Copy access code"
                    : "No code yet"}
              </Button>
            )}
          </CopyButton>
          <Button
            variant="outline"
            color="orange"
            leftSection={<IconRefresh size="1.1rem" stroke={1.5} />}
            onClick={async () => {
              await rotateScorekeeperToken(tournament.id);
              await swrTournamentResponse.mutate();
            }}
          >
            {tournament.scorekeeper_token ? "Rotate code" : "Generate code"}
          </Button>
          <Button
            variant="outline"
            color="red"
            disabled={!tournament.scorekeeper_token}
            leftSection={<IconTrash size="1.1rem" stroke={1.5} />}
            onClick={async () => {
              await clearScorekeeperToken(tournament.id);
              await swrTournamentResponse.mutate();
            }}
          >
            Disable
          </Button>
        </Group>
        <Text size="xs" c="dimmed">
          Rotating or disabling invalidates the code immediately. After the
          tournament, disable or rotate so volunteers lose access.
        </Text>
        </Stack>
      </Fieldset>

      <Fieldset legend="Logo" radius="md">
        <Stack gap="sm">
        <DropzoneButton
          tournamentId={tournament.id}
          swrResponse={swrTournamentResponse}
          variant="tournament"
        />
        <Box maw={240}>
          <TournamentLogo tournament={tournament} />
        </Box>
        <Button
          variant="outline"
          color="red"
          onClick={async () => {
            await removeTournamentLogo(tournament.id);
            await swrTournamentResponse.mutate();
          }}
        >
          {t("remove_logo")}
        </Button>
        </Stack>
      </Fieldset>

      <Fieldset legend={t("status", "Status")} radius="md">
        <Stack gap="sm">
        <Text size="sm">
          {(tournament.status ?? "active") === "archived"
            ? t(
                "tournament_archived_note",
                "This tournament is archived. It shows in the Archived section on the home page until you restore it.",
              )
            : t(
                "tournament_active_note",
                "This tournament is active. Archiving moves it to the Archived section on the home page. You can still open it and restore it later.",
              )}
        </Text>
        <Button
          type="button"
          variant="default"
          onClick={async () => {
            const archived = (tournament.status ?? "active") === "archived";
            const next = archived ? "active" : "archived";
            const message = archived
              ? t("confirm_restore_tournament", "Restore this tournament to Active?")
              : t(
                  "confirm_archive_tournament",
                  "Archive this tournament? You can restore it later.",
                );
            if (!confirm(message)) return;
            await setTournamentStatus(tournament.id, next);
            await swrTournamentResponse.mutate();
            await mutate("tournaments");
          }}
        >
          {(tournament.status ?? "active") === "archived"
            ? t("restore_tournament", "Restore to Active")
            : t("archive_tournament", "Archive tournament")}
        </Button>
        </Stack>
      </Fieldset>

      <Group>
        <Button color="green" type="submit">
          {t("save_button")}
        </Button>
        <Button
          variant="outline"
          color="red"
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
      </Group>
      </Stack>
    </form>
  );
}

export default function SettingsPage() {
  const { t } = useTranslation();
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
      <Stack gap="lg" maw={640} w="100%" mx="auto">
        <PageHeader
          title={t("tournament_setting_title", "Settings")}
          description={t(
            "settings_page_subtitle",
            "Name, dates, public page, scorekeeper access, and archive status.",
          )}
        />
        {content}
      </Stack>
    </TournamentLayout>
  );
}

export const getServerSideProps = async ({ locale }: { locale: string }) => ({
  props: {
    ...(await serverSideTranslations(locale ?? "en", ["common"])),
  },
});
