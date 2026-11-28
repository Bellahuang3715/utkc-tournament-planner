import { Group, Stack, Text, Title } from "@mantine/core";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
  compact = false,
}: {
  title: ReactNode;
  description: ReactNode;
  actions?: ReactNode;
  compact?: boolean;
}) {
  return (
    <Group
      justify="space-between"
      align="flex-end"
      wrap="wrap"
      gap={compact ? "0.4rem" : "md"}
    >
      <Stack
        gap={compact ? 2 : 4}
        style={{ flex: compact ? "1 1 14rem" : "1 1 16rem", minWidth: 0 }}
      >
        <Title
          order={2}
          fz={compact ? { base: "0.95rem", sm: "1.25rem" } : undefined}
          fw={compact ? 750 : undefined}
          lh={compact ? 1.25 : undefined}
        >
          {title}
        </Title>
        <Text
          fz={compact ? { base: "0.7rem", sm: "0.8125rem" } : "sm"}
          c="dimmed"
          lh={compact ? 1.35 : undefined}
          maw={compact ? "36rem" : 560}
        >
          {description}
        </Text>
      </Stack>
      {compact
        ? actions
        : actions && <Group gap="sm" w={{ base: "100%", xs: "auto" }}>{actions}</Group>}
    </Group>
  );
}
