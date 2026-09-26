import {
  Autocomplete,
  Button,
  Container,
  Group,
  Paper,
  Text,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { showNotification } from "@mantine/notifications";
import { useTranslation } from "next-i18next/pages";
import { useRouter } from "next/router";
import React, { useState } from "react";
import { CircleFlag } from "react-circle-flags";

import { useAuth } from "../../context/AuthContext";
import { registerGoogleUser } from "../../services/user";
import { COUNTRY_OPTIONS, DEFAULT_COUNTRY, countryCodeFromName } from "../../utils/countries";

export default function FinishSignup({ onComplete }: { onComplete: () => void }) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const form = useForm({
    initialValues: { country: DEFAULT_COUNTRY },
    validate: {
      country: (value: string) =>
        value.trim() !== "" ? null : t("empty_country_validation", "Enter a country"),
    },
  });

  return (
    <Container size={460} my={80}>
      <Title order={2} ta="center">
        {t("finish_signup_title", "Finish creating your account")}
      </Title>
      <Text c="dimmed" size="sm" ta="center" mt="sm">
        {t(
          "finish_signup_subtitle",
          "Signed in as {{email}}. Choose a country so we can set up your clubs.",
          { email: user?.email ?? "" },
        )}
      </Text>
      <Paper withBorder shadow="md" p={30} radius="md" mt="xl">
        <form
          onSubmit={form.onSubmit(async (values) => {
            setSaving(true);
            try {
              await registerGoogleUser(values.country);
              onComplete();
            } catch (error: any) {
              const detail = error?.response?.data?.detail;
              showNotification({
                color: "red",
                title: t("login_error_title", "Could not create account"),
                message: typeof detail === "string" ? detail : error?.message,
              });
            } finally {
              setSaving(false);
            }
          })}
        >
          <Autocomplete
            label={t("country_input_label", "Country")}
            placeholder={t("country_input_placeholder", "Start typing a country")}
            description={t(
              "register_country_description",
              "Canadian accounts start with the default club list. You can edit or delete those clubs later.",
            )}
            data={COUNTRY_OPTIONS.map((c) => c.name)}
            limit={12}
            required
            comboboxProps={{ withinPortal: true }}
            leftSection={
              <CircleFlag
                countryCode={countryCodeFromName(form.values.country)}
                height="16"
                style={{ pointerEvents: "none" }}
              />
            }
            renderOption={({ option }) => (
              <Group gap="sm" wrap="nowrap">
                <CircleFlag countryCode={countryCodeFromName(option.value)} height="18" />
                <Text size="sm">{option.value}</Text>
              </Group>
            )}
            {...form.getInputProps("country")}
          />
          <Button fullWidth mt="xl" type="submit" loading={saving}>
            {t("finish_signup_button", "Continue")}
          </Button>
          <Button
            fullWidth
            mt="sm"
            variant="subtle"
            color="gray"
            type="button"
            onClick={() => logout(t, router)}
          >
            {t("finish_signup_switch_account", "Use a different account")}
          </Button>
        </form>
      </Paper>
    </Container>
  );
}
