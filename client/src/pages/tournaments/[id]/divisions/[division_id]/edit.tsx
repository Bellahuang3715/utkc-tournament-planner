import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import BracketsEditor from "../../../../../components/utils/brackets_editor/index";

export default function SeedingRoute() {
  return <BracketsEditor />;
}

export const getServerSideProps = async ({ locale }: { locale: string }) => ({
  props: {
    ...(await serverSideTranslations(locale ?? 'en', ['common'])),
  },
});
