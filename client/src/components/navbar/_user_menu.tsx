import { Avatar, Group, Menu, Text, UnstyledButton } from '@mantine/core';
import {
  IconChevronDown,
  IconLogout,
  IconSettings,
  IconUser,
} from '@tabler/icons-react';
import { useTranslation } from 'next-i18next/pages';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React from 'react';

import { useAuth } from '../../context/AuthContext';
import classes from './_user_menu.module.css';

function initialsFromName(name: string, email: string) {
  const source = (name || email || '?').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export function UserMenu() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, logout } = useAuth();

  if (!user) return null;

  const displayName = user.displayName || user.email || t('user_title', 'User');
  const email = user.email || '';

  return (
    <Menu shadow="md" width={220} position="bottom-end" withinPortal>
      <Menu.Target>
        <UnstyledButton className={classes.userButton} aria-label={t('user_menu', 'User menu')}>
          <Group gap={8} wrap="nowrap">
            <Avatar
              src={user.photoURL}
              alt={displayName}
              radius="xl"
              size={28}
              color="blue"
            >
              {initialsFromName(user.displayName || '', email)}
            </Avatar>
            <Text size="sm" fw={500} className={classes.userName} lineClamp={1}>
              {displayName}
            </Text>
            <IconChevronDown size={14} stroke={1.5} className={classes.chevron} />
          </Group>
        </UnstyledButton>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>
          <Text size="xs" fw={600} lineClamp={1}>
            {displayName}
          </Text>
          {email ? (
            <Text size="xs" c="dimmed" lineClamp={1}>
              {email}
            </Text>
          ) : null}
        </Menu.Label>
        <Menu.Divider />
        <Menu.Item
          component={Link}
          href="/user"
          leftSection={<IconUser size={16} stroke={1.5} />}
        >
          {t('profile_menu_item', 'Profile')}
        </Menu.Item>
        <Menu.Item
          component={Link}
          href="/user"
          leftSection={<IconSettings size={16} stroke={1.5} />}
        >
          {t('settings_menu_item', 'Settings')}
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item
          color="red"
          leftSection={<IconLogout size={16} stroke={1.5} />}
          onClick={() => logout(t, router)}
        >
          {t('logout_title', 'Log out')}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
