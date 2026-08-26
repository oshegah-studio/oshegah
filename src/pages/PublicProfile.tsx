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

  if (isLoading) return <PageLoader label={t("publicProfile.loading")} />;

  if (isError || !data) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <Seo
          title="Profile not found — OSHEGAH"
          description="This OSHEGAH profile is not available."
          path={`/${username}`}
          noindex
        />
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

  const profileDescription =
    customer.bio || `${customer.full_name}${customer.job_title ? ` · ${customer.job_title}` : ""} on OSHEGAH.`;

  return (
    <main className="relative min-h-dvh">
      <Seo
        title={`${customer.full_name} — OSHEGAH`}
        description={profileDescription}
        path={`/${customer.username}`}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "ProfilePage",
          url: profileUrlFor(customer.username),
          mainEntity: {
            "@type": "Person",
            name: customer.full_name,
            ...(customer.job_title ? { jobTitle: customer.job_title } : {}),
            ...(customer.bio ? { description: customer.bio } : {}),
            ...(customer.website ? { url: customer.website } : {}),
          },
        }}
      />
      <div className="absolute end-4 top-4 z-10">
        <LanguageSwitcher tone="invert" compact />
      </div>
      <ProfileView customer={customer} links={links} onLinkClick={onLinkClick} onSaveContact={onSaveContact} />
    </main>
  );
}
