import React, { createContext, useState, useEffect, ReactNode } from 'react';
// import axios from 'axios';
import fakeData from '../data/fakeData.json';
import { Participant } from '../types';

interface Event {
  id: number;
  name: string;
  date: string;
  participants: Participant[];
}

interface EventContextProps {
  events: Event[];
  participants: Participant[];
  fetchEvents: () => void;
  fetchParticipants: (eventId: number) => void;
  // createEvent?: (newEvent: Event) => Promise<void>;
}

export const EventContext = createContext<EventContextProps | undefined>(undefined);

interface EventProviderProps {
  children: ReactNode;
}

export const EventProvider: React.FC<EventProviderProps> = ({ children }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = () => {
    setEvents(fakeData.events);
    // const response = await axios.get('/api/events');
    // setEvents(response.data);
  };

  const fetchParticipants = (eventId: number) => {
    const event = fakeData.events.find(event => event.id === eventId);
    setParticipants(event ? event.participants : []);
  };

  return (
    <EventContext.Provider
      value={{
        events,
        participants,
        fetchEvents,
        fetchParticipants,
        // createEvent,
      }}
    >
      {children}
    </EventContext.Provider>
  );
};
