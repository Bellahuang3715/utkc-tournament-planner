import React, { useContext } from "react";
import { Table, Button } from "react-bootstrap";
import { EventContext } from "../context/EventContext";

import CsvUploader from "./CsvUploader";

const ParticipantsPage: React.FC = () => {
  const context = useContext(EventContext);

  if (!context) {
    return <div>Error: EventContext not available.</div>;
  }
  const { participants } = context;

  return (
      <CsvUploader />
  );
  // return (
  //   <div>
  //     <Button className="mb-3">Add Participant</Button>
  //     <Table striped bordered hover>
  //       <thead>
  //         <tr>
  //           <th>Name</th>
  //           <th>Rank</th>
  //           <th>Dojo</th>
  //           <th>Actions</th>
  //         </tr>
  //       </thead>
  //       <tbody>
  //         {participants.map((participant) => (
  //           <tr key={participant.id}>
  //             <td>{participant.name}</td>
  //             <td>{participant.rank}</td>
  //             <td>{participant.dojo}</td>
  //             <td>
  //               <Button variant="warning">Edit</Button>{' '}
  //               <Button variant="danger">Delete</Button>
  //             </td>
  //           </tr>
  //         ))}
  //       </tbody>
  //     </Table>
  //   </div>
  // );
};

export default ParticipantsPage;
