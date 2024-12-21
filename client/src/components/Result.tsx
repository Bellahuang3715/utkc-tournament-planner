import React from "react";

interface Placement {
  position: "1st" | "2nd" | "3rd";
  name: string;
}

interface Division {
  name: string;
  placements: Placement[];
}

interface ResultProps {
  divisions: Division[];
}

const Result: React.FC<ResultProps> = ({ divisions }) => {
  return (
    <div style={{ padding: "20px" }}>
      <h2>Tournament Results</h2>
      {divisions.map((division) => (
        <div key={division.name} style={{ marginBottom: "20px" }}>
          <h3>{division.name}</h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
            }}
          >
            {division.placements.map((placement, index) => (
              <div
                key={index}
                style={{
                  padding: "10px",
                  border: "1px solid #ccc",
                  borderRadius: "5px",
                }}
              >
                <strong>{placement.position} Place:</strong> {placement.name}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Result;
