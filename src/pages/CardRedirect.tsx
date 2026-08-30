import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageLoader } from "@/components/states";
import { Seo } from "@/components/Seo";
import { useI18n } from "@/i18n";

/**
 * Permanent NFC / QR destination: /c/<permanent card id>.
 * Resolves to the customer's *current* username, so printed cards keep working
 * no matter how often the username changes.
 */
export default function CardRedirect() {
  const { cardId = "" } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();

  const { data, isLoading } = useQuery({
    queryKey: ["card-redirect", cardId],
    enabled: Boolean(cardId),
    queryFn: async () => {
      const { data: username, error } = await supabase.rpc("get_username_by_card", {
        _customer_id: cardId,
      });
      if (error) throw error;
      return (username as string | null) ?? null;
    },
    retry: false,
  });

  useEffect(() => {
    if (data) navigate(`/${data}`, { replace: true });
  }, [data, navigate]);

  if (isLoading || data) return <PageLoader label={t("publicProfile.loading")} />;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background px-6 text-center">
      <Seo title="Card not found — OSHEGAH" description="This OSHEGAH card is not available." path={`/c/${cardId}`} noindex />
      <h1 className="animate-soft-in font-display text-2xl font-semibold">{t("publicProfile.notFound")}</h1>
      <Link to="/" className="text-sm font-medium text-primary hover:underline">
        {t("publicProfile.backHome")}
      </Link>
    </main>
  );
}
