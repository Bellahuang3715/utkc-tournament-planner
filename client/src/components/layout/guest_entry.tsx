import { Group, Paper, Stack, Text, Title, UnstyledButton } from "@mantine/core";
import { IconChevronRight } from "@tabler/icons-react";
import React from "react";

import classes from "./guest_entry.module.css";

/**
 * Shared frame for the public entry screens: /welcome and the three
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
    <div className={classes.page}>
      <Paper className={classes.card} radius={20} withBorder>
        <Stack gap="xl">
          <Stack gap={8}>
            <Text className={classes.eyebrow}>Kendo tournaments</Text>
            <Title order={1} className={classes.title}>
              {title}
            </Title>
            {description && (
              <Text c="dimmed" size="sm" className={classes.description}>
                {description}
              </Text>
            )}
          </Stack>
          {children}
        </Stack>
      </Paper>
    </div>
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
