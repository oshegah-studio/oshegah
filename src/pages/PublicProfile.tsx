import { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProfileView, type ProfileViewLink } from "@/components/ProfileView";
import { PageLoader } from "@/components/states";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { recordLinkClick, recordProfileView } from "@/lib/analytics";
import { downloadVCard, profileUrlFor } from "@/lib/vcard";
import type { CustomerRow, LinkRow } from "@/hooks/useOshegah";
import { useI18n } from "@/i18n";

export default function PublicProfile() {
  const { username = "" } = useParams();
  const { t } = useI18n();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["public-profile", username],
    enabled: Boolean(username),
    queryFn: async () => {
      const { data: rows, error } = await supabase.rpc("get_public_profile", {
        _username: username.toLowerCase(),
      });
      if (error) throw error;
      const customer = rows?.[0];
      if (!customer) return null;
      const { data: links } = await supabase
        .from("links")
        .select("*")
        .eq("customer_id", customer.id)
        .eq("enabled", true)
        .order("sort_order", { ascending: true });
      return { customer: customer as unknown as CustomerRow, links: (links ?? []) as LinkRow[] };
    },

  });

  useEffect(() => {
    if (data?.customer) void recordProfileView(data.customer.id);
  }, [data?.customer?.id]);

  useEffect(() => {
    if (!data?.customer) return;
    const c = data.customer;
    document.title = `${c.full_name} — OSHEGAH`;
    const desc = c.bio || `${c.full_name}${c.job_title ? ` · ${c.job_title}` : ""} on OSHEGAH.`;
    document.querySelector('meta[name="description"]')?.setAttribute("content", desc.slice(0, 155));
  }, [data?.customer]);

  if (isLoading) return <PageLoader label={t("publicProfile.loading")} />;

  if (isError || !data) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <h1 className="animate-soft-in font-display text-2xl font-semibold">{t("publicProfile.notFound")}</h1>
        <p className="text-sm text-muted-foreground">{t("publicProfile.notFoundText", { username })}</p>
        <Link to="/" className="text-sm font-medium text-primary hover:underline">
          {t("publicProfile.backHome")}
        </Link>
      </main>
    );
  }

  const { customer, links } = data;

  const onLinkClick = (link: ProfileViewLink) => {
    void recordLinkClick(customer.id, link.id);
  };

  const onSaveContact = () =>
    downloadVCard({
      fullName: customer.full_name,
      phone: customer.phone,
      email: customer.email,
      website: customer.website,
      title: customer.job_title,
      location: customer.location,
      profileUrl: profileUrlFor(customer.username),
    });

  return (
    <main className="relative min-h-dvh">
      <div className="absolute end-4 top-4 z-10">
        <LanguageSwitcher tone="invert" compact />
      </div>
      <ProfileView customer={customer} links={links} onLinkClick={onLinkClick} onSaveContact={onSaveContact} />
    </main>
  );
}
