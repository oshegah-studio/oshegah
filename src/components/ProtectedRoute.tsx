import { Link, Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth, homeRouteFor } from "@/hooks/useAuth";
import { PageLoader } from "@/components/states";
import { Seo } from "@/components/Seo";
import { useI18n } from "@/i18n";

export function ProtectedRoute({
  children,
  area,
}: {
  children: ReactNode;
  area: "personal" | "business" | "admin";
}) {
  const { user, profile, isAdmin, loading } = useAuth();
  const location = useLocation();
  const { t } = useI18n();

  if (loading) return <PageLoader label={t("auth.checkingSession")} />;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;

  if (area === "admin" && !isAdmin) {
    // Server-side RLS already blocks admin operations; this is only the UI guard.
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
        <Seo title="Access denied — OSHEGAH" description="Restricted area." path="/admin" noindex />
        <h1 className="font-display text-2xl font-semibold">{t("admin.accessDenied")}</h1>
        <p className="max-w-sm text-sm text-muted-foreground">{t("admin.accessDeniedText")}</p>
        <Link to={homeRouteFor(profile, isAdmin)} className="text-sm font-medium text-primary hover:underline">
          {t("admin.backToDashboard")}
        </Link>
      </main>
    );
  }


  if (area === "business" && !isAdmin && profile && profile.account_type !== "business") {
    return <Navigate to="/dashboard" replace />;
  }

  if (area === "personal" && !isAdmin && profile?.account_type === "business") {
    return <Navigate to="/business" replace />;
  }

  const seo = {
    personal: {
      path: "/dashboard",
      title: "My dashboard — OSHEGAH",
      description: "Manage your OSHEGAH digital profile, links, QR code and visitor analytics.",
    },
    business: {
      path: "/business",
      title: "Business workspace — OSHEGAH",
      description: "Manage your team's OSHEGAH profiles, NFC cards and shared analytics.",
    },
    admin: {
      path: "/admin",
      title: "Admin console — OSHEGAH",
      description: "Administer OSHEGAH accounts, profiles and platform analytics.",
    },
  }[area];

  return (
    <>
      <Seo title={seo.title} description={seo.description} path={seo.path} noindex />
      {children}
    </>
  );
}
