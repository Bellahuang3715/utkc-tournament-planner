import { Paper, Stack, Text, Title } from "@mantine/core";
import type { ReactNode } from "react";

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
  description?: ReactNode;
  children: ReactNode;
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
