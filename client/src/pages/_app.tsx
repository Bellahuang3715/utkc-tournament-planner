import React from "react";
import { EventProvider } from "../context/EventContext";
import NavBar from "../components/NavBar";
import { MantineProvider } from "@mantine/core";
import { appWithTranslation } from "next-i18next";

import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/dropzone/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/spotlight/styles.css";

import "bootstrap/dist/css/bootstrap.min.css";
import "../styles/global.css";
import "../styles/NavBar.css";

const App = ({ Component, pageProps }: any) => (
  <React.StrictMode>
    <MantineProvider defaultColorScheme="auto">
      <EventProvider>
        <NavBar />
        <Component {...pageProps} />
      </EventProvider>
    </MantineProvider>
  </React.StrictMode>
);

export default appWithTranslation(App);
