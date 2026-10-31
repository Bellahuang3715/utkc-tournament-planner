import { Button, Modal, Stack, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { GoPlus } from 'react-icons/go';
import { useTranslation } from 'next-i18next/pages';
import React, { useState } from 'react';
import { SWRResponse } from 'swr';

import { createCourt } from '../../services/court';
import ModalFooter from './modal_footer';

export default function CourtModal({
  tournamentId,
  swrCourtsResponse,
  buttonSize,
}: {
  buttonSize: 'xs' | 'lg';
  tournamentId: number;
  swrCourtsResponse: SWRResponse;
}) {
  const { t } = useTranslation();
  const [opened, setOpened] = useState(false);
  const form = useForm({
    initialValues: {
      name: '',
    },

    validate: {
      name: (value) => (value.length > 0 ? null : t('too_short_name_validation')),
    },
  });

  return (
    <>
      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title={t('add_court_title')}
        centered
        closeOnClickOutside={false}
      >
        <form
          onSubmit={form.onSubmit(async (values) => {
            await createCourt(tournamentId, values.name);
            await swrCourtsResponse.mutate();
            setOpened(false);
          })}
        >
          <Stack gap="md">
            <TextInput
              withAsterisk
              label={t('name_input_label')}
              placeholder={t('court_name_input_placeholder')}
              {...form.getInputProps('name')}
            />
          </Stack>
          <ModalFooter
            onCancel={() => setOpened(false)}
            primaryLabel={t('save_button')}
            primaryType="submit"
          />
        </form>
      </Modal>
      <Button
        variant="outline"
        color="green"
        size={buttonSize}
        style={{ marginRight: 10 }}
        onClick={() => setOpened(true)}
        leftSection={<GoPlus size={24} />}
      >
        {t('add_court_title')}
      </Button>
    </>
  );
}
