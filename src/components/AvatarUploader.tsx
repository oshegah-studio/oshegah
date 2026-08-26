import { useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Trash2, Upload, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ACCEPTED_IMAGE_TYPES, optimizeImage, validateImageFile } from "@/lib/image";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";

const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

export function AvatarUploader({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  const handleFile = async (file?: File | null) => {
    if (!file) return;
    const problem = validateImageFile(file);
    if (problem === "type") return toast.error(t("avatar.badType"));
    if (problem === "size") return toast.error(t("avatar.tooLarge"));

    setBusy(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error(t("avatar.signedOut"));

      const blob = await optimizeImage(file);
      const path = `${uid}/${crypto.randomUUID()}.webp`;

      const { error: upErr } = await supabase.storage
        .from("profile-images")
        .upload(path, blob, { contentType: blob.type || "image/webp", upsert: true });
      if (upErr) throw upErr;

      const { data: signed, error: signErr } = await supabase.storage
        .from("profile-images")
        .createSignedUrl(path, TEN_YEARS);
      if (signErr || !signed?.signedUrl) throw signErr ?? new Error("No URL");

      onChange(signed.signedUrl);
      toast.success(t("avatar.uploaded"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("avatar.failed"));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <Label>{t("avatar.label")}</Label>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handleFile(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          "flex flex-wrap items-center gap-4 rounded-2xl border border-dashed p-4 transition-colors duration-200",
          dragging ? "border-primary bg-primary/5" : "border-border",
        )}
      >
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          aria-label={t("avatar.upload")}
          className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted transition-transform duration-200 hover:scale-[1.03]"
        >
          {value ? (
            <img src={value} alt={t("avatar.preview")} className="h-full w-full object-cover" />
          ) : (
            <User className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          )}
          {busy && (
            <span className="absolute inset-0 flex items-center justify-center bg-background/70">
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            </span>
          )}
        </button>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>
              <Upload className="me-2 h-4 w-4" aria-hidden="true" />
              {value ? t("avatar.replace") : t("avatar.upload")}
            </Button>
            {value && (
              <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => onChange("")}>
                <Trash2 className="me-2 h-4 w-4" aria-hidden="true" />
                {t("avatar.remove")}
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{t("avatar.hint")}</p>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
