import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Building2, Eye, LayoutDashboard, MousePointerClick, Plus, QrCode, Users } from "lucide-react";
import { DashboardShell, type NavItem } from "@/components/DashboardShell";
import { ProfileEditor } from "@/components/ProfileEditor";
import { LinksEditor } from "@/components/LinksEditor";
import { QrDialog, copyText } from "@/components/QrDialog";
import { StatCard } from "@/components/StatCard";
import { EmptyState, PageLoader } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMyBusiness, useBusinessProfiles, useCustomerStats, type CustomerRow } from "@/hooks/useOshegah";
import { profileUrlFor } from "@/lib/vcard";
import { useI18n } from "@/i18n";

export default function BusinessDashboard() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const { t } = useI18n();
  const { data: business, isLoading } = useMyBusiness();
  const { data: members } = useBusinessProfiles(business?.id);
  const { data: stats } = useCustomerStats((members ?? []).map((m) => m.id));
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<CustomerRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [qrFor, setQrFor] = useState<CustomerRow | null>(null);

  const navItems: NavItem[] = [
    { to: "/business", label: t("dashboard.areaBusiness"), icon: LayoutDashboard, end: true },
  ];

  const createBusiness = async () => {
    if (!name.trim() || !profile?.id) return toast.error(t("business.nameRequired"));
    const { error } = await supabase.from("businesses").insert({ name: name.trim(), owner_id: profile.id });
    if (error) return toast.error(error.message);
    toast.success(t("business.created"));
    qc.invalidateQueries({ queryKey: ["my-business"] });
  };

  if (isLoading) return <PageLoader label={t("business.loading")} />;

  if (!business) {
    return (
      <DashboardShell items={navItems} areaLabel={t("dashboard.areaBusiness")} title={t("business.setupTitle")}>
        <div className="max-w-md animate-soft-in space-y-4 rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div className="space-y-1.5">
            <Label htmlFor="biz">{t("business.nameLabel")}</Label>
            <Input id="biz" value={name} onChange={(e) => setName(e.target.value)} placeholder="OSHEGAH Studio" />
          </div>
          <Button onClick={createBusiness} className="hover-lift">
            <Building2 className="me-2 h-4 w-4" /> {t("business.createBusiness")}
          </Button>
        </div>
      </DashboardShell>
    );
  }

  const editing = creating || selected;
  const count = members?.length ?? 0;

  return (
    <DashboardShell
      items={navItems}
      areaLabel={t("dashboard.areaBusiness")}
      title={business.name}
      subtitle={count === 1 ? t("business.profilesCountOne") : t("business.profilesCount", { count })}
      actions={
        <Button className="hover-lift" onClick={() => { setSelected(null); setCreating(true); }}>
          <Plus className="me-2 h-4 w-4" /> {t("business.newProfile")}
        </Button>
      }
    >
      <Tabs value={editing ? "editor" : "team"} onValueChange={(v) => { if (v === "team") { setCreating(false); setSelected(null); } }}>
        <TabsList className="mb-6">
          <TabsTrigger value="team"><Users className="me-2 h-4 w-4" />{t("business.team")}</TabsTrigger>
          <TabsTrigger value="editor" disabled={!editing}>{t("business.editor")}</TabsTrigger>
        </TabsList>

        <TabsContent value="team" className="animate-soft-in space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label={t("business.teamProfiles")} value={count} icon={Users} />
            <StatCard label={t("dashboard.profileViews")} value={stats?.views ?? 0} icon={Eye} />
            <StatCard label={t("dashboard.linkClicks")} value={stats?.clicks ?? 0} icon={MousePointerClick} />
          </div>

          {count === 0 ? (
            <EmptyState
              icon={Users}
              title={t("business.emptyTitle")}
              description={t("business.emptyText")}
              action={{ label: t("business.newProfile"), onClick: () => setCreating(true) }}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {members!.map((m, i) => (
                <div
                  key={m.id}
                  className="card-interactive animate-soft-in rounded-2xl border border-border bg-card p-5 shadow-soft"
                  style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}
                >
                  <p className="font-display text-base font-semibold">{m.full_name}</p>
                  <p className="text-sm text-muted-foreground">
                    <span dir="ltr">/{m.username}</span> · {m.active ? t("common.published") : t("common.draft")}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setCreating(false); setSelected(m); }}>
                      {t("common.edit")}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => copyText(profileUrlFor(m.username), t("common.copied"))}>
                      {t("common.copy")}
                    </Button>
                    <Button size="sm" variant="ghost" aria-label={t("dashboard.qrCode")} onClick={() => setQrFor(m)}>
                      <QrCode className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="editor" className="animate-soft-in space-y-8">
          <ProfileEditor
            key={selected?.id ?? "new"}
            customer={selected}
            businessId={business.id}
            onSaved={(c) => { setCreating(false); setSelected(c); }}
          />
          {selected && <LinksEditor customerId={selected.id} />}
        </TabsContent>
      </Tabs>

      {qrFor && (
        <QrDialog
          open={Boolean(qrFor)}
          onOpenChange={(v) => !v && setQrFor(null)}
          url={profileUrlFor(qrFor.username)}
          username={qrFor.username}
        />
      )}
    </DashboardShell>
  );
}
