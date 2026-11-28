import { Button, Group, type GroupProps } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import type { ReactNode } from "react";

import { removeAction } from "../buttons/action_styles";

export const rosterTableInitialState = { density: "xs" } as const;

// The bracket stylesheet sets a font on table cells, so set the app font on roster slots.
const rosterFont = { style: { fontFamily: "var(--mantine-font-family)" } };
export const rosterTablePresentation = {
  mantinePaperProps: rosterFont,
  mantineTableProps: rosterFont,
  mantineTableHeadCellProps: rosterFont,
  mantineTableBodyCellProps: rosterFont,
};

export function RosterActions(props: GroupProps) {
  return <Group gap="xs" {...props} />;
}

export function RosterSelectionAction({
  children,
  disabled,
  onClick,
  size,
  showIcon = false,
}: {
  children: ReactNode;
  disabled: boolean;
  onClick: () => void;
  size?: "xs";
  showIcon?: boolean;
}) {
  return (
    <Button
      {...removeAction}
      disabled={disabled}
      onClick={onClick}
      size={size}
      leftSection={showIcon ? <IconTrash size={16} /> : undefined}
    >
      {children}
    </Button>
  );
}
