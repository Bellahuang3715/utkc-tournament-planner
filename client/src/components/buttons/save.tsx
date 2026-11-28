import { Button } from '@mantine/core';
import { saveAction } from "./action_styles";

export default function SaveButton(props: any) {
  return (
    <Button {...saveAction} size="sm" {...props}>
      {props.title}
    </Button>
  );
}
