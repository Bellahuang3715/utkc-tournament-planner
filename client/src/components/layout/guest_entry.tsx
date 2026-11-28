import { Group, Paper, Stack, Text, Title, UnstyledButton } from "@mantine/core";
import { IconChevronRight } from "@tabler/icons-react";
import React from "react";

import classes from "./guest_entry.module.css";

/**
 * Shared frame for the public entry screens: / and the three
 * choices that leave it (participant, scorekeeper, organizer).
 */
export function GuestEntryShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Stack className={classes.page} align="center" gap={0} mih="100dvh" px={24} py={48}>
      <Paper
        className={classes.card}
        radius={16}
        withBorder
        w="100%"
        maw={520}
        my="auto"
        p="36px 32px 32px"
      >
        <Stack gap="xl">
          <Stack gap={8}>
            <Text className={classes.eyebrow}>KenManage</Text>
            <Title order={1} fz="2.1rem" fw={700} lh={1.1}>
              {title}
            </Title>
            {description && (
              <Text size="sm" lh={1.55} maw="38em" c="var(--muted)">
                {description}
              </Text>
            )}
          </Stack>
          {children}
        </Stack>
      </Paper>
    </Stack>
  );
}

export function GuestChoiceCard({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <UnstyledButton type="button" onClick={onClick} className={classes.choice}>
      <Group align="center" wrap="nowrap" gap="md">
        <span className={classes.choiceIcon}>{icon}</span>
        <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
          <Text fw={600} size="md" lh={1.3}>
            {title}
          </Text>
          <Text size="sm" c="dimmed" lh={1.45}>
            {description}
          </Text>
        </Stack>
        <IconChevronRight size={18} stroke={1.5} className={classes.chevron} />
      </Group>
    </UnstyledButton>
  );
}
