import { Button, Checkbox, Modal, Tabs, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconUser, IconUsers } from '@tabler/icons-react';
import { useTranslation } from 'next-i18next';
import { SWRResponse } from 'swr';

import { createPlayer } from '../../services/player';

function SinglePlayerTab({
  tournament_id,
  swrPlayersResponse,
  setOpened,
}: {
  tournament_id: number;
  swrPlayersResponse: SWRResponse;
  setOpened: any;
}) {
  const { t } = useTranslation();
  const form = useForm({
    initialValues: {
      name: '',
      active: true,
      player_ids: [],
    },
    validate: {
      name: (value) => (value.length > 0 ? null : t('too_short_name_validation')),
    },
  });
  return (
    <form
      onSubmit={form.onSubmit(async (values) => {
        // await createPlayer(tournament_id, values.name, values.active);
        await swrPlayersResponse.mutate();
        setOpened(false);
      })}
    >
      <TextInput
        withAsterisk
        label={t('name_input_label')}
        placeholder={t('player_name_input_placeholder')}
        {...form.getInputProps('name')}
      />

      <Checkbox
        mt="md"
        label={t('active_player_checkbox_label')}
        {...form.getInputProps('active', { type: 'checkbox' })}
      />

      <Button fullWidth style={{ marginTop: 10 }} color="green" type="submit">
        {t('save_players_button')}
      </Button>
    </form>
  );
}

export default function PlayerCreateModal({
  tournament_id,
  swrPlayersResponse,
  opened,
  setOpened,
}: {
  tournament_id: number;
  swrPlayersResponse: SWRResponse;
  opened: boolean;
  setOpened: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title={t('create_player_modal_title')}
      >
        <Tabs defaultValue="single">
          <Tabs.List justify="center" grow>
            <Tabs.Tab value="single" leftSection={<IconUser size="0.8rem" />}>
              {t('single_player_title')}
            </Tabs.Tab>
            <Tabs.Tab value="multi" leftSection={<IconUsers size="0.8rem" />}>
              {t('club_players_title')}
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="single" pt="xs">
            <SinglePlayerTab
              swrPlayersResponse={swrPlayersResponse}
              tournament_id={tournament_id}
              setOpened={setOpened}
            />
          </Tabs.Panel>
        </Tabs>
      </Modal>
    </>
  );
}
