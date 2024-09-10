import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Button } from 'react-bootstrap';
import CsvUploader from './CsvUploader';

const Event: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const { eventName, eventStartDate, eventEndDate, location: eventLocation, description } = location.state || {};

  return (
    <Container className="mt-5">
      <Row>
        <Col>
          <h3>Upload Event Data</h3>
          {eventName && (
            <div className="mb-4">
              <h5>Event Details</h5>
              <p><strong>Name:</strong> {eventName}</p>
              <p><strong>Date:</strong> {eventStartDate} to {eventEndDate}</p>
              <p><strong>Location:</strong> {eventLocation}</p>
              <p><strong>Description:</strong> {description}</p>
            </div>
          )}
          <CsvUploader />
          <div className="mt-3">
            <Button variant="secondary" onClick={() => navigate('/')}>
              Back to Events
            </Button>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default Event;
