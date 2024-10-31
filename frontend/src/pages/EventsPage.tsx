import React, { useEffect, useContext } from 'react';
import { Button, Card } from 'react-bootstrap';
import { EventContext } from '../context/EventContext';

import { Event } from '../types';

interface EventContextProps {
  events: Event[];
  fetchEvents: () => void;
  createEvent: () => void;
}

const EventsPage: React.FC = () => {
  const context = useContext(EventContext);

  useEffect(() => {
    context?.fetchEvents();  // Fetches all events from the backend on load
  }, [context]);

  if (!context) {
    return <div>Error: EventContext not available.</div>;
  }

  const { events, fetchEvents } = context;

  return (
    <div className="container mt-5">
      <h2>Tournaments</h2>
      <Button className="mb-4">New Event</Button>
      <div className="row">
        {events.map((event) => (
          <Card key={event.id} className="col-md-4">
            <Card.Body>
              <Card.Title>{event.name}</Card.Title>
              <Button href={`/events/${event.id}`} variant="primary">Manage</Button>
            </Card.Body>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default EventsPage;
