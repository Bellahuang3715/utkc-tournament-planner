import { Alert, Button, Stack, TextInput } from "@mantine/core";
import { GetStaticProps } from "next";
import { serverSideTranslations } from "next-i18next/pages/serverSideTranslations";
import { useRouter } from "next/router";
import React, { useState } from "react";

import { GuestEntryShell } from "../components/layout/guest_entry";
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
    <GuestEntryShell
      title="Scorekeeper access"
      description="Enter the access code from the tournament organizer. Your name is shown to others while you edit a group."
    >
      <form onSubmit={onSubmit}>
        <Stack gap="md">
          <TextInput
            size="md"
            label="Access code"
            placeholder="Paste code"
            value={code}
            onChange={(e) => setCode(e.currentTarget.value)}
            autoFocus
          />
          <TextInput
            size="md"
            label="First name"
            placeholder="First name"
            value={firstName}
            onChange={(e) => setFirstName(e.currentTarget.value)}
            required
          />
          <TextInput
            size="md"
            label="Last name"
            placeholder="Last name"
            value={lastName}
            onChange={(e) => setLastName(e.currentTarget.value)}
            required
          />
          {error && (
            <Alert color="red" title="Could not continue">
              {error}
            </Alert>
          )}
          <Button type="submit" size="md" loading={submitting} fullWidth>
            Continue
          </Button>
        </Stack>
      </form>
    </GuestEntryShell>
  );
}

type Props = {};
export const getStaticProps: GetStaticProps<Props> = async ({ locale }) => ({
  props: {
    ...(await serverSideTranslations(locale ?? "en", ["common"])),
  },
});
