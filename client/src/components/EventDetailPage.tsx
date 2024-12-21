import React from 'react';
import { Tabs, Tab } from 'react-bootstrap';
import ParticipantsPage from './ParticipantsPage';
import Files from './FolderManager';
import Result from './Result';

interface Placement {
  position: "1st" | "2nd" | "3rd";
  name: string;
}

interface Division {
  name: string;
  placements: Placement[];
}


const EventDetailPage: React.FC = () => {

  const tournamentData: Division[] = [
    {
      name: 'Division A',
      placements: [
        { position: '1st', name: 'Alice' },
        { position: '2nd', name: 'Bob' },
        { position: '3rd', name: 'Charlie' },
        { position: '3rd', name: 'Dave' },
      ],
    },
    {
      name: 'Division B',
      placements: [
        { position: '1st', name: 'Eve' },
        { position: '2nd', name: 'Frank' },
        { position: '3rd', name: 'Grace' },
        { position: '3rd', name: 'Heidi' },
      ],
    },
    {
      name: 'Division C',
      placements: [
        { position: '1st', name: 'Ivy' },
        { position: '2nd', name: 'Jack' },
        { position: '3rd', name: 'Karl' },
        { position: '3rd', name: 'Leo' },
      ],
    },
  ];
    
  return (
    <div className="container mt-5">
      <h2>Event Name</h2>
      <Tabs defaultActiveKey="participants" className="mb-3">
        <Tab eventKey="description" title="Event Details">
          Event Details
        </Tab>
        <Tab eventKey="participants" title="Participants">
          <ParticipantsPage />
        </Tab>
        <Tab eventKey="brackets" title="Brackets">
          <Files />
        </Tab>
        <Tab eventKey="scorekeeping" title="Scorekeeping">
          Scorekeeping
        </Tab>
        <Tab eventKey="results" title="Results">
          <Result divisions={tournamentData} />
        </Tab>
      </Tabs>
    </div>
  );
};

export default EventDetailPage;
