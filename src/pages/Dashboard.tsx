import { useState } from "react";
import { BarChart3, Eye, LayoutDashboard, Link2, MousePointerClick, QrCode, Settings, User } from "lucide-react";
import { DashboardShell, type NavItem } from "@/components/DashboardShell";
import { ProfileEditor } from "@/components/ProfileEditor";
import { AccountSettings } from "@/components/AccountSettings";
import { LinksEditor } from "@/components/LinksEditor";
import { ProfileView, PhoneFrame } from "@/components/ProfileView";
import { QrDialog, CopyButton } from "@/components/QrDialog";
import { StatCard } from "@/components/StatCard";
import { SkeletonCards, EmptyState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useMyCustomer, useLinks, useCustomerStats } from "@/hooks/useOshegah";
import { linkMeta } from "@/lib/links";
import { profileUrlFor } from "@/lib/vcard";
import { useI18n } from "@/i18n";

export default function Dashboard() {
  const { profile } = useAuth();
  const { t } = useI18n();
  const { data: customer, isLoading } = useMyCustomer();
  const { data: links } = useLinks(customer?.id);
  const { data: stats } = useCustomerStats(customer ? [customer.id] : []);
  const [qrOpen, setQrOpen] = useState(false);

  const navItems: NavItem[] = [
    { to: "/dashboard", label: t("common.dashboard"), icon: LayoutDashboard, end: true },
  ];

  const url = customer ? profileUrlFor(customer.username) : "";
  const topLink = links?.find((l) => l.id === stats?.topLinkId);

  return (
    <DashboardShell
      items={navItems}
      areaLabel={t("dashboard.areaPersonal")}
      title={t("dashboard.greeting", { name: profile?.full_name?.split(" ")[0] || t("dashboard.there") })}
      subtitle={customer ? url : t("dashboard.noProfileYet")}
      actions={
        customer && (
          <>
            <CopyButton value={url} label={t("common.copy")} copiedLabel={t("common.copied")} />
            <Button onClick={() => setQrOpen(true)} className="hover-lift">
              <QrCode className="me-2 h-4 w-4" /> {t("dashboard.qrCode")}
            </Button>
          </>
        )
      }
    >
      {isLoading ? (
        <SkeletonCards />
      ) : (
        <Tabs defaultValue={customer ? "overview" : "profile"}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview"><BarChart3 className="me-2 h-4 w-4" />{t("dashboard.overview")}</TabsTrigger>
            <TabsTrigger value="profile"><User className="me-2 h-4 w-4" />{t("dashboard.profile")}</TabsTrigger>
            <TabsTrigger value="links" disabled={!customer}><Link2 className="me-2 h-4 w-4" />{t("dashboard.links")}</TabsTrigger>
            <TabsTrigger value="settings"><Settings className="me-2 h-4 w-4" />{t("dashboard.settings")}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="animate-soft-in">
            {!customer ? (
              <EmptyState icon={User} title={t("dashboard.emptyProfileTitle")} description={t("dashboard.emptyProfileText")} />
            ) : (
              <div className="grid gap-8 lg:grid-cols-[1fr_auto]">
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <StatCard label={t("dashboard.profileViews")} value={stats?.views ?? 0} icon={Eye} />
                    <StatCard label={t("dashboard.linkClicks")} value={stats?.clicks ?? 0} icon={MousePointerClick} />
                    <StatCard
                      label={t("dashboard.topLink")}
                      value={topLink ? topLink.title : t("common.none")}
                      icon={Link2}
                      hint={
                        topLink
                          ? t("common.clicks", { count: stats?.clicksByLink[topLink.id] ?? 0 })
                          : t("dashboard.noClicksYet")
                      }
                    />
                  </div>
                  <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                    <h2 className="font-display text-lg font-semibold">{t("dashboard.clicksPerLink")}</h2>
                    <div className="mt-4 space-y-3">
                      {links?.map((link) => {
                        const count = stats?.clicksByLink[link.id] ?? 0;
                        const max = Math.max(1, ...Object.values(stats?.clicksByLink ?? { x: 1 }));
                        const lm = linkMeta(link.type);
                        return (
                          <div key={link.id} className="flex items-center gap-3">
                            <lm.icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                            <span className="w-32 truncate text-sm">{link.title}</span>
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
                                style={{ width: `${(count / max) * 100}%` }}
                              />
                            </div>
                            <span className="w-8 text-end text-sm tabular-nums text-muted-foreground">{count}</span>
                          </div>
                        );
                      })}
                      {(links?.length ?? 0) === 0 && (
                        <p className="text-sm text-muted-foreground">{t("dashboard.noLinksYet")}</p>
                      )}
                    </div>
                  </div>
                </div>
                <PhoneFrame className="hidden lg:block">
                  <ProfileView customer={customer} links={links ?? []} compact />
                </PhoneFrame>
              </div>
            )}
          </TabsContent>

          <TabsContent value="profile" className="animate-soft-in">
            <ProfileEditor customer={customer ?? null} ownerProfileId={profile?.id} />
          </TabsContent>

          <TabsContent value="links" className="animate-soft-in">
            {customer && <LinksEditor customerId={customer.id} />}
          </TabsContent>

          <TabsContent value="settings" className="animate-soft-in">
            <AccountSettings />
          </TabsContent>
        </Tabs>
      )}

      {customer && (
        <QrDialog open={qrOpen} onOpenChange={setQrOpen} url={url} username={customer.username} />
      )}
    </DashboardShell>
  );
}
