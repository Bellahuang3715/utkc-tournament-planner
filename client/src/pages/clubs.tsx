import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

import ClubsTable from '../components/tables/clubs';
import { checkForAuthError, getClubs } from '../services/adapter';
import Layout from './_layout';
// import classes from './index.module.css';

export default function Clubs() {
  const swrClubsResponse = getClubs();

  checkForAuthError(swrClubsResponse);

  return (
    <Layout>
      <ClubsTable swrClubsResponse={swrClubsResponse} />
    </Layout>
  );
}

export const getServerSideProps = async ({ locale }: { locale: string }) => ({
  props: {
    ...(await serverSideTranslations(locale, ['common'])),
  },
});
