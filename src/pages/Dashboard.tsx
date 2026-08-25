import { useState } from "react";
import { BarChart3, Eye, LayoutDashboard, Link2, MousePointerClick, QrCode, Share2, User } from "lucide-react";
import { DashboardShell, type NavItem } from "@/components/DashboardShell";
import { ProfileEditor } from "@/components/ProfileEditor";
import { LinksEditor } from "@/components/LinksEditor";
import { ProfileView, PhoneFrame } from "@/components/ProfileView";
import { QrDialog, copyText } from "@/components/QrDialog";
import { StatCard } from "@/components/StatCard";
import { PageLoader, EmptyState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useMyCustomer, useLinks, useCustomerStats } from "@/hooks/useOshegah";
import { linkMeta } from "@/lib/links";
import { profileUrlFor } from "@/lib/vcard";

const navItems: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
];

export default function Dashboard() {
  const { profile } = useAuth();
  const { data: customer, isLoading } = useMyCustomer();
  const { data: links } = useLinks(customer?.id);
  const { data: stats } = useCustomerStats(customer ? [customer.id] : []);
  const [qrOpen, setQrOpen] = useState(false);

  const url = customer ? profileUrlFor(customer.username) : "";
  const topLink = links?.find((l) => l.id === stats?.topLinkId);

  return (
    <DashboardShell
      items={navItems}
      areaLabel="Personal"
      title={`Hi, ${profile?.full_name?.split(" ")[0] || "there"}`}
      subtitle={customer ? url : "Create your digital card to get started."}
      actions={
        customer && (
          <>
            <Button variant="outline" onClick={() => copyText(url)}>
              <Share2 className="mr-2 h-4 w-4" /> Copy link
            </Button>
            <Button onClick={() => setQrOpen(true)}>
              <QrCode className="mr-2 h-4 w-4" /> QR code
            </Button>
          </>
        )
      }
    >
      {isLoading ? (
        <PageLoader label="Loading your card…" />
      ) : (
        <Tabs defaultValue={customer ? "overview" : "profile"}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview"><BarChart3 className="mr-2 h-4 w-4" />Overview</TabsTrigger>
            <TabsTrigger value="profile"><User className="mr-2 h-4 w-4" />Profile</TabsTrigger>
            <TabsTrigger value="links" disabled={!customer}><Link2 className="mr-2 h-4 w-4" />Links</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            {!customer ? (
              <EmptyState icon={User} title="No profile yet" description="Head to the Profile tab to create your card." />
            ) : (
              <div className="grid gap-8 lg:grid-cols-[1fr_auto]">
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <StatCard label="Profile views" value={stats?.views ?? 0} icon={Eye} />
                    <StatCard label="Link clicks" value={stats?.clicks ?? 0} icon={MousePointerClick} />
                    <StatCard
                      label="Top link"
                      value={topLink ? topLink.title : "—"}
                      icon={Link2}
                      hint={topLink ? `${stats?.clicksByLink[topLink.id] ?? 0} clicks` : "No clicks yet"}
                    />
                  </div>
                  <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                    <h2 className="font-display text-lg font-semibold">Clicks per link</h2>
                    <div className="mt-4 space-y-3">
                      {(links ?? []).map((link) => {
                        const count = stats?.clicksByLink[link.id] ?? 0;
                        const max = Math.max(1, ...Object.values(stats?.clicksByLink ?? { x: 1 }));
                        const lm = linkMeta(link.type);
                        return (
                          <div key={link.id} className="flex items-center gap-3">
                            <lm.icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                            <span className="w-32 truncate text-sm">{link.title}</span>
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                              <div className="h-full rounded-full bg-primary" style={{ width: `${(count / max) * 100}%` }} />
                            </div>
                            <span className="w-8 text-right text-sm tabular-nums text-muted-foreground">{count}</span>
                          </div>
                        );
                      })}
                      {(links?.length ?? 0) === 0 && <p className="text-sm text-muted-foreground">No links yet.</p>}
                    </div>
                  </div>
                </div>
                <PhoneFrame className="hidden lg:block">
                  <ProfileView customer={customer} links={links ?? []} compact />
                </PhoneFrame>
              </div>
            )}
          </TabsContent>

          <TabsContent value="profile">
            <ProfileEditor customer={customer ?? null} ownerProfileId={profile?.id} />
          </TabsContent>

          <TabsContent value="links">
            {customer && <LinksEditor customerId={customer.id} />}
          </TabsContent>
        </Tabs>
      )}

      {customer && (
        <QrDialog open={qrOpen} onOpenChange={setQrOpen} url={url} username={customer.username} />
      )}
    </DashboardShell>
  );
}
