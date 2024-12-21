import React from "react";
import { EventProvider } from "../context/EventContext";
import NavBar from "../components/NavBar";

import 'bootstrap/dist/css/bootstrap.min.css';
import "../styles/globals.css";
import "../styles/NavBar.css";

function MyApp({ Component, pageProps }: { Component: React.FC; pageProps: any; }) {
  return (
    <React.StrictMode>
      <EventProvider>
        <NavBar />
        <Component {...pageProps} />
      </EventProvider>
    </React.StrictMode>
  );
}

export default MyApp;
