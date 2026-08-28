import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Check, Link2, Loader2, Plus, Trash2 } from "lucide-react";
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

const AUTOSAVE_MS = 700;

/**
 * One editable row. Typing only touches local state; the database is written
 * once the user pauses (debounced) or leaves the field — never per keystroke.
 */
const LinkRowEditor = memo(function LinkRowEditor({
  link,
  index,
  isFirst,
  isLast,
  onPatch,
  onMove,
  onDelete,
}: {
  link: LinkRow;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onPatch: (id: string, patch: Partial<LinkRow>) => Promise<void>;
  onMove: (index: number, dir: -1 | 1) => void;
  onDelete: (link: LinkRow) => void;
}) {
  const { t } = useI18n();
  const [title, setTitle] = useState(link.title);
  const [value, setValue] = useState(link.value);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const pending = useRef<Partial<LinkRow>>({});

  // Adopt server values only when this row actually changed elsewhere.
  useEffect(() => {
    if (!timer.current) {
      setTitle(link.title);
      setValue(link.value);
    }
  }, [link.title, link.value]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    timer.current = undefined;
    const patch = pending.current;
    pending.current = {};
    if (!Object.keys(patch).length) return;
    setState("saving");
    await onPatch(link.id, patch);
    setState("saved");
    setTimeout(() => setState("idle"), 1200);
  }, [link.id, onPatch]);

  const queue = (patch: Partial<LinkRow>) => {
    pending.current = { ...pending.current, ...patch };
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), AUTOSAVE_MS);
  };

  const lm = linkMeta(link.type);

  return (
    <div
      className="card-interactive flex animate-soft-in flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft"
      style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
    >
      <span
        className="flex h-9 w-9 items-center justify-center rounded-full"
        style={{ background: `${lm.tint}22`, color: lm.tint }}
      >
        <lm.icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-[160px] flex-1">
        <Input
          value={title}
          aria-label={t("linksEditor.label")}
          onChange={(e) => {
            setTitle(e.target.value);
            queue({ title: e.target.value });
          }}
          onBlur={() => void flush()}
          className="h-8 border-0 px-0 font-medium shadow-none focus-visible:ring-0"
        />
        <Input
          value={value}
          aria-label={t("linksEditor.value")}
          onChange={(e) => {
            setValue(e.target.value);
            queue({ value: e.target.value });
          }}
          onBlur={() => void flush()}
          className="h-7 border-0 px-0 text-xs text-muted-foreground shadow-none focus-visible:ring-0"
        />
      </div>
      <span className="w-4 shrink-0 text-muted-foreground" aria-live="polite">
        {state === "saving" && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-label={t("common.saving")} />}
        {state === "saved" && <Check className="h-3.5 w-3.5 text-success" aria-label={t("common.saved")} />}
      </span>
      <Switch
        checked={link.enabled}
        onCheckedChange={(v) => void onPatch(link.id, { enabled: v })}
        aria-label={t("linksEditor.enableLink")}
      />
      <Button variant="ghost" size="icon" aria-label={t("linksEditor.moveUp")} disabled={isFirst} onClick={() => onMove(index, -1)}>
        <ArrowUp className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" aria-label={t("linksEditor.moveDown")} disabled={isLast} onClick={() => onMove(index, 1)}>
        <ArrowDown className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" aria-label={t("linksEditor.deleteLink")} onClick={() => onDelete(link)}>
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
});

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
  const key = ["links", customerId];

  /** Writes straight into the cached list — no refetch of links, stats or profile. */
  const setCache = useCallback(
    (updater: (rows: LinkRow[]) => LinkRow[]) => {
      qc.setQueryData<LinkRow[]>(key, (rows) => updater(rows ?? []));
    },
    [qc, customerId], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const add = async () => {
    const error = meta.validate(value);
    if (error) return toast.error(error);
    setBusy(true);
    const { data, error: dbError } = await supabase
      .from("links")
      .insert({
        customer_id: customerId,
        type,
        title: title.trim() || meta.label,
        value: meta.normalize ? meta.normalize(value) : value.trim(),
        sort_order: (links?.length ?? 0) + 1,
      })
      .select("*")
      .single();
    setBusy(false);
    if (dbError) return toast.error(dbError.message);
    setTitle("");
    setValue("");
    setCache((rows) => [...rows, data as LinkRow]);
    toast.success(t("linksEditor.added"));
  };

  /** Optimistic patch: UI first, rollback + toast if the write fails. */
  const patch = useCallback(
    async (id: string, values: Partial<LinkRow>) => {
      const previous = qc.getQueryData<LinkRow[]>(key);
      setCache((rows) => rows.map((r) => (r.id === id ? { ...r, ...values } : r)));
      const { error } = await supabase.from("links").update(values).eq("id", id);
      if (error) {
        if (previous) qc.setQueryData(key, previous);
        toast.error(error.message);
      }
    },
    [qc, setCache], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const remove = async (link: LinkRow) => {
    const previous = qc.getQueryData<LinkRow[]>(key);
    setCache((rows) => rows.filter((r) => r.id !== link.id));
    const { error } = await supabase.from("links").delete().eq("id", link.id);
    if (error) {
      if (previous) qc.setQueryData(key, previous);
      return toast.error(error.message);
    }
    toast.success(t("linksEditor.removed"));
  };

  const move = useCallback(
    (index: number, dir: -1 | 1) => {
      const rows = qc.getQueryData<LinkRow[]>(key) ?? [];
      const current = rows[index];
      const target = rows[index + dir];
      if (!current || !target) return;

      const previous = rows;
      const next = [...rows];
      next[index] = { ...target, sort_order: current.sort_order };
      next[index + dir] = { ...current, sort_order: target.sort_order };
      qc.setQueryData(key, next);

      void (async () => {
        const [a, b] = await Promise.all([
          supabase.from("links").update({ sort_order: target.sort_order }).eq("id", current.id),
          supabase.from("links").update({ sort_order: current.sort_order }).eq("id", target.id),
        ]);
        if (a.error || b.error) {
          qc.setQueryData(key, previous);
          toast.error((a.error ?? b.error)!.message);
        }
      })();
    },
    [qc], // eslint-disable-line react-hooks/exhaustive-deps
  );

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
        {links?.map((link, index) => (
          <LinkRowEditor
            key={link.id}
            link={link}
            index={index}
            isFirst={index === 0}
            isLast={index === links.length - 1}
            onPatch={patch}
            onMove={move}
            onDelete={setPendingDelete}
          />
        ))}
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
