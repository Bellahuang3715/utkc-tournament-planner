import { Button } from '@mantine/core';
import { MdDelete } from 'react-icons/md';
import React from 'react';

export default function DeleteButton(props: any) {
  return (
    <Button color="red" size="xs" leftSection={<MdDelete size={20} />} {...props}>
      {props.title}
    </Button>
  );
}
