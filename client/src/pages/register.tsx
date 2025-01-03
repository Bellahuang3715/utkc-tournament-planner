import {
  Alert,
  Anchor,
  Box,
  Button,
  Center,
  Container,
  Group,
  Paper,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconAlertCircle, IconArrowLeft } from "@tabler/icons-react";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useRouter } from "next/router";
import React, { useState } from "react";

import { useAuth } from "../context/AuthContext";
import { PasswordStrength } from "../components/utils/password";
import { ClientOnly } from "../components/utils/react";
import { HCaptchaInput } from "../components/utils/util";
import { registerUserDb } from "../services/user";
import classes from './register.module.css';
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
      // Register user in Firebase
      const firebaseUser = await registerUser(values.email, values.password, values.name);
      console.log("User registered:", firebaseUser);

      // Send user data to backend for database insertion
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
    },

    validate: {
      name: (value) => (value !== "" ? null : t("empty_name_validation")),
      email: (value) =>
        /^\S+@\S+$/.test(value) ? null : t("empty_email_validation"),
      password: (value) =>
        value !== "" ? null : t("empty_password_validation"),
    },
  });

  return (
    <Container size={460} my={30}>
      <Title className={classes.title} ta="center">
        {t("create_account_title")}
      </Title>
      <Paper withBorder shadow="md" p={30} radius="md" mt="xl">
        {/* <Alert
          icon={<IconAlertCircle size={16} />}
          mb={16}
          title={t("create_account_alert_title")}
          color="red"
          radius="md"
        >
          {t("create_account_alert_description")}
        </Alert> */}
        <form
          onSubmit={form.onSubmit(async (values) => {
            await registerAndRedirect(values);
          })}
        >
          <TextInput
            label={t("email_input_label")}
            placeholder={t("email_input_placeholder")}
            required
            type="email"
            {...form.getInputProps("email")}
          />
          <TextInput
            label={t("name_input_label")}
            placeholder={t("name_input_placeholder")}
            required
            mt="lg"
            mb="lg"
            {...form.getInputProps("name")}
          />
          <PasswordStrength form={form} />
          <Group justify="space-between" mt="lg" className={classes.controls}>
            <ClientOnly>
              <HCaptchaInput
                siteKey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY}
                setCaptchaToken={setCaptchaToken}
              />
            </ClientOnly>
            <Anchor c="dimmed" size="sm" className={classes.control}>
              <Center inline>
                <IconArrowLeft size={12} stroke={1.5} />
                <Box ml={5} onClick={() => router.push("/login")}>
                  {" "}
                  {t("back_to_login_nav")}
                </Box>
              </Center>
            </Anchor>
            <Button className={classes.control} type="submit">
              {t("create_account_button")}
            </Button>
          </Group>
        </form>
      </Paper>
    </Container>
  );
}
