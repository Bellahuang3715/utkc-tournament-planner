import { Button, Modal, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { GoPlus } from 'react-icons/go';
import { useTranslation } from 'next-i18next';
import { useState } from 'react';
import { SWRResponse } from 'swr';

import { Club, ClubFormValues } from '../../interfaces/club';
import { createClub } from '../../services/club';
import SaveButton from '../buttons/save';

export default function ClubModal({
  club,
  swrClubsResponse,
}: {
  club: Club | null;
  swrClubsResponse: SWRResponse;
}) {
  const { t } = useTranslation();
  const operationText = t('create_club_button');

  const [opened, setOpened] = useState(false);

  const openButton =
    <SaveButton
      mx="0"
      // fullWidth
      onClick={() => setOpened(true)}
      leftSection={<GoPlus size={24} />}
      title={operationText}
    />;

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

  const handleSubmit = form.onSubmit(async (values) => {
    await createClub(values);
    await swrClubsResponse.mutate();
    setOpened(false);
  });

  return (
    <>
      <Modal opened={opened} onClose={() => setOpened(false)} title={operationText}>
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

      {openButton}
    </>
  );
}
