import { useEffect, useState } from "react";
import { Check, Copy, Download, ExternalLink, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { OshegahLogo } from "@/components/OshegahLogo";
import { renderBrandedQr } from "@/lib/qr";
import { toast } from "sonner";
import { useI18n } from "@/i18n";

export async function renderQrDataUrl(url: string) {
  return renderBrandedQr(url);
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export async function copyText(text: string, message?: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(message ?? "Copied");
  } catch {
    toast.error("Couldn't copy. Please copy manually.");
  }
}

/** Copy button with a smooth "Copy link → Copied ✓" micro-interaction. */
export function CopyButton({
  value,
  label,
  copiedLabel,
  variant = "outline",
  size,
  className,
  icon = true,
}: {
  value: string;
  label: string;
  copiedLabel: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "sm" | "default" | "lg";
  className?: string;
  icon?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const run = async () => {
    await copyText(value, copiedLabel);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <Button variant={variant} size={size} className={className} onClick={run}>
      {icon &&
        (copied ? (
          <Check className="me-2 h-4 w-4 animate-soft-in" aria-hidden="true" />
        ) : (
          <Copy className="me-2 h-4 w-4" aria-hidden="true" />
        ))}
      {copied ? copiedLabel : label}
    </Button>
  );
}

export function QrDialog({
  open,
  onOpenChange,
  url,
  username,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  url: string;
  username: string;
}) {
  const { t } = useI18n();
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    renderBrandedQr(url).then((d) => active && setDataUrl(d));
    return () => {
      active = false;
    };
  }, [open, url]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-sm overflow-hidden">
        <DialogHeader className="items-center text-center">
          <OshegahLogo size={40} />
          <DialogTitle className="mt-2 font-display tracking-[0.18em]">OSHEGAH</DialogTitle>
          <DialogDescription className="break-all" dir="ltr">
            {url}
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center rounded-2xl border border-border bg-white p-4">
          {dataUrl ? (
            <img
              src={dataUrl}
              alt={t("qr.alt", { username })}
              className="h-56 w-56 max-w-full animate-soft-in"
              loading="lazy"
            />
          ) : (
            <div className="flex h-56 w-56 max-w-full flex-col items-center justify-center gap-2 rounded-xl bg-muted text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              {t("qr.generating")}
            </div>
          )}
        </div>

        <div className="grid gap-2">
          <Button
            onClick={() => {
              if (!dataUrl) return;
              downloadDataUrl(dataUrl, `oshegah-${username}.png`);
              toast.success(t("qr.downloaded"));
            }}
            disabled={!dataUrl}
          >
            <Download className="me-2 h-4 w-4" /> {t("qr.downloadPng")}
          </Button>
          <CopyButton value={url} label={t("qr.copyUrl")} copiedLabel={t("qr.urlCopied")} />
          <Button variant="ghost" asChild>
            <a href={url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="me-2 h-4 w-4" /> {t("qr.openProfile")}
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
