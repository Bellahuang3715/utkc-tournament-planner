import {
  Anchor,
  Autocomplete,
  Button,
  Group,
  PasswordInput,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useTranslation } from "next-i18next/pages";
import { serverSideTranslations } from "next-i18next/pages/serverSideTranslations";
import { useRouter } from "next/router";
import React, { useState } from "react";

import { CircleFlag } from "react-circle-flags";

import { GuestEntryShell } from "../components/layout/guest_entry";
import { useAuth } from "../context/AuthContext";
import { PasswordStrength, passwordMeetsRequirements } from "../components/utils/password";
import { ClientOnly } from "../components/utils/react";
import { HCaptchaInput } from "../components/utils/util";
import { registerUserDb } from "../services/user";
import { COUNTRY_OPTIONS, DEFAULT_COUNTRY, countryCodeFromName } from "../utils/countries";
import { UserToRegisterInterface } from "../interfaces/user";

export const getServerSideProps = async ({ locale = 'en' }: { locale: string }) => ({
  props: {
    ...(await serverSideTranslations(locale, ["common"])),
  },
});

export default function CreateAccount() {
  const router = useRouter();
  const { registerUser } = useAuth();
  const { t } = useTranslation();
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  async function registerAndRedirect(values: UserToRegisterInterface) {
    try {
      const firebaseUser = await registerUser(values.email, values.password, values.name);
      console.log("User registered:", firebaseUser);

      const response = await registerUserDb(values, captchaToken);
      console.log("User registered in database:", response);
      await router.push("/");
    }
    catch (error: any) {
      alert(error.message);
    }
  }

  const form = useForm({
    initialValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      country: DEFAULT_COUNTRY,
    },

    validate: {
      name: (value) => (value !== "" ? null : t("empty_name_validation")),
      email: (value) =>
        /^\S+@\S+$/.test(value) ? null : t("empty_email_validation"),
      password: (value) => {
        if (!value) return t("empty_password_validation");
        return passwordMeetsRequirements(value)
          ? null
          : t("password_requirements_validation", "Password does not meet the requirements");
      },
      confirmPassword: (value, values) =>
        value !== values.password
          ? t("passwords_do_not_match", "Passwords do not match")
          : null,
      country: (value) => (value.trim() !== "" ? null : t("empty_country_validation", "Enter a country")),
    },
  });

  return (
    <GuestEntryShell
      title={t("create_account_title")}
      description="Create an organizer account to run tournaments."
    >
      <form
        onSubmit={form.onSubmit(async ({ confirmPassword: _confirmPassword, ...values }) => {
          await registerAndRedirect(values);
        })}
      >
        <Stack gap="md">
          <TextInput
            size="md"
            label={t("name_input_label")}
            placeholder={t("name_input_placeholder")}
            required
            {...form.getInputProps("name")}
          />
          <TextInput
            size="md"
            label={t("email_input_label")}
            placeholder={t("email_input_placeholder")}
            required
            type="email"
            {...form.getInputProps("email")}
          />
          <Autocomplete
            size="md"
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
                <CircleFlag
                  countryCode={countryCodeFromName(option.value)}
                  height="18"
                />
                <Text size="sm">{option.value}</Text>
              </Group>
            )}
            {...form.getInputProps("country")}
          />
          <PasswordStrength form={form} size="md" />
          <PasswordInput
            size="md"
            label={t("confirm_password_label", "Confirm password")}
            placeholder={t("confirm_password_placeholder", "Confirm password")}
            required
            {...form.getInputProps("confirmPassword")}
          />
          <ClientOnly>
            <HCaptchaInput
              siteKey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY}
              setCaptchaToken={setCaptchaToken}
            />
          </ClientOnly>
          <Button size="md" fullWidth type="submit">
            {t("create_account_button")}
          </Button>
          <Text size="sm" c="dimmed" ta="center">
            Already have an account?{" "}
            <Anchor component="button" type="button" size="sm" onClick={() => router.push("/login")}>
              {t("sign_in_title")}
            </Anchor>
          </Text>
        </Stack>
      </form>
    </GuestEntryShell>
  );
}
