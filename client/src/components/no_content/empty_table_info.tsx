import { Alert, Container, Text, Title } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { useTranslation } from 'next-i18next/pages';
import React from 'react';
import { HiMiniWrenchScrewdriver } from 'react-icons/hi2';

import classes from './empty_table_info.module.css';

export function EmptyTableInfo({
  entity_name,
  message = '',
}: {
  entity_name: string;
  message?: string;
}) {
  const { t } = useTranslation();
  return (
    <Alert
      icon={<IconAlertCircle size={16} />}
      title={`No ${entity_name} found`}
      color="blue"
      radius="lg"
      mt={8}
    >
      {t('could_not_find_any_alert')} {entity_name}
      {message}
    </Alert>
  );
}

export function EmptyRoster({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <div className={classes.roster}>
      <span className={classes.rosterIcon}>{icon}</span>
      <Title order={4} className={classes.rosterTitle}>
        {title}
      </Title>
      {description && (
        <Text size="sm" c="dimmed" ta="center" className={classes.rosterDescription}>
          {description}
        </Text>
      )}
    </div>
  );
}

export function NoContent({
  title,
  description,
  icon,
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
}) {
  return (
    <Container mt="md">
      <div className={classes.label}>{icon || <HiMiniWrenchScrewdriver />}</div>
      <Title className={classes.title}>{title}</Title>
      <Text size="lg" ta="center" className={classes.description} inherit>
        {description}
      </Text>
    </Container>
  );
}
