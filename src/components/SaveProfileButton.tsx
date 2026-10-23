import { Bookmark, Loader2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useCircle } from "@/hooks/useCircle";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";

export function SaveProfileButton({ customerId, isOwn }: { customerId: string; isOwn: boolean }) {
  const { user, loading } = useAuth();
  const { data, isLoading, isError, refetch, mutation } = useCircle();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();
  const saved = Boolean(data?.find(row => row.customer_id === customerId)?.saved_at);
  if (isOwn) return null;
  return <Button variant={saved ? "default" : "outline"} size="sm" aria-pressed={saved}
    disabled={loading || (Boolean(user) && isLoading) || mutation.isPending}
    onClick={async () => {
      if (!user) { navigate("/login", { state: { from: location.pathname } }); return; }
      if (isError) { await refetch(); return; }
      try {
        await mutation.mutateAsync({ customerId, action: saved ? "unsave" : "save" });
        toast.success(t(saved ? "circle.unsaved" : "circle.saved"));
      } catch { toast.error(t("circle.actionError")); }
    }} className="gap-2">
    {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bookmark className={saved ? "h-4 w-4 fill-current" : "h-4 w-4"} />}
    {t(isError ? "common.retry" : saved ? "circle.saved" : "circle.saveProfile")}
  </Button>;
}