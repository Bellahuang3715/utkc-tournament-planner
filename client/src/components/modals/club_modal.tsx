import { useEffect } from 'react';
import { useForm } from '@mantine/form';
import { useTranslation } from 'next-i18next';
import { Button, Modal, TextInput } from '@mantine/core';
import { SWRResponse } from 'swr';

import { Club, ClubFormValues } from '../../interfaces/club';
import { createClub } from '../../services/club';

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
  const operationText = t('create_club_button');

  const form = useForm<ClubFormValues>({
    initialValues: {
      name:           club?.name           ?? '',
      abbreviation:   club?.abbreviation   ?? '',
      representative: club?.representative ?? '',
      contact_email:  club?.contact_email  ?? '',
    },
    validate: {
      name:         (v) => (v.length > 0 ? null : t('too_short_name_validation')),
      abbreviation: (v) => (v.length > 0 ? null : t('too_short_abbr_validation')),
      // optional fields need no validator
    },
  });

  useEffect(() => {
    if (!opened) return;
    if (isEdit && club) {
      form.setValues({
        name:           club.name,
        abbreviation:   club.abbreviation,
        representative: club.representative ?? '',
        contact_email:  club.contact_email ?? '',
      });
    } else {
      form.reset();
    }
  }, [opened]);

  const handleSubmit = form.onSubmit(async (values) => {
    if (isEdit && club) {
      // await updateClub(club.id, values);
    }
    else {
      await createClub(values);
    }
    await swrClubsResponse.mutate();
    setOpened(false);
  });

  return (
    <>
      <Modal opened={opened} onClose={() => setOpened(false)} title={operationText} zIndex={2000}>
        <form onSubmit={handleSubmit}>
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
            mt="sm"
            {...form.getInputProps('abbreviation')}
          />

          <TextInput
            label={t('representative_input_label', 'Representative')}
            placeholder={t('representative_input_placeholder', 'Enter representative name')}
            mt="sm"
            {...form.getInputProps('representative')}
          />

          <TextInput
            type="email"
            label={t('contact_email_input_label', 'Contact Email')}
            placeholder={t('contact_email_input_placeholder', 'Enter contact email')}
            mt="sm"
            {...form.getInputProps('contact_email')}
          />

          <Button fullWidth mt="lg" color="green" type="submit">
            {t('save_button')}
          </Button>
        </form>
      </Modal>
    </>
  );
}
