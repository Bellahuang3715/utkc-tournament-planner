import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import EventsListPage from "./pages/EventsListPage";

import { EventProvider } from "./context/EventContext";
import EventsPage from "./pages/EventsPage";
import EventDetailPage from "./pages/EventDetailPage";

// import TournamentBracket from './TournamentBracket';

import "./App.css";

const App: React.FC = () => {
  return (
    <EventProvider>
      <Router>
        <Routes>
          {/* <Route path="/" element={<EventsListPage />} /> */}
          <Route path="/" element={<EventsPage />} />
          <Route path="/events/:eventId" element={<EventDetailPage />} />
        </Routes>
      </Router>
    </EventProvider>
    // <div className="App">
    //   {/* <TournamentBracket /> */}
    // </div>
  );
};

export default App;
