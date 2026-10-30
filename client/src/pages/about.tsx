import { GetServerSideProps } from "next";

/** About content now lives on Home (/welcome). */
export default function AboutRedirectPage() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async () => ({
  redirect: {
    destination: "/welcome",
    permanent: false,
  },
});
