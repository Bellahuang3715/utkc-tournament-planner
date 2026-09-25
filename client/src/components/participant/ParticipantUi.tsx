import { Center, Loader, Text, TextInput } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import React, { ReactNode } from 'react';

import { PageHeader } from '../layout/page_header';

/** Shared mobile-first primitives for the participant site only. */

export function ParticipantPageTitle({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle: string;
  actions?: ReactNode;
}) {
  return <PageHeader title={title} description={subtitle} actions={actions} />;
}

export function ParticipantSearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <TextInput
      size="md"
      radius="md"
      placeholder={placeholder}
      leftSection={<IconSearch size={18} />}
      value={value}
      onChange={(e) => onChange(e.currentTarget.value)}
      styles={{
        input: { minHeight: 48 },
      }}
    />
  );
}

export function ParticipantLoading() {
  return (
    <Center py="xl">
      <Loader size="sm" />
    </Center>
  );
}

export function ParticipantEmpty({ children }: { children: ReactNode }) {
  return (
    <Text c="dimmed" size="sm" py="md">
      {children}
    </Text>
  );
}

export function formatParticipantTime(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatParticipantClock(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}
