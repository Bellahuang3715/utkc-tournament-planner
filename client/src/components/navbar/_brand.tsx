import { Center, Group, Image, Text, UnstyledButton } from '@mantine/core';
import Link from 'next/link';
import React from 'react';

import { LOGO_SRC } from '../marketing/fixtures';

export function Brand() {
  return (
    <Center mr="1rem">
      <UnstyledButton
        component={Link}
        href="/tournaments"
        aria-label="KenManage tournaments"
      >
        <Group gap={8} wrap="nowrap" align="center">
          <Image
            src={LOGO_SRC}
            alt=""
            h={48}
            w="auto"
            fit="contain"
            style={{ maxWidth: 168 }}
          />
          <Text
            fw={700}
            style={{
              fontFamily: '"Syne", "Sora", sans-serif',
              letterSpacing: '-0.04em',
              fontSize: 'clamp(1.65rem, 2.4vw, 1.9rem)',
              lineHeight: 1,
            }}
          >
            KenManage
          </Text>
        </Group>
      </UnstyledButton>
    </Center>
  );
}

export function BrandFooter() {
  return (
    <Center mr="1rem">
      <Image src={LOGO_SRC} alt="KenManage" h={28} w="auto" fit="contain" style={{ maxWidth: 140 }} />
    </Center>
  );
}
