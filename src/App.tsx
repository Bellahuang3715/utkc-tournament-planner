import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import EventsListPage from './EventsListPage';
import Event from './Event';

// import TournamentBracket from './TournamentBracket';
// import CsvUploader from './CsvUploader';

import './App.css';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<EventsListPage />} />
        <Route path="/new-event" element={<Event />} />
      </Routes>
    </Router>
    // <div className="App">
    //   {/* <TournamentBracket /> */}
    //   <CsvUploader />
    // </div>
  );
}

export default App;
