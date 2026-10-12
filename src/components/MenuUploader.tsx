import { useRef, useState } from "react";
import { toast } from "sonner";
import { FileText, Loader2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/i18n";
import type { LinkRow } from "@/hooks/useOshegah";

export const MENU_BUCKET = "profile-menus";
export const MENU_TYPES = ["application/pdf", "image/jpeg", "image/jpg", "image/png", "image/webp"];
export const MENU_MAX_BYTES = 15 * 1024 * 1024;
const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

const extOf = (mime: string) =>
  mime === "application/pdf" ? "pdf" : mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";

/** Validates and uploads into the owner's own folder; returns a long-lived signed URL. */
export async function uploadMenuFile(file: File, t: (k: string) => string) {
  const mime = file.type.toLowerCase();
  if (!MENU_TYPES.includes(mime)) throw new Error(t("linksEditor.menuBadType"));
  if (file.size > MENU_MAX_BYTES) throw new Error(t("linksEditor.menuTooLarge"));
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) throw new Error(t("avatar.signedOut"));
  const path = `${uid}/menu-${crypto.randomUUID()}.${extOf(mime)}`;
  const { error } = await supabase.storage.from(MENU_BUCKET).upload(path, file, { contentType: mime });
  if (error) throw error;
  const { data: signed, error: signErr } = await supabase.storage.from(MENU_BUCKET).createSignedUrl(path, TEN_YEARS);
  if (signErr || !signed?.signedUrl) throw signErr ?? new Error("No URL");
  return { path, url: signed.signedUrl, mime };
}

export async function removeMenuFile(path?: string | null) {
  if (path) await supabase.storage.from(MENU_BUCKET).remove([path]);
}

export function MenuUploader({
  customerId,
  nextOrder,
  onAdded,
}: {
  customerId: string;
  nextOrder: number;
  onAdded: (row: LinkRow) => void;
}) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  const pick = (f?: File | null) => {
    if (!f) return;
    if (!MENU_TYPES.includes(f.type.toLowerCase())) return toast.error(t("linksEditor.menuBadType"));
    if (f.size > MENU_MAX_BYTES) return toast.error(t("linksEditor.menuTooLarge"));
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(f.type.startsWith("image/") ? URL.createObjectURL(f) : null);
  };

  const save = async () => {
    if (!file) return;
    setBusy(true);
    let uploadedPath: string | null = null;
    try {
      const up = await uploadMenuFile(file, t);
      uploadedPath = up.path;
      const { data, error } = await supabase
        .from("links")
        .insert({
          customer_id: customerId,
          type: "menu",
          title: title.trim() || t("linksEditor.menuPlaceholder"),
          value: up.url,
          file_path: up.path,
          file_mime: up.mime,
          sort_order: nextOrder,
        })
        .select("*")
        .single();
      if (error) throw error;
      onAdded(data as LinkRow);
      setFile(null);
      setPreview(null);
      setTitle("");
      toast.success(t("linksEditor.menuUploaded"));
    } catch (e) {
      if (uploadedPath) await removeMenuFile(uploadedPath);
      toast.error(e instanceof Error ? e.message : t("avatar.failed"));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div>
        <h2 className="font-display text-lg font-semibold">{t("linksEditor.menuTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("linksEditor.menuText")}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="menu-title">{t("linksEditor.menuName")}</Label>
          <Input id="menu-title" value={title} placeholder={t("linksEditor.menuPlaceholder")} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>{t("linksEditor.menuChoose")}</Label>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-10 w-full min-w-0 items-center gap-2 rounded-md border border-dashed border-border px-3 text-start text-sm text-muted-foreground hover:border-primary"
          >
            <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{file ? file.name : t("linksEditor.menuChoose")}</span>
          </button>
        </div>
      </div>
      {preview && (
        <img src={preview} alt="" className="max-h-48 rounded-xl border border-border object-contain" />
      )}
      <Button onClick={() => void save()} disabled={!file || busy}>
        {busy ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Upload className="me-2 h-4 w-4" />}
        {busy ? t("common.saving") : t("linksEditor.menuUpload")}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept={MENU_TYPES.join(",") + ",.pdf"}
        className="hidden"
        aria-label={t("linksEditor.menuChoose")}
        onChange={(e) => pick(e.target.files?.[0])}
      />
    </section>
  );
}
