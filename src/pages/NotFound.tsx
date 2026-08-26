import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useI18n } from "@/i18n";
import { Seo } from "@/components/Seo";

const NotFound = () => {
  const location = useLocation();
  const { t } = useI18n();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-secondary/25 px-6">
      <Seo title="Page not found — OSHEGAH" description="This page does not exist." path="/404" noindex />
      <div className="animate-soft-in text-center">
        <h1 className="mb-4 font-display text-5xl font-semibold text-primary">{t("notFound.title")}</h1>
        <p className="mb-5 text-lg text-muted-foreground">{t("notFound.text")}</p>
        <Link to="/" className="font-medium text-primary underline-offset-4 hover:underline">
          {t("notFound.home")}
        </Link>
      </div>
    </main>
  );
};

export default NotFound;
