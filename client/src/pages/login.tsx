import {
  Anchor,
  Button,
  Divider,
  PasswordInput,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { showNotification } from "@mantine/notifications";
import { IconCheck } from "@tabler/icons-react";
import { useTranslation } from "next-i18next/pages";
import { serverSideTranslations } from "next-i18next/pages/serverSideTranslations";
import { useRouter } from "next/router";
import React, { useEffect } from "react";

import { GuestEntryShell } from "../components/layout/guest_entry";
import { useAuth } from "../context/AuthContext";
import { auth } from "../services/firebase";

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.59.102-1.167.282-1.707V4.961H.957A9 9 0 0 0 0 9c0 1.45.348 2.825.957 4.039l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}

export default function Login() {
  const router = useRouter();
  const { t } = useTranslation();
  const { loginWithEmailAndPassword, loginWithGoogle } = useAuth();

  useEffect(() => {
    // Check if user is already logged in, redirect to homepage
    if (auth.currentUser) {
      router.replace("/");
    }
  }, [router]);

  const attemptLogin = async (email: string, password: string) => {
    try {
      const user = await loginWithEmailAndPassword(email, password);
      showNotification({
        color: "green",
        title: t("login_success_title"),
        icon: <IconCheck />,
        message: "",
      });
      await router.push("/");
    } catch (error) {
      console.error("Login error:", error);
      showNotification({
        color: "red",
        title: t("login_error_title"),
        message: t("login_error_message"),
      });
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const user = await loginWithGoogle();
      showNotification({
        color: "green",
        title: t("login_success_title"),
        icon: <IconCheck />,
        message: "",
      });
      await router.push("/");
    } catch (error) {
      console.error("Google login error:", error);
      showNotification({
        color: "red",
        title: t("login_error_title"),
        message: t("google_login_error_message"),
      });
    }
  };

  const form = useForm({
    initialValues: {
      email: "",
      password: "",
    },

    validate: {
      email: (value) =>
        /^\S+@\S+$/.test(value) ? null : t("invalid_email_validation"),
      password: (value) =>
        value.length >= 8 ? null : t("invalid_password_validation"),
    },
  });

  return (
    <GuestEntryShell
      title={t("sign_in_title")}
      description="Log in to create and manage tournaments."
    >
      <Stack gap="md">
        <Button
          size="md"
          fullWidth
          type="button"
          variant="default"
          leftSection={<GoogleMark />}
          onClick={handleGoogleLogin}
          styles={{
            root: { fontWeight: 600 },
            label: { color: "var(--mantine-color-text)" },
          }}
        >
          Continue with Google Account
        </Button>
        <Divider label="Or continue with email" labelPosition="center" />
        <form
          onSubmit={form.onSubmit(async (values) =>
            attemptLogin(values.email, values.password)
          )}
        >
          <Stack gap="md">
            <TextInput
              size="md"
              label={t("email_input_label")}
              placeholder={t("email_input_placeholder")}
              required
              type="email"
              {...form.getInputProps("email")}
            />
            <PasswordInput
              size="md"
              label={t("password_input_label")}
              placeholder={t("password_input_placeholder")}
              required
              {...form.getInputProps("password")}
            />
            <Button size="md" fullWidth type="submit">
              {t("sign_in_title")}
            </Button>
          </Stack>
        </form>
        <Text c="dimmed" size="sm" ta="center">
          <Anchor component="button" type="button" size="sm" onClick={() => router.push("/register")}>
            {t("create_account_button")}
          </Anchor>
          {" · "}
          <Anchor
            component="button"
            type="button"
            size="sm"
            onClick={() => router.push("/password_reset")}
          >
            {t("forgot_password_button")}
          </Anchor>
        </Text>
      </Stack>
    </GuestEntryShell>
  );
}

export const getServerSideProps = async ({ locale = 'en' }: { locale: string }) => ({
  props: {
    ...(await serverSideTranslations(locale, ["common"])),
  },
});
