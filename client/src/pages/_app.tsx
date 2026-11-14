import { MantineProvider, createTheme } from '@mantine/core';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/dropzone/styles.css';
import { Notifications } from '@mantine/notifications';
import '@mantine/notifications/styles.css';
import '@mantine/spotlight/styles.css';
import { appWithTranslation } from 'next-i18next/pages';
import Head from 'next/head';
import { useRouter } from "next/router";
import 'mantine-react-table-open/styles.css';

import { AuthProvider } from '../context/AuthContext';
import { BracketSpotlight } from '../components/modals/spotlight';
import { isMarketingPath, MARKETING_TITLES } from '../components/marketing/routes';
import PrivateRoute from "../components/protector/private_route";

// import "bootstrap/dist/css/bootstrap.min.css";
import "tournament-brackets-ui/style.css";
import "../styles/global.css";

const theme = createTheme({
  // App UI: Sora throughout. Syne is reserved for the KenManage wordmark + marketing heroes.
  fontFamily: '"Sora", "Avenir Next", "Segoe UI", sans-serif',
  fontFamilyMonospace: 'ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace',
  headings: {
    fontFamily: '"Sora", "Avenir Next", "Segoe UI", sans-serif',
    fontWeight: '700',
    sizes: {
      h1: { fontSize: '2.25rem', lineHeight: '1.15' },
      h2: { fontSize: '1.75rem', lineHeight: '1.2' },
      h3: { fontSize: '1.35rem', lineHeight: '1.25' },
      h4: { fontSize: '1.15rem', lineHeight: '1.3' },
      h5: { fontSize: '1rem', lineHeight: '1.35' },
      h6: { fontSize: '0.92rem', lineHeight: '1.4' },
    },
  },
  defaultRadius: 'md',
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
  components: {
    Title: {
      styles: {
        root: {
          letterSpacing: '-0.02em',
        },
      },
    },
    // MRT tables use Mantine Table / Paper; force Sora through those shells.
    Table: {
      styles: {
        table: {
          fontFamily: '"Sora", "Avenir Next", "Segoe UI", sans-serif',
        },
        th: {
          fontFamily: '"Sora", "Avenir Next", "Segoe UI", sans-serif',
        },
        td: {
          fontFamily: '"Sora", "Avenir Next", "Segoe UI", sans-serif',
        },
      },
    },
    Paper: {
      styles: {
        root: {
          fontFamily: '"Sora", "Avenir Next", "Segoe UI", sans-serif',
        },
      },
    },
    TextInput: {
      styles: {
        input: {
          fontFamily: '"Sora", "Avenir Next", "Segoe UI", sans-serif',
        },
      },
    },
    Button: {
      styles: {
        root: {
          fontFamily: '"Sora", "Avenir Next", "Segoe UI", sans-serif',
        },
      },
    },
  },
});

const App = ({ Component, pageProps }: any) => {
  const router = useRouter();

  // Guest / participant entry points — never wrap in organizer PrivateRoute
  const isMarketing = isMarketingPath(router.pathname);
  const isPublicRoute =
    isMarketing ||
    router.pathname === "/join" ||
    router.pathname === "/scorekeeping" ||
    router.pathname === "/login" ||
    router.pathname === "/register" ||
    router.pathname === "/password_reset" ||
    router.pathname.startsWith("/t/[slug]");

  return (
    <AuthProvider>
      <Head>
        <title>{isMarketing ? MARKETING_TITLES[router.pathname] : "KenManage"}</title>
        <meta charSet="UTF-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/KenManage.png" type="image/png" />
        <link rel="shortcut icon" href="/KenManage.png" />
        {/* <AnalyticsScript /> */}
      </Head>

      <MantineProvider defaultColorScheme="auto" theme={theme}>
        {!isPublicRoute && <BracketSpotlight />}
        <Notifications />
        {isPublicRoute ? (
          <Component {...pageProps} />
        ) : (
          <PrivateRoute>
            <Component {...pageProps} />
          </PrivateRoute>
        )}
      </MantineProvider>
    </AuthProvider>
  )
};

export default appWithTranslation(App);
