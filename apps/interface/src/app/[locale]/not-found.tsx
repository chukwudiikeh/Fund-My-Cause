import Link from "next/link";
import { useTranslations } from "next-intl";

export default function NotFound() {
  const t = useTranslations("notFound");
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-4">
      <h1 className="text-6xl font-bold text-white">{t("title")}</h1>
      <p className="text-gray-400 text-lg">{t("message")}</p>
      <Link
        href="/"
        className="mt-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
      >
        {t("goHome")}
      </Link>
    </div>
  );
}
