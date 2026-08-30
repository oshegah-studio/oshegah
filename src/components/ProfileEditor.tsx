import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { THEME_LIST, BUTTON_STYLES, FONT_STYLES, getTheme } from "@/lib/themes";
import { paletteFromImage } from "@/lib/palette";
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
  show_save_contact: boolean;
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
  show_save_contact: c?.show_save_contact ?? true,
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
  const [autoBusy, setAutoBusy] = useState(false);
  type PaletteFields = Pick<
    FormState,
    "theme" | "background_color" | "primary_color" | "text_color" | "muted_text_color"
  >;
  const [autoPrev, setAutoPrev] = useState<PaletteFields | null>(null);
  /** Last generated palette — kept so Auto Customize can be re-applied instantly. */
  const [autoPalette, setAutoPalette] = useState<PaletteFields | null>(null);
  const qc = useQueryClient();
  const { t } = useI18n();

  useEffect(() => {
    setForm(toForm(customer));
    setAutoPrev(null);
    setAutoPalette(null);
  }, [customer?.id]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const snapshot = (): PaletteFields => ({
    theme: form.theme,
    background_color: form.background_color,
    primary_color: form.primary_color,
    text_color: form.text_color,
    muted_text_color: form.muted_text_color,
  });

  /** Selecting a preset theme always wins: custom color overrides are reset to
   *  that theme's own tokens so the choice is never blocked by a generated palette. */
  const selectTheme = (id: FormState["theme"]) => {
    const tokens = getTheme(id);
    setForm((f) => ({
      ...f,
      theme: id,
      background_color: "",
      muted_text_color: "",
      primary_color: tokens.accent,
      text_color: tokens.text,
    }));
  };

  const autoCustomize = async () => {
    if (!form.avatar_url) return;
    // Re-applying an already generated palette is instant (it stays saved in the
    // background even after the user picks another preset theme).
    if (autoPalette) {
      setAutoPrev(snapshot());
      setForm((f) => ({ ...f, ...autoPalette }));
      toast.success(t("profileEditor.autoCustomizeDone"));
      return;
    }
    setAutoBusy(true);
    try {
      const palette = await paletteFromImage(form.avatar_url);
      setAutoPrev(snapshot());
      setAutoPalette(palette as PaletteFields);
      setForm((f) => ({ ...f, ...palette }));

      toast.success(t("profileEditor.autoCustomizeDone"));
    } catch {
      toast.error(t("profileEditor.autoCustomizeFailed"));
    } finally {
      setAutoBusy(false);
    }
  };

  const revertAuto = () => {
    if (!autoPrev) return;
    setForm((f) => ({ ...f, ...autoPrev }));
    setAutoPrev(null);
  };

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
      show_save_contact: form.show_save_contact,
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
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["my-customer"] }),
      qc.invalidateQueries({ queryKey: ["business-profiles"] }),
      qc.invalidateQueries({ queryKey: ["admin-customers"] }),
    ]);
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
        <div className="space-y-3 rounded-xl border border-border p-4">
          <p className="text-sm font-medium">{t("profileEditor.contactOptions")}</p>
          <div className="flex items-center gap-3">
            <Switch
              id="show_contact_button"
              checked={form.show_contact_button}
              onCheckedChange={(v) => set("show_contact_button", v)}
            />
            <Label htmlFor="show_contact_button">{t("profileEditor.showContact")}</Label>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              id="show_save_contact"
              checked={form.show_save_contact}
              onCheckedChange={(v) => set("show_save_contact", v)}
            />
            <Label htmlFor="show_save_contact">{t("profileEditor.showSaveContact")}</Label>
          </div>
          <p className="text-xs text-muted-foreground">{t("profileEditor.contactOptionsHint")}</p>
        </div>

      </section>

      <section className="animate-soft-in space-y-4 rounded-2xl border border-border bg-card p-5 shadow-soft" style={{ animationDelay: "60ms" }}>
        <h2 className="font-display text-lg font-semibold">{t("profileEditor.appearance")}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {THEME_LIST.map((theme) => {
            const selected = form.theme === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => selectTheme(theme.id)}
                className={cn(
                  "card-interactive overflow-hidden rounded-xl border p-0 text-start",
                  selected ? "border-primary ring-2 ring-primary/30" : "border-border",
                )}
                aria-pressed={selected}
              >
                {/* Everything inside the swatch is painted with the theme's own
                    foreground tokens, so each preview stays readable. */}
                <span
                  className="block w-full p-3"
                  style={{ background: theme.background, color: theme.text }}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold" style={{ color: theme.text }}>
                      {theme.name}
                    </span>
                    {selected && (
                      <span
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                        style={{ background: theme.accent, color: theme.onAccent }}
                      >
                        <Check className="h-3 w-3" aria-hidden="true" />
                      </span>
                    )}
                  </span>
                  <span className="mt-1 block text-[0.7rem] leading-snug" style={{ color: theme.mutedText }}>
                    {theme.description}
                  </span>
                  <span
                    className="mt-2.5 flex items-center gap-2 rounded-lg px-2.5 py-1.5"
                    style={{
                      background: theme.surface,
                      border: `1px solid ${theme.surfaceBorder}`,
                      backdropFilter: theme.blur ? "blur(10px)" : undefined,
                      color: theme.text,
                    }}
                  >
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: theme.accent }} />
                    <span className="truncate text-[0.7rem] font-medium" style={{ color: theme.text }}>
                      {t("profileEditor.sampleLink")}
                    </span>
                  </span>
                  <span
                    className="mt-1.5 flex items-center justify-center rounded-lg px-2.5 py-1.5 text-[0.7rem] font-semibold"
                    style={{ background: theme.accent, color: theme.onAccent }}
                  >
                    {t("publicProfile.contactMe")}
                  </span>
                </span>
              </button>
            );
          })}
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

        {/* Auto Customize — palette generated from the profile photo (logo untouched) */}
        <div className="space-y-2 rounded-xl border border-border p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={autoBusy || !form.avatar_url}
              onClick={() => void autoCustomize()}
            >
              {autoBusy ? (
                <Loader2 className="me-2 h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles className="me-2 h-4 w-4" aria-hidden="true" />
              )}
              {t("profileEditor.autoCustomize")}
            </Button>
            {autoPrev && (
              <Button type="button" variant="ghost" size="sm" onClick={revertAuto}>
                {t("profileEditor.revertPalette")}
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {form.avatar_url ? t("profileEditor.autoCustomizeHint") : t("profileEditor.autoCustomizeNeedsPhoto")}
          </p>
          {autoPrev && (
            <p className="text-xs text-primary">{t("profileEditor.autoCustomizeApplied")}</p>
          )}
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
                show_save_contact: form.show_save_contact,
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
