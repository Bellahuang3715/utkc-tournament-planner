import { Stack, Text } from '@mantine/core';
import { useTranslation } from 'next-i18next/pages';
import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations';
import React, { useEffect, useState } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';

import UserForm from '../components/forms/user';
import { PageHeader } from '../components/layout/page_header';
import { GenericSkeletonThreeRows } from '../components/utils/skeletons';
import { UserInterface } from '../interfaces/user';
import { getCurrentUser } from '../services/user';
import { useAuth } from '../context/AuthContext';
import Layout from './_layout';

export const getServerSideProps = async ({ locale }: { locale: string }) => ({
  props: {
    ...(await serverSideTranslations(locale ?? 'en', ['common'])),
  },
});

function placeholderFromFirebase(firebaseUser: FirebaseUser | null): UserInterface | null {
  if (!firebaseUser) return null;
  return {
    id: 0,
    created: firebaseUser.metadata.creationTime || new Date().toISOString(),
    name: firebaseUser.displayName || '',
    email: firebaseUser.email || '',
    account_type: 'REGULAR',
    phone: '',
    organization: '',
    title: '',
    city: '',
    country: 'Canada',
    bio: '',
  };
}

function mergeProfile(
  placeholder: UserInterface,
  profile: Partial<UserInterface> | null | undefined,
): UserInterface {
  if (!profile) return placeholder;
  return {
    ...placeholder,
    ...profile,
    phone: profile.phone ?? placeholder.phone ?? '',
    organization: profile.organization ?? placeholder.organization ?? '',
    title: profile.title ?? placeholder.title ?? '',
    city: profile.city ?? placeholder.city ?? '',
    country: profile.country || placeholder.country || 'Canada',
    bio: profile.bio ?? placeholder.bio ?? '',
  };
}

export default function UserPage() {
  const { t } = useTranslation();
  const { user: firebaseUser, loading: authLoading } = useAuth();
  const [user, setUser] = useState<UserInterface | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    const placeholder = placeholderFromFirebase(firebaseUser);
    // Show Firebase / empty placeholders immediately so the page never hangs.
    setUser(placeholder);
    setLoading(false);

    if (!firebaseUser) return;

    let cancelled = false;
    (async () => {
      try {
        const response = await getCurrentUser();
        if (cancelled || !placeholder) return;
        const profile = response?.data?.data as UserInterface | undefined;
        setUser(mergeProfile(placeholder, profile));
      } catch {
        // Keep placeholders if API / DB profile fields are unavailable.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, firebaseUser]);

  let content: React.ReactNode = (
    <Text c="dimmed">{t('user_not_found', 'Could not load your profile.')}</Text>
  );

  if (loading || authLoading) {
    content = <GenericSkeletonThreeRows />;
  } else if (user) {
    content = <UserForm user={user} />;
  }

  return (
    <Layout>
      <Stack gap="lg">
        <PageHeader
          title={t('edit_profile_title', 'Profile')}
          description={t(
            'edit_profile_subtitle',
            'Manage your account details and security.',
          )}
        />
        {content}
      </Stack>
    </Layout>
  );
}
