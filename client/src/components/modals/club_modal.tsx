import { useEffect } from 'react';
import { useForm } from '@mantine/form';
import { useTranslation } from 'next-i18next/pages';
import { Autocomplete, Group, Modal, Stack, Text, TextInput } from '@mantine/core';
import { SWRResponse } from 'swr';
import { CircleFlag } from 'react-circle-flags';

import { Club, ClubFormValues } from '../../interfaces/club';
import { createClub, updateClub } from '../../services/club';
import {
  COUNTRY_OPTIONS,
  DEFAULT_COUNTRY,
  countryCodeFromName,
} from '../../utils/countries';
import ModalFooter from './modal_footer';

export default function ClubModal({
  club,
  swrClubsResponse,
  opened,
  setOpened,
}: {
  club: Club | null;
  swrClubsResponse: SWRResponse;
  opened: boolean;
  setOpened: (o: boolean) => void;
}) {
  const { t } = useTranslation();
  const isEdit = Boolean(club);
  const operationText = isEdit
    ? t('edit_club_header', 'Edit Club')
    : t('create_club_button');

  const form = useForm<ClubFormValues>({
    initialValues: {
      name:           club?.name           ?? '',
      abbreviation:   club?.abbreviation   ?? '',
      country:        club?.country        ?? DEFAULT_COUNTRY,
      representative: club?.representative ?? '',
      contact_email:  club?.contact_email  ?? '',
    },
    validate: {
      name:         (v) => (v.length > 0 ? null : t('too_short_name_validation')),
      abbreviation: (v) => (v.length > 0 ? null : t('too_short_abbr_validation')),
    },
  });

  useEffect(() => {
    if (!opened) return;
    if (isEdit && club) {
      form.setValues({
        name:           club.name,
        abbreviation:   club.abbreviation,
        country:        club.country || DEFAULT_COUNTRY,
        representative: club.representative ?? '',
        contact_email:  club.contact_email ?? '',
      });
    } else {
      form.setValues({
        name: '',
        abbreviation: '',
        country: DEFAULT_COUNTRY,
        representative: '',
        contact_email: '',
      });
    }
  }, [opened, club, isEdit]);

  const handleSubmit = form.onSubmit(async (values) => {
    const payload = {
      ...values,
      country: values.country?.trim() || DEFAULT_COUNTRY,
    };
    if (isEdit && club) {
      await updateClub(club.id, payload);
    } else {
      await createClub(payload);
    }
    await swrClubsResponse.mutate();
    setOpened(false);
  });

  return (
    <>
      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title={operationText}
        centered
        closeOnClickOutside={false}
        zIndex={2000}
      >
        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <TextInput
              withAsterisk
              label={t('name_input_label', 'Name')}
              placeholder={t('club_name_input_placeholder', 'Enter club name')}
              {...form.getInputProps('name')}
            />

            <TextInput
              withAsterisk
              label={t('abbreviation_input_label', 'Abbreviation')}
              placeholder={t('abbreviation_input_placeholder', 'Enter club abbreviation')}
              {...form.getInputProps('abbreviation')}
            />

            <Autocomplete
              label={t('country_input_label', 'Country')}
              placeholder={t('country_input_placeholder', 'Start typing a country')}
              data={COUNTRY_OPTIONS.map((c) => c.name)}
              limit={12}
              comboboxProps={{ withinPortal: true, zIndex: 2100 }}
              leftSection={
                <CircleFlag
                  countryCode={countryCodeFromName(form.values.country)}
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
              {...form.getInputProps('country')}
            />

            <TextInput
              label={t('representative_input_label', 'Representative')}
              placeholder={t('representative_input_placeholder', 'Enter representative name')}
              {...form.getInputProps('representative')}
            />

            <TextInput
              type="email"
              label={t('contact_email_input_label', 'Contact Email')}
              placeholder={t('contact_email_input_placeholder', 'Enter contact email')}
              {...form.getInputProps('contact_email')}
            />
          </Stack>
          <ModalFooter
            onCancel={() => setOpened(false)}
            primaryLabel={t('save_button')}
            primaryType="submit"
          />
        </form>
      </Modal>
    </>
  );
}
