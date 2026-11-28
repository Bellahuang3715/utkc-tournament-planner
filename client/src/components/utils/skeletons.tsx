import { Skeleton, Stack } from '@mantine/core';
import React from 'react';

export function GenericSkeleton() {
  return <Skeleton height={75} radius="lg" mb="xl" />;
}

export function GenericSkeletonThreeRows() {
  return (
    <>
      <GenericSkeleton />
      <GenericSkeleton />
      <GenericSkeleton />
    </>
  );
}

export function TableSkeletonSingleColumn() {
  return (
    <Stack gap="sm" mb="sm" w="100%">
      <Skeleton height="3rem" radius="md" />
      <Skeleton height="3rem" radius="md" />
      <Skeleton height="3rem" radius="md" />
    </Stack>
  );
}
