import { Alert, type AlertProps } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import type { ReactNode } from "react";

type WarningAlertProps = {
  children: ReactNode;
  title?: ReactNode;
} & Omit<AlertProps, "children" | "color" | "icon" | "variant" | "title">;

/**
 * Inline guard / validation warning for modals and pages.
 * Prefer this over toast notifications for expected user-fixable conflicts.
 */
export function WarningAlert({ children, title, ...props }: WarningAlertProps) {
  return (
    <Alert
      variant="light"
      color="orange"
      icon={<IconAlertTriangle size={16} />}
      title={title}
      {...props}
    >
      {children}
    </Alert>
  );
}
