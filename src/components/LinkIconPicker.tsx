import { useState } from "react";
import { Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LINK_ICONS, resolveLinkIcon } from "@/lib/link-icons";
import { useI18n } from "@/i18n";

export function LinkIconPicker({ type, value, icon, onChange }: { type: string; value: string; icon?: string | null; onChange: (icon: string | null) => Promise<void> | void }) {
  const { t, lang, dir } = useI18n();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(icon ?? null);
  const [saving, setSaving] = useState(false);
  const Current = resolveLinkIcon(type, value, icon);
  const Preview = resolveLinkIcon(type, value, selected);
  return <>
    <Button variant="outline" size="icon" title={t("linksEditor.chooseIcon")} aria-label={t("linksEditor.chooseIcon")} onClick={() => { setSelected(icon ?? null); setSearch(""); setOpen(true); }}><Current aria-hidden="true" /></Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent dir={dir} className="max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto">
        <DialogHeader><DialogTitle>{t("linksEditor.chooseIcon")}</DialogTitle><DialogDescription>{t("linksEditor.iconHint")}</DialogDescription></DialogHeader>
        <Input aria-label={t("linksEditor.searchIcons")} placeholder={t("linksEditor.searchIcons")} value={search} onChange={(e) => setSearch(e.target.value)} />
        <Button variant={selected === null ? "secondary" : "outline"} onClick={() => setSelected(null)}><RotateCcw />{t("linksEditor.autoIcon")}</Button>
        {(["social", "contact", "general"] as const).map((group) => {
          const options = LINK_ICONS.filter((i) => i.group === group && `${i.label} ${i.ar}`.toLowerCase().includes(search.toLowerCase()));
          return options.length ? <section key={group} className="space-y-2"><h3 className="text-sm font-medium">{t(`linksEditor.iconGroup.${group}`)}</h3><div className="grid grid-cols-3 gap-2 sm:grid-cols-4">{options.map((item) => <Button key={item.id} title={lang === "ar" ? item.ar : item.label} variant={selected === item.id ? "secondary" : "outline"} className="h-auto min-h-16 flex-col px-1 text-xs whitespace-normal" aria-pressed={selected === item.id} onClick={() => setSelected(item.id)}><item.icon aria-hidden="true" /><span>{lang === "ar" ? item.ar : item.label}</span></Button>)}</div></section> : null;
        })}
        {!LINK_ICONS.some((i) => `${i.label} ${i.ar}`.toLowerCase().includes(search.toLowerCase())) && <p className="text-sm text-muted-foreground">{t("linksEditor.noIcons")}</p>}
        <div className="flex items-center justify-between gap-3 border-t border-border pt-3"><span className="flex items-center gap-2 text-sm"><Preview aria-hidden="true" className="h-5 w-5" />{t("profileEditor.livePreview")}</span><Button disabled={saving} onClick={async () => { setSaving(true); try { await onChange(selected); setOpen(false); } catch { /* Writer displays the error; retain the picker for retry. */ } finally { setSaving(false); } }}><Check />{t(saving ? "common.saving" : "common.save")}</Button></div>
      </DialogContent>
    </Dialog>
  </>;
}