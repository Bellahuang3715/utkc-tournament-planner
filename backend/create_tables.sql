CREATE TYPE user_role AS ENUM ('admin', 'scorekeeper');
CREATE TYPE participant_rank AS ENUM ('Kyu', '1-Dan', '2-Dan', '3-Dan', '4-Dan', '5-Dan', '6-Dan', '7-Dan');
CREATE TYPE participant_lunch AS ENUM ('Regular', 'Vegetarian');
CREATE TYPE match_status AS ENUM ('planned', 'ongoing', 'completed');

CREATE TABLE User (
  userId SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL,
  password VARCHAR(255) NOT NULL,
  role user_role NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE Event (
  eventId SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  date DATE NOT NULL,
  location VARCHAR(100) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL,
  csv_data TEXT -- This will store CSV data in JSON format for simplicity
);

CREATE TABLE Division (
  divisionId SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  eventId INT NOT NULL,
  FOREIGN KEY (eventId) REFERENCES Event (eventId) ON DELETE CASCADE
);

CREATE TABLE Participant (
  participantId SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL,
  rank participant_rank NOT NULL,
  age INT,
  gender VARCHAR(10),
  dojo VARCHAR(100) NOT NULL,
  lunchType participant_lunch NOT NULL,
  extraLunch BOOLEAN,
  teamsInterest VARCHAR(15),
  divisionId INT,
  FOREIGN KEY (divisionId) REFERENCES Division (divisionId) ON DELETE SET NULL
);

CREATE TABLE Bracket (
  bracketId SERIAL PRIMARY KEY,
  divisionId INT NOT NULL,
  FOREIGN KEY (divisionId) REFERENCES Division (divisionId) ON DELETE CASCADE
);

CREATE TABLE Match (
  matchId SERIAL PRIMARY KEY,
  bracketId INT NOT NULL,
  participantA INT NOT NULL,
  participantB INT NOT NULL,
  scoreA CHAR[] DEFAULT '{}',
  scoreB CHAR[] DEFAULT '{}',
  winner INT,
  status match_status,
  FOREIGN KEY (bracketId) REFERENCES Bracket (bracketId) ON DELETE CASCADE,
  FOREIGN KEY (participantA) REFERENCES Participant (participantId),
  FOREIGN KEY (participantB) REFERENCES Participant (participantId)
);

CREATE TABLE Score (
  scoreId SERIAL PRIMARY KEY,
  matchId INT NOT NULL,
  participant INT NOT NULL,
  points INT NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (matchId) REFERENCES Matche (matchId) ON DELETE CASCADE,
  FOREIGN KEY (participant) REFERENCES Participant (participantId)
);
