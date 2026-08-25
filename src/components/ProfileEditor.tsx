import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { THEME_LIST, BUTTON_STYLES } from "@/lib/themes";
import { normalizeUsername, validateUsername, RESERVED_USERNAMES } from "@/lib/links";
import type { CustomerRow } from "@/hooks/useOshegah";
import { cn } from "@/lib/utils";

export interface ProfileEditorProps {
  customer: CustomerRow | null;
  /** profiles.id of the owner (personal cards) */
  ownerProfileId?: string | null;
  businessId?: string | null;
  onSaved?: (customer: CustomerRow) => void;
  allowVerified?: boolean;
}

type FormState = {
  username: string;
  full_name: string;
  job_title: string;
  bio: string;
  phone: string;
  email: string;
  website: string;
  location: string;
  avatar_url: string;
  theme: string;
  button_style: string;
  primary_color: string;
  text_color: string;
  active: boolean;
  verified: boolean;
};

const toForm = (c: CustomerRow | null): FormState => ({
  username: c?.username ?? "",
  full_name: c?.full_name ?? "",
  job_title: c?.job_title ?? "",
  bio: c?.bio ?? "",
  phone: c?.phone ?? "",
  email: c?.email ?? "",
  website: c?.website ?? "",
  location: c?.location ?? "",
  avatar_url: c?.avatar_url ?? "",
  theme: c?.theme ?? "oshegah_dark",
  button_style: c?.button_style ?? "rounded",
  primary_color: c?.primary_color ?? "#BEE3F0",
  text_color: c?.text_color ?? "#FFFFFF",
  active: c?.active ?? true,
  verified: c?.verified ?? false,
});

export function ProfileEditor({
  customer,
  ownerProfileId,
  businessId,
  onSaved,
  allowVerified,
}: ProfileEditorProps) {
  const [form, setForm] = useState<FormState>(() => toForm(customer));
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();

  useEffect(() => {
    setForm(toForm(customer));
  }, [customer?.id]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    const username = normalizeUsername(form.username);
    const usernameError = validateUsername(username);
    if (usernameError) return toast.error(usernameError);
    if (RESERVED_USERNAMES.has(username)) return toast.error("That username is reserved.");
    if (!form.full_name.trim()) return toast.error("Please add a display name.");

    setSaving(true);
    const payload = {
      username,
      full_name: form.full_name.trim(),
      job_title: form.job_title.trim() || null,
      bio: form.bio.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      website: form.website.trim() || null,
      location: form.location.trim() || null,
      avatar_url: form.avatar_url.trim() || null,
      theme: form.theme as CustomerRow["theme"],
      button_style: form.button_style,
      primary_color: form.primary_color,
      text_color: form.text_color,
      active: form.active,
      ...(allowVerified ? { verified: form.verified } : {}),
    };

    const query = customer
      ? supabase.from("customers").update(payload).eq("id", customer.id).select("*").single()
      : supabase
          .from("customers")
          .insert({ ...payload, user_id: ownerProfileId ?? null, business_id: businessId ?? null })
          .select("*")
          .single();

    const { data, error } = await query;
    setSaving(false);

    if (error) {
      toast.error(
        error.code === "23505" ? "That username is already taken." : error.message,
      );
      return;
    }
    toast.success(customer ? "Profile updated." : "Profile created.");
    await qc.invalidateQueries();
    onSaved?.(data as CustomerRow);
  };

  return (
    <div className="space-y-8">
      <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-soft">
        <h2 className="font-display text-lg font-semibold">Profile details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={form.username}
              onChange={(e) => set("username", normalizeUsername(e.target.value))}
              placeholder="yourname"
            />
            <p className="text-xs text-muted-foreground">oshegah.com/{form.username || "yourname"}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="full_name">Display name</Label>
            <Input id="full_name" value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="job_title">Job title</Label>
            <Input id="job_title" value={form.job_title} onChange={(e) => set("job_title", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="location">Location</Label>
            <Input id="location" value={form.location} onChange={(e) => set("location", e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" rows={3} value={form.bio} onChange={(e) => set("bio", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="website">Website</Label>
            <Input id="website" value={form.website} onChange={(e) => set("website", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="avatar_url">Photo URL</Label>
            <Input id="avatar_url" value={form.avatar_url} onChange={(e) => set("avatar_url", e.target.value)} />
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-soft">
        <h2 className="font-display text-lg font-semibold">Appearance</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {THEME_LIST.map((theme) => (
            <button
              key={theme.id}
              type="button"
              onClick={() => set("theme", theme.id)}
              className={cn(
                "rounded-xl border p-3 text-left transition-colors",
                form.theme === theme.id ? "border-primary ring-2 ring-primary/25" : "border-border",
              )}
            >
              <span className="flex gap-1">
                {theme.swatch.map((c) => (
                  <span key={c} className="h-5 w-5 rounded-full border border-border" style={{ background: c }} />
                ))}
              </span>
              <span className="mt-2 block text-sm font-medium">{theme.name}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {BUTTON_STYLES.map((style) => (
            <Button
              key={style.id}
              type="button"
              variant={form.button_style === style.id ? "default" : "outline"}
              size="sm"
              onClick={() => set("button_style", style.id)}
            >
              {style.name}
            </Button>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="primary_color">Accent color</Label>
            <Input id="primary_color" type="color" value={form.primary_color} onChange={(e) => set("primary_color", e.target.value)} className="h-10 w-20 p-1" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="text_color">Text color</Label>
            <Input id="text_color" type="color" value={form.text_color} onChange={(e) => set("text_color", e.target.value)} className="h-10 w-20 p-1" />
          </div>
        </div>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft">
        <div className="flex items-center gap-3">
          <Switch id="active" checked={form.active} onCheckedChange={(v) => set("active", v)} />
          <Label htmlFor="active">Published (publicly visible)</Label>
        </div>
        {allowVerified && (
          <div className="flex items-center gap-3">
            <Switch id="verified" checked={form.verified} onCheckedChange={(v) => set("verified", v)} />
            <Label htmlFor="verified">Verified badge</Label>
          </div>
        )}
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : customer ? "Save changes" : "Create profile"}
        </Button>
      </section>
    </div>
  );
}
