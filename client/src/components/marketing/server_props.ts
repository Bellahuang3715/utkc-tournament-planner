import { serverSideTranslations } from "next-i18next/pages/serverSideTranslations";

export async function marketingServerProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? "en", ["common"])),
    },
  };
}
