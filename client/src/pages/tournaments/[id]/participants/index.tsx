// pages/tournaments/[id]/participants/index.tsx
import { useRouter } from 'next/router';
import { useEffect } from 'react';

export default function ParticipantsIndex() {
  const { query, push } = useRouter();
  useEffect(() => {
    if (query.id) push(`/tournaments/${query.id}/participants/players`);
  }, [query, push]);
  return null;
}
