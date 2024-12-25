import { Group, Stack, Title } from '@mantine/core';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import React, { useEffect, useState } from "react";

import UserForm from '../components/forms/user';
import { TableSkeletonSingleColumn } from '../components/utils/skeletons';
import { UserInterface } from '../interfaces/user';
import { useAuth } from "../context/AuthContext";
import Layout from './_layout';

export const getServerSideProps = async ({ locale }: { locale: string }) => ({
  props: {
    ...(await serverSideTranslations(locale ?? 'en', ['common'])),
  },
});

export default function HomePage() {
  const { t, i18n } = useTranslation();
  const { getUser } = useAuth();
  const [user, setUser] = useState<UserInterface | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch user details
    const fetchedUser = getUser();
    setUser(fetchedUser);
    setLoading(false);
  }, [getUser]); // Dependency to fetch user when the function updates

  // Display user form or skeleton loader
  let content = user ? <UserForm user={user} i18n={i18n} t={t} /> : null;

  if (loading) {
    content = (
      <Group maw="40rem">
        <TableSkeletonSingleColumn />
      </Group>
    );
  }

  return (
    <Layout>
      <Title>{t('edit_profile_title')}</Title>
      <Stack style={{ maxWidth: '40rem' }}>{content}</Stack>
    </Layout>
  );
}
