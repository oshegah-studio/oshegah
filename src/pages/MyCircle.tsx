import { useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark, Clock, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/DashboardShell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogHeader, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/states";
import { useCircle, type CircleAction } from "@/hooks/useCircle";
import { useI18n } from "@/i18n";
import { Seo } from "@/components/Seo";

export default function MyCircle() {
  const { t } = useI18n();
  const [tab, setTab] = useState("recent");
  const { data = [], isLoading, isError, refetch, mutation } = useCircle();
  const recent = data.filter(row => row.viewed_at).sort((a,b) => (b.viewed_at ?? "").localeCompare(a.viewed_at ?? ""));
  const saved = data.filter(row => row.saved_at).sort((a,b) => (b.saved_at ?? "").localeCompare(a.saved_at ?? ""));
  const change = async (action: CircleAction, customerId?: string) => {
    try { await mutation.mutateAsync({ action, customerId }); toast.success(t("circle.removed")); }
    catch { toast.error(t("circle.actionError")); }
  };
  return <DashboardShell items={[]} areaLabel={t("views.normal")} title={t("circle.title")}>
    <Seo title="My Circle — OSHEGAH" description="Your saved OSHEGAH profiles and recent visits." path="/my-circle" noindex />
    <Tabs value={tab} onValueChange={setTab}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <TabsList className="h-auto max-w-full flex-wrap">
          <TabsTrigger value="recent" className="gap-2 whitespace-normal"><Clock className="h-4 w-4 shrink-0" />{t("circle.recent")}</TabsTrigger>
          <TabsTrigger value="saved" className="gap-2 whitespace-normal"><Bookmark className="h-4 w-4 shrink-0" />{t("circle.savedProfiles")}</TabsTrigger>
        </TabsList>
        {tab === "recent" && recent.length > 0 && <AlertDialog>
          <AlertDialogTrigger asChild><Button variant="outline" size="sm" disabled={mutation.isPending} className="gap-2"><Trash2 className="h-4 w-4" />{t("circle.clearHistory")}</Button></AlertDialogTrigger>
          <AlertDialogContent className="max-w-[calc(100vw-32px)] sm:max-w-lg">
            <AlertDialogHeader><AlertDialogTitle>{t("circle.clearTitle")}</AlertDialogTitle><AlertDialogDescription>{t("circle.clearDescription")}</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel><AlertDialogAction onClick={() => void change("clear_history")}>{t("common.confirm")}</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>}
      </div>
      {isLoading ? <SkeletonRows /> : isError ? <ErrorState onRetry={() => void refetch()} /> : ([{ id: "recent", rows: recent, icon: Clock }, { id: "saved", rows: saved, icon: Bookmark }].map(section => <TabsContent key={section.id} value={section.id}>
        {section.rows.length === 0 ? <EmptyState icon={section.icon} title={t(section.id === "recent" ? "circle.emptyRecent" : "circle.emptySaved")} /> :
          <ul className="grid gap-3 md:grid-cols-2">
            {section.rows.map(row => <li key={row.customer_id} className="flex min-w-0 items-center gap-3 rounded-lg border border-border bg-card p-4">
              <Link to={`/${row.username}`} className="flex min-w-0 flex-1 items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-muted-foreground">
                  {row.avatar_url ? <img src={row.avatar_url} alt="" width={48} height={48} loading="lazy" className="h-full w-full object-cover" /> : <UserRound className="h-6 w-6" />}
                </span>
                <span className="min-w-0"><span className="block truncate font-medium">{row.full_name}</span><span dir="ltr" className="block truncate text-sm text-muted-foreground">@{row.username}</span></span>
              </Link>
              <Button variant="ghost" size="icon" disabled={mutation.isPending} aria-label={t("circle.removePerson", { name: row.full_name })} title={t("circle.removePerson", { name: row.full_name })}
                onClick={() => void change(section.id === "recent" ? "remove_history" : "unsave", row.customer_id)}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
            </li>)}
          </ul>}
      </TabsContent>))}
    </Tabs>
  </DashboardShell>;
}