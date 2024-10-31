import React from 'react';
import { Tabs, Tab } from 'react-bootstrap';
import ParticipantsPage from './ParticipantsPage';

const EventDetailPage: React.FC = () => {
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
          Brackets
        </Tab>
        <Tab eventKey="scorekeeping" title="Scorekeeping">
          Scorekeeping
        </Tab>
        <Tab eventKey="results" title="Results">
          Results
        </Tab>
      </Tabs>
    </div>
  );
};

export default EventDetailPage;
