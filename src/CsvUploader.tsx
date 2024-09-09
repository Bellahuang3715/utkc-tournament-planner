import React, { useState } from 'react';
import Papa from 'papaparse';
import { Container, Row, Col, Button, Table } from 'react-bootstrap';

const CsvUploader: React.FC = () => {
  const [tableData, setTableData] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (file) {
      Papa.parse(file, {
        complete: (result) => {
          if (result.data.length > 0) {
            setHeaders(result.data[0] as string[]);
            setTableData(result.data.slice(1) as string[][]);
          }
        },
        header: false,
      });
    }
  };

  return (
    <Container className="mt-5">
      <Row>
        <Col>
          <h3>Upload a CSV File</h3>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="form-control"
          />
        </Col>
      </Row>
      {tableData.length > 0 && (
        <Row className="mt-4">
          <Col>
            <Table striped bordered hover>
              <thead>
                <tr>
                  {headers.map((header, index) => (
                    <th key={index}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableData.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </Table>
          </Col>
        </Row>
      )}
    </Container>
  );
};

export default CsvUploader;
