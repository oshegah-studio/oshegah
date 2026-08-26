import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { THEME_LIST, BUTTON_STYLES, FONT_STYLES } from "@/lib/themes";
import { normalizeUsername, validateUsername, RESERVED_USERNAMES } from "@/lib/links";
import type { CustomerRow } from "@/hooks/useOshegah";
import { AvatarUploader } from "@/components/AvatarUploader";
import { ProfileView } from "@/components/ProfileView";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";

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
  show_contact_button: boolean;
  background_color: string;
  muted_text_color: string;
  button_shadow: boolean;
  font_style: string;
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
  show_contact_button: c?.show_contact_button ?? true,
  background_color: c?.background_color ?? "",
  muted_text_color: c?.muted_text_color ?? "",
  button_shadow: c?.button_shadow ?? false,
  font_style: c?.font_style ?? "default",
});

const previewLinks = [
  { id: "preview-1", type: "whatsapp", title: "WhatsApp", value: "+201000000000", enabled: true },
  { id: "preview-2", type: "website", title: "Website", value: "https://oshegah.com", enabled: true },
];



export function ProfileEditor({
  customer,
  ownerProfileId,
  businessId,
  onSaved,
  allowVerified,
}: ProfileEditorProps) {
  const [form, setForm] = useState<FormState>(() => toForm(customer));
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const qc = useQueryClient();
  const { t } = useI18n();

  useEffect(() => {
    setForm(toForm(customer));
  }, [customer?.id]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    const username = normalizeUsername(form.username);
    const usernameError = validateUsername(username);
    if (usernameError) return toast.error(usernameError);
    if (RESERVED_USERNAMES.has(username)) return toast.error(t("profileEditor.reserved"));
    if (!form.full_name.trim()) return toast.error(t("profileEditor.nameRequired"));

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
      show_contact_button: form.show_contact_button,
      background_color: form.background_color || null,
      muted_text_color: form.muted_text_color || null,
      button_shadow: form.button_shadow,
      font_style: form.font_style,
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
      toast.error(error.code === "23505" ? t("profileEditor.usernameTaken") : error.message);
      return;
    }
    setJustSaved(true);
    window.setTimeout(() => setJustSaved(false), 1800);
    toast.success(customer ? t("profileEditor.updated") : t("profileEditor.created"));
    await qc.invalidateQueries();
    onSaved?.(data as CustomerRow);
  };

  return (
    <div className="space-y-8">
      <section className="animate-soft-in space-y-4 rounded-2xl border border-border bg-card p-5 shadow-soft">
        <h2 className="font-display text-lg font-semibold">{t("profileEditor.details")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="username">{t("profileEditor.username")}</Label>
            <Input
              id="username"
              dir="ltr"
              value={form.username}
              onChange={(e) => set("username", normalizeUsername(e.target.value))}
              placeholder={t("profileEditor.usernamePlaceholder")}
            />
            <p className="text-xs text-muted-foreground" dir="ltr">
              oshegah.com/{form.username || "yourname"}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="full_name">{t("profileEditor.displayName")}</Label>
            <Input id="full_name" value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="job_title">{t("profileEditor.jobTitle")}</Label>
            <Input id="job_title" value={form.job_title} onChange={(e) => set("job_title", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="location">{t("profileEditor.location")}</Label>
            <Input id="location" value={form.location} onChange={(e) => set("location", e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="bio">{t("profileEditor.bio")}</Label>
            <Textarea id="bio" rows={3} value={form.bio} onChange={(e) => set("bio", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">{t("profileEditor.phone")}</Label>
            <Input id="phone" dir="ltr" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">{t("profileEditor.email")}</Label>
            <Input id="email" dir="ltr" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="website">{t("profileEditor.website")}</Label>
            <Input id="website" dir="ltr" value={form.website} onChange={(e) => set("website", e.target.value)} />
          </div>
        </div>
        <AvatarUploader value={form.avatar_url} onChange={(url) => set("avatar_url", url)} />
        <div className="flex items-center gap-3 rounded-xl border border-border p-3">
          <Switch
            id="show_contact_button"
            checked={form.show_contact_button}
            onCheckedChange={(v) => set("show_contact_button", v)}
          />
          <Label htmlFor="show_contact_button">{t("profileEditor.showContact")}</Label>
        </div>

      </section>

      <section className="animate-soft-in space-y-4 rounded-2xl border border-border bg-card p-5 shadow-soft" style={{ animationDelay: "60ms" }}>
        <h2 className="font-display text-lg font-semibold">{t("profileEditor.appearance")}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {THEME_LIST.map((theme) => (
            <button
              key={theme.id}
              type="button"
              onClick={() => set("theme", theme.id)}
              className={cn(
                "card-interactive overflow-hidden rounded-xl border p-0 text-start",
                form.theme === theme.id ? "border-primary ring-2 ring-primary/25" : "border-border",
              )}
              aria-pressed={form.theme === theme.id}
            >
              {/* Live mini preview of the theme */}
              <span className="block h-20 w-full p-2.5" style={{ background: theme.background }}>
                <span
                  className="mb-1.5 block h-4 w-4 rounded-full"
                  style={{ background: theme.accent }}
                />
                <span
                  className="mb-1 block h-3 w-full rounded"
                  style={{ background: theme.surface, border: `1px solid ${theme.surfaceBorder}` }}
                />
                <span
                  className="block h-3 w-2/3 rounded"
                  style={{ background: theme.surface, border: `1px solid ${theme.surfaceBorder}` }}
                />
              </span>
              <span className="block px-3 py-2 text-sm font-medium">{theme.name}</span>
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

        <div className="flex flex-wrap gap-2">
          {FONT_STYLES.map((font) => (
            <Button
              key={font.id}
              type="button"
              variant={form.font_style === font.id ? "default" : "outline"}
              size="sm"
              onClick={() => set("font_style", font.id)}
              style={{ fontFamily: font.stack || undefined }}
            >
              {font.name}
            </Button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="primary_color">{t("profileEditor.accentColor")}</Label>
            <Input id="primary_color" type="color" value={form.primary_color} onChange={(e) => set("primary_color", e.target.value)} className="h-10 w-20 p-1" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="text_color">{t("profileEditor.textColor")}</Label>
            <Input id="text_color" type="color" value={form.text_color} onChange={(e) => set("text_color", e.target.value)} className="h-10 w-20 p-1" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="background_color">{t("profileEditor.backgroundColor")}</Label>
            <div className="flex items-center gap-2">
              <Input
                id="background_color"
                type="color"
                value={form.background_color || "#162446"}
                onChange={(e) => set("background_color", e.target.value)}
                className="h-10 w-20 p-1"
              />
              <Button type="button" variant="ghost" size="sm" onClick={() => set("background_color", "")}>
                {t("profileEditor.useTheme")}
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="muted_text_color">{t("profileEditor.mutedColor")}</Label>
            <div className="flex items-center gap-2">
              <Input
                id="muted_text_color"
                type="color"
                value={form.muted_text_color || "#BEE3F0"}
                onChange={(e) => set("muted_text_color", e.target.value)}
                className="h-10 w-20 p-1"
              />
              <Button type="button" variant="ghost" size="sm" onClick={() => set("muted_text_color", "")}>
                {t("profileEditor.useTheme")}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Switch id="button_shadow" checked={form.button_shadow} onCheckedChange={(v) => set("button_shadow", v)} />
          <Label htmlFor="button_shadow">{t("profileEditor.buttonShadow")}</Label>
        </div>

        {/* Live preview of the actual public profile */}
        <div className="space-y-2">
          <Label>{t("profileEditor.livePreview")}</Label>
          <div className="overflow-hidden rounded-2xl border border-border">
            <ProfileView
              compact
              customer={{
                username: form.username || "yourname",
                full_name: form.full_name || t("dashboard.user"),
                job_title: form.job_title,
                bio: form.bio,
                avatar_url: form.avatar_url,
                phone: form.phone,
                email: form.email,
                location: form.location,
                verified: form.verified,
                theme: form.theme,
                primary_color: form.primary_color,
                text_color: form.text_color,
                button_style: form.button_style,
                background_color: form.background_color || null,
                muted_text_color: form.muted_text_color || null,
                button_shadow: form.button_shadow,
                font_style: form.font_style,
                show_contact_button: form.show_contact_button,
              }}
              links={previewLinks}
            />
          </div>
        </div>
      </section>


      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft">
        <div className="flex items-center gap-3">
          <Switch id="active" checked={form.active} onCheckedChange={(v) => set("active", v)} />
          <Label htmlFor="active">{t("profileEditor.publishedLabel")}</Label>
        </div>
        {allowVerified && (
          <div className="flex items-center gap-3">
            <Switch id="verified" checked={form.verified} onCheckedChange={(v) => set("verified", v)} />
            <Label htmlFor="verified">{t("profileEditor.verifiedLabel")}</Label>
          </div>
        )}
        <Button onClick={save} disabled={saving} className="hover-lift">
          {saving && <Loader2 className="me-2 h-4 w-4 animate-spin" aria-hidden="true" />}
          {!saving && justSaved && <Check className="me-2 h-4 w-4 animate-soft-in" aria-hidden="true" />}
          {saving
            ? t("common.saving")
            : justSaved
              ? t("common.saved")
              : customer
                ? t("common.save")
                : t("profileEditor.createProfile")}
        </Button>
      </section>
    </div>
  );
}
