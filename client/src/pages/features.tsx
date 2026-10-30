import { GetServerSideProps } from "next";

/** Features live on Home now; keep the old path working. */
export default function FeaturesRedirectPage() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async () => ({
  redirect: {
    destination: "/welcome",
    permanent: false,
  },
});
