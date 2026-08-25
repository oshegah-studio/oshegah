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

const navItems: NavItem[] = [{ to: "/admin", label: "Admin", icon: LayoutDashboard, end: true }];

export default function AdminDashboard() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<CustomerRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [qrFor, setQrFor] = useState<CustomerRow | null>(null);

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
      areaLabel="Admin"
      title="Admin console"
      subtitle="Every OSHEGAH profile in one place."
      actions={
        <Button onClick={() => { setSelected(null); setCreating(true); }}>
          <Plus className="mr-2 h-4 w-4" /> New profile
        </Button>
      }
    >
      {isLoading ? (
        <PageLoader label="Loading profiles…" />
      ) : (
        <Tabs value={editing ? "editor" : "all"} onValueChange={(v) => { if (v === "all") { setCreating(false); setSelected(null); } }}>
          <TabsList className="mb-6">
            <TabsTrigger value="all"><Users className="mr-2 h-4 w-4" />Profiles</TabsTrigger>
            <TabsTrigger value="editor" disabled={!editing}>Editor</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard label="Profiles" value={customers?.length ?? 0} icon={Users} />
              <StatCard label="Total views" value={stats?.views ?? 0} icon={Eye} />
              <StatCard label="Total clicks" value={stats?.clicks ?? 0} icon={MousePointerClick} />
            </div>

            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or username"
              className="max-w-sm"
              aria-label="Search profiles"
            />

            {filtered.length === 0 ? (
              <EmptyState icon={Users} title="No profiles found" description="Try a different search." />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {filtered.map((c) => (
                  <div key={c.id} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                    <p className="font-display text-base font-semibold">
                      {c.full_name} {c.verified && <span className="text-xs text-primary">Verified</span>}
                    </p>
                    <p className="text-sm text-muted-foreground">/{c.username} · {c.active ? "Published" : "Draft"}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => { setCreating(false); setSelected(c); }}>Edit</Button>
                      <Button size="sm" variant="ghost" onClick={() => copyText(profileUrlFor(c.username))}>Copy link</Button>
                      <Button size="sm" variant="ghost" onClick={() => setQrFor(c)} aria-label="QR code"><QrCode className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="editor" className="space-y-8">
            <ProfileEditor
              key={selected?.id ?? "new"}
              customer={selected}
              allowVerified
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
