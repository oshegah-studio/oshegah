import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Copy, Download, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export async function renderQrDataUrl(url: string) {
  return QRCode.toDataURL(url, {
    width: 900,
    margin: 2,
    errorCorrectionLevel: "M",
    color: { dark: "#162446", light: "#FFFFFF" },
  });
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export async function copyText(text: string, message = "Profile URL copied.") {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(message);
  } catch {
    toast.error("Couldn't copy. Please copy manually.");
  }
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
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    renderQrDataUrl(url).then((d) => active && setDataUrl(d));
    return () => {
      active = false;
    };
  }, [open, url]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>QR Code</DialogTitle>
          <DialogDescription className="break-all">{url}</DialogDescription>
        </DialogHeader>
        <div className="flex justify-center rounded-2xl border border-border bg-white p-4">
          {dataUrl ? (
            <img src={dataUrl} alt={`QR code for ${username}'s OSHEGAH profile`} className="h-56 w-56" />
          ) : (
            <div className="h-56 w-56 animate-pulse rounded-xl bg-muted" />
          )}
        </div>
        <div className="grid gap-2">
          <Button
            onClick={() => {
              if (!dataUrl) return;
              downloadDataUrl(dataUrl, `oshegah-${username}.png`);
              toast.success("QR code downloaded.");
            }}
            disabled={!dataUrl}
          >
            <Download className="mr-2 h-4 w-4" /> Download PNG
          </Button>
          <Button variant="outline" onClick={() => copyText(url)}>
            <Copy className="mr-2 h-4 w-4" /> Copy profile URL
          </Button>
          <Button variant="ghost" asChild>
            <a href={url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" /> Open profile
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
