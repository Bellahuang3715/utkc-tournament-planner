import React, { useEffect } from 'react';
import {
  Autocomplete,
  Box,
  Button,
  Fieldset,
  Grid,
  Group,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { showNotification } from '@mantine/notifications';
import { IconCheck } from '@tabler/icons-react';
import { FirebaseError } from 'firebase/app';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next/pages';
import { CircleFlag } from 'react-circle-flags';

import { UserInterface } from '../../interfaces/user';
import { updatePassword, updateUser } from '../../services/user';
import {
  COUNTRY_OPTIONS,
  DEFAULT_COUNTRY,
  countryCodeFromName,
} from '../../utils/countries';
import { PasswordStrength } from '../utils/password';
import { useAuth } from '../../context/AuthContext';

function profileValuesFromUser(user: UserInterface) {
  return {
    name: user.name ?? '',
    email: user.email ?? '',
    phone: user.phone ?? '',
    organization: user.organization ?? '',
    title: user.title ?? '',
    city: user.city ?? '',
    country: user.country || DEFAULT_COUNTRY,
    bio: user.bio ?? '',
  };
}

export default function UserForm({ user }: { user: UserInterface }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { hasPasswordProvider, updateUserPassword } = useAuth();

  const detailsForm = useForm({
    initialValues: profileValuesFromUser(user),
    validate: {
      name: (value) => (value !== '' ? null : t('empty_name_validation')),
      email: (value) => (value !== '' ? null : t('empty_email_validation')),
    },
  });

  const passwordForm = useForm({
    initialValues: {
      password: '',
    },
    validate: {
      password: (value) =>
        value.length >= 8 ? null : t('too_short_password_validation'),
    },
  });

  useEffect(() => {
    const values = profileValuesFromUser(user);
    detailsForm.setValues(values);
    detailsForm.resetDirty(values);
  }, [user]);

  const dirty =
    detailsForm.isDirty() || passwordForm.values.password.length > 0;

  useEffect(() => {
    if (!dirty) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    const onRouteStart = (url: string) => {
      if (url === router.asPath) return;
      const ok = window.confirm(
        t('unsaved_prompt', 'You have unsaved changes. Continue anyway?'),
      );
      if (!ok) {
        router.events.emit('routeChangeError');
        throw 'Route change aborted.';
      }
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    router.events.on('routeChangeStart', onRouteStart);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      router.events.off('routeChangeStart', onRouteStart);
    };
  }, [dirty, router, t]);

  return (
    <Box maw={560} w="100%">
      <form
        onSubmit={detailsForm.onSubmit(async (values) => {
          await updateUser(user.id, {
            name: values.name,
            email: values.email,
            phone: values.phone || null,
            organization: values.organization || null,
            title: values.title || null,
            city: values.city || null,
            country: values.country?.trim() || DEFAULT_COUNTRY,
            bio: values.bio || null,
          });
          detailsForm.resetDirty(values);
          showNotification({
            title: t('success', 'Saved'),
            message: t('profile_saved', 'Your profile was updated'),
            color: 'green',
            icon: <IconCheck size={16} />,
          });
        })}
      >
        <Fieldset legend={t('profile_section', 'Profile')} radius="md">
          <TextInput
            withAsterisk
            label={t('name_input_label', 'Name')}
            placeholder={t('name_input_placeholder', 'Your full name')}
            {...detailsForm.getInputProps('name')}
          />
          <Grid mt="sm">
            <Grid.Col span={{ sm: 6 }}>
              <TextInput
                label={t('title_input_label', 'Title / role')}
                placeholder={t('title_input_placeholder', 'e.g. Tournament director')}
                {...detailsForm.getInputProps('title')}
              />
            </Grid.Col>
            <Grid.Col span={{ sm: 6 }}>
              <TextInput
                label={t('organization_input_label', 'Organization')}
                placeholder={t('organization_input_placeholder', 'Club or organization')}
                {...detailsForm.getInputProps('organization')}
              />
            </Grid.Col>
          </Grid>
          <Textarea
            mt="sm"
            label={t('bio_input_label', 'About')}
            placeholder={t('bio_input_placeholder', 'A short bio')}
            minRows={3}
            autosize
            {...detailsForm.getInputProps('bio')}
          />
        </Fieldset>

        <Fieldset legend={t('contact_section', 'Contact')} mt="lg" radius="md">
          <TextInput
            withAsterisk
            label={t('email_input_label', 'Email')}
            type="email"
            {...detailsForm.getInputProps('email')}
          />
          <TextInput
            mt="sm"
            label={t('phone_input_label', 'Phone')}
            placeholder={t('phone_input_placeholder', '+1 416 555 0100')}
            {...detailsForm.getInputProps('phone')}
          />
          <Grid mt="sm">
            <Grid.Col span={{ sm: 6 }}>
              <TextInput
                label={t('city_input_label', 'City')}
                placeholder={t('city_input_placeholder', 'Toronto')}
                {...detailsForm.getInputProps('city')}
              />
            </Grid.Col>
            <Grid.Col span={{ sm: 6 }}>
              <Autocomplete
                label={t('country_input_label', 'Country')}
                placeholder={t('country_input_placeholder', 'Start typing a country')}
                data={COUNTRY_OPTIONS.map((c) => c.name)}
                limit={12}
                comboboxProps={{ withinPortal: true }}
                leftSection={
                  <CircleFlag
                    countryCode={countryCodeFromName(detailsForm.values.country)}
                    height="16"
                    style={{ pointerEvents: 'none' }}
                  />
                }
                renderOption={({ option }) => (
                  <Group gap="sm" wrap="nowrap">
                    <CircleFlag
                      countryCode={countryCodeFromName(option.value)}
                      height="18"
                    />
                    <Text size="sm">{option.value}</Text>
                  </Group>
                )}
                {...detailsForm.getInputProps('country')}
              />
            </Grid.Col>
          </Grid>
        </Fieldset>

        <Button fullWidth mt="lg" color="green" type="submit">
          {t('save_button')}
        </Button>
      </form>

      {hasPasswordProvider && (
        <Fieldset legend={t('security_section', 'Security')} mt="xl" radius="md">
          <Text size="sm" c="dimmed" mb="sm">
            {t('change_password_description', 'Update your account password')}
          </Text>
          <form
            onSubmit={passwordForm.onSubmit(async (values) => {
              try {
                await updateUserPassword(values.password);
                await updatePassword(user.id, values.password);
                passwordForm.reset();
                showNotification({
                  title: t('success', 'Saved'),
                  message: t('password_saved', 'Your password was updated'),
                  color: 'green',
                  icon: <IconCheck size={16} />,
                });
              } catch (error) {
                const needsReauth =
                  error instanceof FirebaseError &&
                  error.code === 'auth/requires-recent-login';
                showNotification({
                  color: 'red',
                  title: t('error', 'Error'),
                  message: needsReauth
                    ? t(
                        'password_reauth_required',
                        'For security, sign out and sign in again before changing your password.'
                      )
                    : t(
                        'password_update_error',
                        'Could not update your password. Please try again.'
                      ),
                });
              }
            })}
          >
            <PasswordStrength form={passwordForm} />
            <Button fullWidth mt="md" color="green" type="submit">
              {t('update_password_button', 'Update password')}
            </Button>
          </form>
        </Fieldset>
      )}
    </Box>
  );
}
