import { Group, Stack, Text, Title } from "@mantine/core";
import React, { ReactNode } from "react";

/**
 * Page title used on organizer and participant screens.
 * Every page uses the same title size and a short dimmed description under it.
 */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <Group justify="space-between" align="flex-end" wrap="wrap" gap="md">
      <Stack gap={4} style={{ flex: "1 1 16rem", minWidth: 0 }}>
        <Title order={2}>{title}</Title>
        <Text size="sm" c="dimmed" maw={560}>
          {description}
        </Text>
      </Stack>
      {actions}
    </Group>
  );
}
