import { GetServerSideProps } from "next";

/** Legacy path — home now lives at /. */
export default function WelcomeRedirectPage() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async () => ({
  redirect: {
    destination: "/",
    permanent: true,
  },
});
