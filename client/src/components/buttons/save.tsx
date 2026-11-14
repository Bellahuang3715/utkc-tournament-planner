import { Button } from '@mantine/core';

export default function SaveButton(props: any) {
  return (
    <Button color="green" size="sm" {...props}>
      {props.title}
    </Button>
  );
}
