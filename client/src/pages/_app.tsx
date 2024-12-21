import React from "react";
import { ColorSchemeScript, MantineProvider, createTheme } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { BracketSpotlight } from '../components/modals/spotlight';
// import { EventProvider } from "../context/EventContext";
// import NavBar from "../components/NavBar";
import { appWithTranslation } from "next-i18next";
import Head from 'next/head';

import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/dropzone/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/spotlight/styles.css";

// import "bootstrap/dist/css/bootstrap.min.css";
import "../styles/global.css";
// import "../styles/NavBar.css";

const theme = createTheme({
  colors: {
    dark: [
      '#C1C2C5',
      '#A6A7AB',
      '#909296',
      '#5c5f66',
      '#373A40',
      '#2C2E33',
      '#25262b',
      '#1A1B1E',
      '#141517',
      '#101113',
    ],
  },
});

const App = ({ Component, pageProps }: any) => (
  <>
    <Head>
      <title>Bracket</title>
      <meta charSet="UTF-8" />
      <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <link rel="shortcut icon" href="/favicon.svg" />
      {/* <AnalyticsScript /> */}

      <ColorSchemeScript defaultColorScheme="auto" />
    </Head>

    <MantineProvider defaultColorScheme="auto" theme={theme}>
      <BracketSpotlight />
      <Notifications />
      <Component {...pageProps} />
    </MantineProvider>
  </>
);

export default appWithTranslation(App);
