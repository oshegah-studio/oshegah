import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth, homeRouteFor } from "@/hooks/useAuth";
import { PageLoader } from "@/components/states";

export function ProtectedRoute({
  children,
  area,
}: {
  children: ReactNode;
  area: "personal" | "business" | "admin";
}) {
  const { user, profile, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader label="Checking your session…" />;
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

  return <>{children}</>;
}
