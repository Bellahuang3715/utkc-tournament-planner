import { Button } from '@mantine/core';
import { MdDelete } from 'react-icons/md';
import React from 'react';

import { removeAction } from './action_styles';

export default function DeleteButton(props: any) {
  return (
    <Button {...removeAction} size="xs" leftSection={<MdDelete size={20} />} {...props}>
      {props.title}
    </Button>
  );
}
