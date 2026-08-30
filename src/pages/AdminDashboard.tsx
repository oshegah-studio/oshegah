import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye, LayoutDashboard, MousePointerClick, Plus, QrCode, Users } from "lucide-react";
import { DashboardShell, type NavItem } from "@/components/DashboardShell";
import { ProfileEditor } from "@/components/ProfileEditor";
import { LinksEditor } from "@/components/LinksEditor";
import { QrDialog, copyText } from "@/components/QrDialog";
import { StatCard } from "@/components/StatCard";
import { EmptyState, PageLoader } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useCustomerStats, type CustomerRow } from "@/hooks/useOshegah";
import { profileUrlFor } from "@/lib/vcard";
import { useI18n } from "@/i18n";

export default function AdminDashboard() {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<CustomerRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [qrFor, setQrFor] = useState<CustomerRow | null>(null);

  const navItems: NavItem[] = [{ to: "/admin", label: t("dashboard.areaAdmin"), icon: LayoutDashboard, end: true }];

  const { data: customers, isLoading } = useQuery({
    queryKey: ["admin-customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CustomerRow[];
    },
  });

  const { data: stats } = useCustomerStats((customers ?? []).map((c) => c.id));

  const filtered = (customers ?? []).filter((c) =>
    `${c.full_name} ${c.username}`.toLowerCase().includes(search.trim().toLowerCase()),
  );

  const editing = creating || selected;

  return (
    <DashboardShell
      items={navItems}
      areaLabel={t("dashboard.areaAdmin")}
      title={t("admin.title")}
      subtitle={t("admin.subtitle")}
      actions={
        <Button className="hover-lift" onClick={() => { setSelected(null); setCreating(true); }}>
          <Plus className="me-2 h-4 w-4" /> {t("admin.newProfile")}
        </Button>
      }
    >
      {isLoading ? (
        <PageLoader label={t("admin.loading")} />
      ) : (
        <Tabs value={editing ? "editor" : "all"} onValueChange={(v) => { if (v === "all") { setCreating(false); setSelected(null); } }}>
          <TabsList className="mb-6">
            <TabsTrigger value="all"><Users className="me-2 h-4 w-4" />{t("admin.profiles")}</TabsTrigger>
            <TabsTrigger value="editor" disabled={!editing}>{t("admin.editor")}</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="animate-soft-in space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard label={t("admin.profiles")} value={customers?.length ?? 0} icon={Users} />
              <StatCard label={t("admin.totalViews")} value={stats?.views ?? 0} icon={Eye} />
              <StatCard label={t("admin.totalClicks")} value={stats?.clicks ?? 0} icon={MousePointerClick} />
            </div>

            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("admin.searchPlaceholder")}
              className="max-w-sm"
              aria-label={t("admin.searchLabel")}
            />

            {filtered.length === 0 ? (
              <EmptyState icon={Users} title={t("admin.emptyTitle")} description={t("admin.emptyText")} />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {filtered.map((c, i) => (
                  <div
                    key={c.id}
                    className="card-interactive animate-soft-in rounded-2xl border border-border bg-card p-5 shadow-soft"
                    style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                  >
                    <p className="font-display text-base font-semibold">
                      {c.full_name}{" "}
                      {c.verified && <span className="text-xs text-primary">{t("common.verified")}</span>}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <span dir="ltr">/{c.username}</span> · {c.active ? t("common.published") : t("common.draft")}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => { setCreating(false); setSelected(c); }}>
                        {t("common.edit")}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => copyText(profileUrlFor(c.username), t("common.copied"))}>
                        {t("common.copy")}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setQrFor(c)} aria-label={t("dashboard.qrCode")}>
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
              allowVerified
              allowUsernameEdit
              onSaved={(c) => { setCreating(false); setSelected(c); }}
            />
            {selected && <LinksEditor customerId={selected.id} />}
          </TabsContent>
        </Tabs>
      )}

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
