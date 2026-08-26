import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Link2, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState, SkeletonRows } from "@/components/states";
import { LINK_TYPE_LIST, linkMeta, type LinkType } from "@/lib/links";
import { useLinks, type LinkRow } from "@/hooks/useOshegah";
import { useI18n } from "@/i18n";

export function LinksEditor({ customerId }: { customerId: string }) {
  const { data: links, isLoading } = useLinks(customerId);
  const qc = useQueryClient();
  const { t } = useI18n();
  const [type, setType] = useState<LinkType>("whatsapp");
  const [title, setTitle] = useState("");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<LinkRow | null>(null);

  const meta = linkMeta(type);
  const refresh = () => qc.invalidateQueries({ queryKey: ["links", customerId] });

  const add = async () => {
    const error = meta.validate(value);
    if (error) return toast.error(error);
    setBusy(true);
    const { error: dbError } = await supabase.from("links").insert({
      customer_id: customerId,
      type,
      title: title.trim() || meta.label,
      value: meta.normalize ? meta.normalize(value) : value.trim(),
      sort_order: (links?.length ?? 0) + 1,
    });
    setBusy(false);
    if (dbError) return toast.error(dbError.message);
    setTitle("");
    setValue("");
    toast.success(t("linksEditor.added"));
    refresh();
  };

  const update = async (link: LinkRow, patch: Partial<LinkRow>) => {
    const { error } = await supabase.from("links").update(patch).eq("id", link.id);
    if (error) return toast.error(error.message);
    refresh();
  };

  const remove = async (link: LinkRow) => {
    const { error } = await supabase.from("links").delete().eq("id", link.id);
    if (error) return toast.error(error.message);
    toast.success(t("linksEditor.removed"));
    refresh();
  };

  const move = async (index: number, dir: -1 | 1) => {
    if (!links) return;
    const target = links[index + dir];
    const current = links[index];
    if (!target) return;
    await Promise.all([
      supabase.from("links").update({ sort_order: target.sort_order }).eq("id", current.id),
      supabase.from("links").update({ sort_order: current.sort_order }).eq("id", target.id),
    ]);
    refresh();
  };

  return (
    <div className="space-y-8">
      <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-soft">
        <h2 className="font-display text-lg font-semibold">{t("linksEditor.addTitle")}</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="link-type">{t("linksEditor.type")}</Label>
            <Select value={type} onValueChange={(v) => setType(v as LinkType)}>
              <SelectTrigger id="link-type"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">
                {LINK_TYPE_LIST.map((l) => (
                  <SelectItem key={l.type} value={l.type}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="link-title">{t("linksEditor.label")}</Label>
            <Input id="link-title" value={title} placeholder={meta.label} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="link-value">{t("linksEditor.value")}</Label>
            <Input id="link-value" value={value} placeholder={meta.placeholder} onChange={(e) => setValue(e.target.value)} />
            <p className="text-xs text-muted-foreground">{meta.hint}</p>
          </div>
        </div>
        <Button onClick={add} disabled={busy}>
          <Plus className="me-2 h-4 w-4" /> {busy ? t("common.saving") : t("linksEditor.addLink")}
        </Button>
      </section>

      <section className="space-y-3">
        {isLoading && <SkeletonRows count={3} />}
        {!isLoading && (links?.length ?? 0) === 0 && (
          <EmptyState icon={Link2} title={t("linksEditor.emptyTitle")} description={t("linksEditor.emptyText")} />
        )}
        {links?.map((link, index) => {
          const lm = linkMeta(link.type);
          return (
            <div
              key={link.id}
              className="card-interactive flex animate-soft-in flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft"
              style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: `${lm.tint}22`, color: lm.tint }}>
                <lm.icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-[160px] flex-1">
                <Input
                  value={link.title}
                  aria-label={t("linksEditor.label")}
                  onChange={(e) => update(link, { title: e.target.value })}
                  className="h-8 border-0 px-0 font-medium shadow-none focus-visible:ring-0"
                />
                <Input
                  value={link.value}
                  aria-label={t("linksEditor.value")}
                  onChange={(e) => update(link, { value: e.target.value })}
                  className="h-7 border-0 px-0 text-xs text-muted-foreground shadow-none focus-visible:ring-0"
                />
              </div>
              <Switch checked={link.enabled} onCheckedChange={(v) => update(link, { enabled: v })} aria-label={t("linksEditor.enableLink")} />
              <Button variant="ghost" size="icon" aria-label={t("linksEditor.moveUp")} disabled={index === 0} onClick={() => move(index, -1)}>
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" aria-label={t("linksEditor.moveDown")} disabled={index === (links.length - 1)} onClick={() => move(index, 1)}>
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" aria-label={t("linksEditor.deleteLink")} onClick={() => setPendingDelete(link)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          );
        })}
      </section>

      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(v) => !v && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("linksEditor.deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("linksEditor.deleteConfirmText", { title: pendingDelete?.title ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDelete) void remove(pendingDelete);
                setPendingDelete(null);
              }}
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
