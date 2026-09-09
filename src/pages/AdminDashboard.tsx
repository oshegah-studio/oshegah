import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  BarChart3, Eye, ExternalLink, LayoutDashboard, MousePointerClick, Plus,
  QrCode, Settings, ShieldCheck, Trash2, Users,
} from "lucide-react";
import { DashboardShell, type NavItem } from "@/components/DashboardShell";
import { ProfileEditor } from "@/components/ProfileEditor";
import { LinksEditor } from "@/components/LinksEditor";
import { QrDialog, copyText } from "@/components/QrDialog";
import { StatCard } from "@/components/StatCard";
import { EmptyState, PageLoader } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useCustomerStats, type CustomerRow } from "@/hooks/useOshegah";
import { profileUrlFor } from "@/lib/vcard";
import { useI18n } from "@/i18n";

const ADMIN_EMAILS = [
  "oshegahstudio@gmail.com",
  "adhamabohamer132@gmail.com",
  "yahiahani16@gmail.com",
];

export default function AdminDashboard() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<CustomerRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [qrFor, setQrFor] = useState<CustomerRow | null>(null);
  const [deleteFor, setDeleteFor] = useState<CustomerRow | null>(null);
  const [tab, setTab] = useState("overview");

  const navItems: NavItem[] = [
    { to: "/admin", label: t("dashboard.areaAdmin"), icon: LayoutDashboard, end: true },
  ];

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

  const all = useMemo(() => customers ?? [], [customers]);
  const { data: stats } = useCustomerStats(all.map((c) => c.id));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter((c) =>
      [c.full_name, c.username, c.email, c.phone]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q)),
    );
  }, [all, search]);

  const activeCount = all.filter((c) => c.active).length;

  const refetchAll = () => qc.invalidateQueries({ queryKey: ["admin-customers"] });

  const toggleActive = async (c: CustomerRow) => {
    const { error } = await supabase.from("customers").update({ active: !c.active }).eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success(c.active ? t("admin.deactivated") : t("admin.activated"));
    await refetchAll();
    if (selected?.id === c.id) setSelected({ ...c, active: !c.active });
  };

  const removeCustomer = async (c: CustomerRow) => {
    const { error } = await supabase.from("customers").delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success(t("admin.deleted"));
    setDeleteFor(null);
    if (selected?.id === c.id) setSelected(null);
    await refetchAll();
  };

  const openEditor = (c: CustomerRow | null) => {
    setCreating(!c);
    setSelected(c);
    setTab("editor");
  };

  const customerCard = (c: CustomerRow, i: number) => (
    <div
      key={c.id}
      className="card-interactive animate-soft-in rounded-2xl border border-border bg-card p-5 shadow-soft"
      style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-display text-base font-semibold">
            {c.full_name}{" "}
            {c.verified && <span className="text-xs text-primary">{t("common.verified")}</span>}
          </p>
          <p className="truncate text-sm text-muted-foreground">
            <span dir="ltr">/{c.username}</span> · {c.active ? t("common.published") : t("common.draft")}
          </p>
          {(c.email || c.phone) && (
            <p className="mt-1 truncate text-xs text-muted-foreground" dir="ltr">
              {[c.email, c.phone].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        <Switch
          checked={c.active}
          onCheckedChange={() => void toggleActive(c)}
          aria-label={c.active ? t("admin.deactivate") : t("admin.activate")}
        />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => openEditor(c)}>{t("common.edit")}</Button>
        <Button size="sm" variant="ghost" onClick={() => copyText(profileUrlFor(c.username), t("common.copied"))}>
          {t("common.copy")}
        </Button>
        <Button size="sm" variant="ghost" asChild>
          <a href={profileUrlFor(c.username)} target="_blank" rel="noreferrer">
            <ExternalLink className="me-1 h-4 w-4" aria-hidden="true" />
            {t("admin.viewProfile")}
          </a>
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setQrFor(c)} aria-label={t("dashboard.qrCode")}>
          <QrCode className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive hover:text-destructive"
          onClick={() => setDeleteFor(c)}
          aria-label={t("admin.deleteProfile")}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <DashboardShell
      items={navItems}
      areaLabel={t("dashboard.areaAdmin")}
      title={t("admin.title")}
      subtitle={t("admin.subtitle")}
      actions={
        <Button className="hover-lift" onClick={() => openEditor(null)}>
          <Plus className="me-2 h-4 w-4" /> {t("admin.newProfile")}
        </Button>
      }
    >
      {isLoading ? (
        <PageLoader label={t("admin.loading")} />
      ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-6 flex h-auto flex-wrap justify-start gap-1">
            <TabsTrigger value="overview"><LayoutDashboard className="me-2 h-4 w-4" />{t("admin.overview")}</TabsTrigger>
            <TabsTrigger value="customers"><Users className="me-2 h-4 w-4" />{t("admin.customers")}</TabsTrigger>
            <TabsTrigger value="profiles"><ShieldCheck className="me-2 h-4 w-4" />{t("admin.profiles")}</TabsTrigger>
            <TabsTrigger value="analytics"><BarChart3 className="me-2 h-4 w-4" />{t("admin.analytics")}</TabsTrigger>
            <TabsTrigger value="settings"><Settings className="me-2 h-4 w-4" />{t("admin.settings")}</TabsTrigger>
            <TabsTrigger value="editor" disabled={!creating && !selected}>{t("admin.editor")}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="animate-soft-in space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard label={t("admin.totalCustomers")} value={all.length} icon={Users} />
              <StatCard label={t("admin.activeProfiles")} value={activeCount} icon={ShieldCheck} />
              <StatCard label={t("admin.inactiveProfiles")} value={all.length - activeCount} icon={Users} />
              <StatCard label={t("admin.totalViews")} value={stats?.views ?? 0} icon={Eye} />
              <StatCard label={t("admin.totalClicks")} value={stats?.clicks ?? 0} icon={MousePointerClick} />
            </div>

            <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <h2 className="font-display text-lg font-semibold">{t("admin.recentAccounts")}</h2>
              <ul className="mt-3 divide-y divide-border">
                {all.slice(0, 6).map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{c.full_name}</p>
                      <p className="truncate text-xs text-muted-foreground" dir="ltr">/{c.username}</p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => openEditor(c)}>{t("common.edit")}</Button>
                  </li>
                ))}
              </ul>
              {all.length === 0 && (
                <p className="mt-2 text-sm text-muted-foreground">{t("admin.emptyText")}</p>
              )}
            </section>
          </TabsContent>

          <TabsContent value="customers" className="animate-soft-in space-y-6">
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
              <div className="grid gap-4 sm:grid-cols-2">{filtered.map(customerCard)}</div>
            )}
          </TabsContent>

          <TabsContent value="profiles" className="animate-soft-in space-y-6">
            {all.filter((c) => c.active).length === 0 ? (
              <EmptyState icon={Users} title={t("admin.emptyTitle")} description={t("admin.emptyText")} />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {all.filter((c) => c.active).map(customerCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="animate-soft-in space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard label={t("admin.totalViews")} value={stats?.views ?? 0} icon={Eye} />
              <StatCard label={t("admin.totalClicks")} value={stats?.clicks ?? 0} icon={MousePointerClick} />
              <StatCard label={t("admin.activeProfiles")} value={activeCount} icon={ShieldCheck} />
            </div>
          </TabsContent>

          <TabsContent value="settings" className="animate-soft-in space-y-4">
            <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <h2 className="font-display text-lg font-semibold">{t("admin.authorizedAdmins")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("admin.settingsText")}</p>
              <ul className="mt-3 space-y-1 text-sm" dir="ltr">
                {ADMIN_EMAILS.map((email) => (
                  <li key={email} className="font-mono text-muted-foreground">{email}</li>
                ))}
              </ul>
            </section>
          </TabsContent>

          <TabsContent value="editor" className="animate-soft-in space-y-8">
            {creating || selected ? (
              <>
                <ProfileEditor
                  key={selected?.id ?? "new"}
                  customer={selected}
                  allowVerified
                  allowUsernameEdit
                  onSaved={(c) => { setCreating(false); setSelected(c); void refetchAll(); }}
                />
                {selected && <LinksEditor customerId={selected.id} />}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{t("admin.noSelection")}</p>
            )}
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

      <AlertDialog open={Boolean(deleteFor)} onOpenChange={(v) => !v && setDeleteFor(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.deleteConfirmText", { name: deleteFor?.full_name ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => { e.preventDefault(); if (deleteFor) void removeCustomer(deleteFor); }}
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardShell>
  );
}
