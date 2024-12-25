import {
  Anchor,
  Button,
  Container,
  Paper,
  PasswordInput,
  Text,
  TextInput,
  Title,
  Divider
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { showNotification } from "@mantine/notifications";
import { IconCheck } from "@tabler/icons-react";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useRouter } from "next/router";
import React, { useEffect } from "react";
import { FaGoogle } from 'react-icons/fa';

import { useAuth } from "../context/AuthContext";
import { auth } from "../services/firebase";

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
    <>
      <Title ta="center" mt={100}>
        {t("welcome_title")}{" "}
        <Text inherit variant="gradient" component="span">
          Bracket
        </Text>
      </Title>
      <Container size={480} my={40}>
        <Paper withBorder shadow="md" p={30} pt={8} mt={30} radius="md">
          <Button
            size="md"
            fullWidth
            mt="lg"
            type="submit"
            c="indigo"
            leftSection={<FaGoogle size={20} />}
            onClick={handleGoogleLogin}
          >
            Continue with Google
          </Button>
          <Divider label="Or continue with email" labelPosition="center" my="lg" />
          <form
            onSubmit={form.onSubmit(async (values) =>
              attemptLogin(values.email, values.password)
            )}
          >
            <TextInput
              label={t("email_input_label")}
              placeholder={t("email_input_placeholder")}
              required
              my="lg"
              type="email"
              {...form.getInputProps("email")}
            />
            <PasswordInput
              label={t("password_input_label")}
              placeholder={t("password_input_placeholder")}
              required
              mt="md"
              {...form.getInputProps("password")}
            />
            <Button fullWidth mt="xl" type="submit">
              {t("sign_in_title")}
            </Button>
          </form>
          <Text c="dimmed" size="sm" ta="center" mt={15}>
            <Anchor<"a">
              onClick={() => router.push("/register")}
              size="sm"
            >
              {t("create_account_button")}
            </Anchor>
            {" - "}
            <Anchor<"a">
              onClick={() => router.push("/password_reset")}
              size="sm"
            >
              {t("forgot_password_button")}
            </Anchor>
          </Text>
        </Paper>
      </Container>
    </>
  );
}

export const getServerSideProps = async ({ locale = 'en' }: { locale: string }) => ({
  props: {
    ...(await serverSideTranslations(locale, ["common"])),
  },
});
