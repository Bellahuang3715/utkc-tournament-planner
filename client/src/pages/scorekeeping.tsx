import { Button, Center, Paper, Stack, Text, TextInput, Title } from "@mantine/core";
import { GetStaticProps } from "next";
import { serverSideTranslations } from "next-i18next/pages/serverSideTranslations";
import { useRouter } from "next/router";
import React, { useState } from "react";

import { redeemScorekeeperCode } from "../services/tournament";
import { storeScorekeeperAccess } from "../utils/scorekeeper_access";

export default function ScorekeepingRedeemPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = code.trim();
    const first = firstName.trim();
    const last = lastName.trim();
    if (!token) {
      setError("Enter the scorekeeper access code");
      return;
    }
    if (!first || !last) {
      setError("Enter your first and last name");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await redeemScorekeeperCode(token);
      const data = res.data?.data;
      if (!data?.tournament_id) {
        setError("Invalid response from server");
        return;
      }
      storeScorekeeperAccess(data.tournament_id, {
        token,
        firstName: first,
        lastName: last,
      });
      await router.push(`/tournaments/${data.tournament_id}/scores`);
    } catch {
      setError("Invalid or expired access code");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Center mih="100vh" p="md">
      <Paper shadow="sm" p="xl" radius="md" withBorder maw={420} w="100%">
        <form onSubmit={onSubmit}>
          <Stack gap="md">
            <Title order={2}>Scorekeeper access</Title>
            <Text size="sm" c="dimmed">
              Enter the access code from the tournament organizer. Your name is
              shown to others while you edit a group.
            </Text>
            <TextInput
              label="Access code"
              placeholder="Paste code"
              value={code}
              onChange={(e) => setCode(e.currentTarget.value)}
              autoFocus
            />
            <TextInput
              label="First name"
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.currentTarget.value)}
              required
            />
            <TextInput
              label="Last name"
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.currentTarget.value)}
              required
              error={error}
            />
            <Button type="submit" loading={submitting} fullWidth>
              Continue
            </Button>
            <Button
              variant="subtle"
              fullWidth
              onClick={() => router.push("/welcome")}
            >
              Back
            </Button>
          </Stack>
        </form>
      </Paper>
    </Center>
  );
}

type Props = {};
export const getStaticProps: GetStaticProps<Props> = async ({ locale }) => ({
  props: {
    ...(await serverSideTranslations(locale ?? "en", ["common"])),
  },
});
