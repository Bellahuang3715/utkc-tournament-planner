import {
  Alert,
  Anchor,
  Button,
  Container,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';

import { createPublicAxios, getBaseApiUrl } from '../services/adapter';

const LAST_CODE_KEY = 'participant_last_tournament_code';

/** Accept a slug or a pasted /t/{slug} URL. */
function normalizeTournamentCode(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';

  try {
    const asUrl = trimmed.includes('://') ? new URL(trimmed) : null;
    if (asUrl) {
      const parts = asUrl.pathname.split('/').filter(Boolean);
      const tIndex = parts.indexOf('t');
      if (tIndex >= 0 && parts[tIndex + 1]) return parts[tIndex + 1];
    }
  } catch {
    /* not a URL */
  }

  const pathMatch = trimmed.match(/(?:^|\/)t\/([^/?#]+)/i);
  if (pathMatch) return pathMatch[1];

  return trimmed.replace(/^\/+|\/+$/g, '');
}

/**
 * Participant-only join screen. Does not use organizer layout or auth.
 */
export default function JoinTournamentPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    initialValues: { code: '' },
    validate: {
      code: (v) =>
        normalizeTournamentCode(v).length > 0 ? null : 'Enter a tournament code',
    },
  });

  useEffect(() => {
    const last = localStorage.getItem(LAST_CODE_KEY);
    if (last) form.setFieldValue('code', last);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = form.onSubmit(async (values) => {
    const code = normalizeTournamentCode(values.code);
    setSubmitting(true);
    setError(null);
    try {
      const axios = await createPublicAxios();
      await axios.get(`public/tournaments/${encodeURIComponent(code)}`);
      localStorage.setItem(LAST_CODE_KEY, code);
      await router.push(`/t/${encodeURIComponent(code)}`);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 404) {
        setError('No tournament found with that code. Check with your organizer.');
      } else if (status === 403) {
        setError(
          'This tournament is not published yet. Ask your organizer for a preview link, or wait until they publish.'
        );
      } else if (err?.code === 'ERR_NETWORK') {
        setError(`Cannot reach the server (${getBaseApiUrl()}).`);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Container
      size="xs"
      px="md"
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        paddingTop: 24,
        paddingBottom: 40,
      }}
    >
      <Stack gap="lg">
        <div>
          <Anchor component="button" type="button" size="sm" onClick={() => router.push('/welcome')}>
            ← Back
          </Anchor>
          <Title order={1} mt="md" style={{ fontSize: 'clamp(1.6rem, 5.5vw, 2rem)' }}>
            Enter tournament code
          </Title>
          <Text c="dimmed" mt="sm">
            Your organizer shares a short code (for example <code>utkc-spring-2026</code>). You can
            also paste the full participant link.
          </Text>
        </div>

        <form onSubmit={onSubmit}>
          <Stack gap="md">
            <TextInput
              size="md"
              label="Tournament code"
              placeholder="utkc-spring-2026"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              {...form.getInputProps('code')}
            />
            {error && (
              <Alert color="red" title="Could not join">
                {error}
              </Alert>
            )}
            <Button type="submit" size="md" fullWidth loading={submitting}>
              Continue
            </Button>
          </Stack>
        </form>

        <Text size="sm" c="dimmed" ta="center">
          Organizer?{' '}
          <Anchor component="button" type="button" onClick={() => router.push('/login')}>
            Sign in here
          </Anchor>
        </Text>
      </Stack>
    </Container>
  );
}

export const getServerSideProps = async ({ locale }: { locale: string }) => ({
  props: {
    ...(await serverSideTranslations(locale ?? 'en', ['common'])),
  },
});
