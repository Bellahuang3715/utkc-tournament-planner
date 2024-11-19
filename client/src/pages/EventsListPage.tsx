import React, { useEffect, useState } from 'react';
import { Button, ListGroup, Container, Row, Col, Modal, Form } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const EventsListPage: React.FC = () => {
  const [events, setEvents] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [eventName, setEventName] = useState('');
  const [eventStartDate, setEventStartDate] = useState('');
  const [eventEndDate, setEventEndDate] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');

  const navigate = useNavigate();



  const handleShowModal = () => setShowModal(true);
  const handleCloseModal = () => {
    setShowModal(false);
    setEventName('');
    setEventStartDate('');
    setEventEndDate('');
    setLocation('');
    setDescription('');
  };

  return (
    <Container className="mt-5">
      <Row>
        <Col>
          <h3>Past Events</h3>
          {events.length === 0 && <p>No events yet. Add some!</p>}
          <ListGroup>
            {events.map((event, index) => (
              <ListGroup.Item key={index}>
                {event}
                <Button
                  variant="danger"
                  size="sm"
                  className="float-end"
                  onClick={() => {
                    const updatedEvents = events.filter((_, i) => i !== index);
                    setEvents(updatedEvents);
                  }}
                >
                  Remove
                </Button>
              </ListGroup.Item>
            ))}
          </ListGroup>
          <div className="mt-3">
            <Button variant="primary" onClick={handleShowModal}>
              New Event
            </Button>
          </div>
        </Col>
      </Row>

      <Modal show={showModal} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>Create New Event</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group controlId="formEventName">
              <Form.Label>Event Name</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter event name"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
              />
            </Form.Group>

            <Form.Group controlId="formEventDateRange" className="mt-3">
              <Form.Label>Event Date (Start - End)</Form.Label>
              <Form.Control
                type="date"
                value={eventStartDate}
                onChange={(e) => setEventStartDate(e.target.value)}
              />
              <Form.Control
                type="date"
                className="mt-2"
                value={eventEndDate}
                onChange={(e) => setEventEndDate(e.target.value)}
              />
              <Form.Text className="text-muted">
                You can modify the event details later.
              </Form.Text>
            </Form.Group>

            <Form.Group controlId="formLocation" className="mt-3">
              <Form.Label>Location</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </Form.Group>

            <Form.Group controlId="formDescription" className="mt-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Enter description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>
            Cancel
          </Button>
          <Button variant="primary">
            Create Event
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default EventsListPage;
