import { Navigate, useLocation } from "react-router-dom";
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
    return <Navigate to={homeRouteFor(profile, isAdmin)} replace />;
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
