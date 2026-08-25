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

const navItems: NavItem[] = [
  { to: "/business", label: "Business", icon: LayoutDashboard, end: true },
];

export default function BusinessDashboard() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const { data: business, isLoading } = useMyBusiness();
  const { data: members } = useBusinessProfiles(business?.id);
  const { data: stats } = useCustomerStats((members ?? []).map((m) => m.id));
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<CustomerRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [qrFor, setQrFor] = useState<CustomerRow | null>(null);

  const createBusiness = async () => {
    if (!name.trim() || !profile?.id) return toast.error("Enter a business name.");
    const { error } = await supabase.from("businesses").insert({ name: name.trim(), owner_id: profile.id });
    if (error) return toast.error(error.message);
    toast.success("Business created.");
    qc.invalidateQueries({ queryKey: ["my-business"] });
  };

  if (isLoading) return <PageLoader label="Loading your business…" />;

  if (!business) {
    return (
      <DashboardShell items={navItems} areaLabel="Business" title="Set up your business">
        <div className="max-w-md space-y-4 rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div className="space-y-1.5">
            <Label htmlFor="biz">Business name</Label>
            <Input id="biz" value={name} onChange={(e) => setName(e.target.value)} placeholder="OSHEGAH Studio" />
          </div>
          <Button onClick={createBusiness}><Building2 className="mr-2 h-4 w-4" /> Create business</Button>
        </div>
      </DashboardShell>
    );
  }

  const editing = creating || selected;

  return (
    <DashboardShell
      items={navItems}
      areaLabel="Business"
      title={business.name}
      subtitle={`${members?.length ?? 0} team profile${members?.length === 1 ? "" : "s"}`}
      actions={
        <Button onClick={() => { setSelected(null); setCreating(true); }}>
          <Plus className="mr-2 h-4 w-4" /> New profile
        </Button>
      }
    >
      <Tabs value={editing ? "editor" : "team"} onValueChange={(v) => { if (v === "team") { setCreating(false); setSelected(null); } }}>
        <TabsList className="mb-6">
          <TabsTrigger value="team"><Users className="mr-2 h-4 w-4" />Team</TabsTrigger>
          <TabsTrigger value="editor" disabled={!editing}>Editor</TabsTrigger>
        </TabsList>

        <TabsContent value="team" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Team profiles" value={members?.length ?? 0} icon={Users} />
            <StatCard label="Profile views" value={stats?.views ?? 0} icon={Eye} />
            <StatCard label="Link clicks" value={stats?.clicks ?? 0} icon={MousePointerClick} />
          </div>

          {(members?.length ?? 0) === 0 ? (
            <EmptyState
              icon={Users}
              title="No team profiles yet"
              description="Create a card for each team member."
              action={{ label: "New profile", onClick: () => setCreating(true) }}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {members!.map((m) => (
                <div key={m.id} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                  <p className="font-display text-base font-semibold">{m.full_name}</p>
                  <p className="text-sm text-muted-foreground">/{m.username} · {m.active ? "Published" : "Draft"}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setCreating(false); setSelected(m); }}>Edit</Button>
                    <Button size="sm" variant="ghost" onClick={() => copyText(profileUrlFor(m.username))}>Copy link</Button>
                    <Button size="sm" variant="ghost" onClick={() => setQrFor(m)}><QrCode className="h-4 w-4" /></Button>
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
