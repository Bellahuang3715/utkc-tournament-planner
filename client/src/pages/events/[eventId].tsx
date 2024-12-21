import React from "react";
import { useRouter } from "next/router";
import EventDetailPage from "../../components/EventDetailPage";

const EventDetail: React.FC = () => {
  const router = useRouter();
  const { eventId } = router.query;

  return (
      <EventDetailPage />
  );
};

export default EventDetail;
