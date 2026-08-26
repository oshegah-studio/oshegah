import { Link } from "react-router-dom";
import { Crown, Eye, Medal, Trophy } from "lucide-react";
import { Wordmark } from "@/components/Brand";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/Reveal";
import { PageLoader, ErrorState } from "@/components/states";
import { useLeaderboard } from "@/hooks/useOshegah";
import { useI18n } from "@/i18n";
import { Seo } from "@/components/Seo";
import { cn } from "@/lib/utils";

const podium = [
  { icon: Crown, ring: "ring-[#D4AF37]/60", tint: "text-[#D4AF37]" },
  { icon: Trophy, ring: "ring-[#C0C6CE]/60", tint: "text-[#98A2B3]" },
  { icon: Medal, ring: "ring-[#CD7F32]/60", tint: "text-[#CD7F32]" },
];

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");

export default function Leaderboard() {
  const { t } = useI18n();
  const { data, isLoading, isError } = useLeaderboard(20);

  return (
    <div className="min-h-dvh bg-background">
      <Seo
        title="Most viewed profiles — OSHEGAH leaderboard"
        description="See the most viewed OSHEGAH digital business cards, ranked by unique profile views."
        path="/leaderboard"
      />
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-3 px-5 py-4">
          <Wordmark />
          <div className="flex items-center gap-2">
            <LanguageSwitcher compact />
            <Button asChild variant="ghost" size="sm">
              <Link to="/">{t("common.back")}</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-5 py-10">
        <Reveal>
          <p className="eyebrow text-primary">{t("leaderboard.eyebrow")}</p>
          <h1 className="mt-2 font-display text-3xl font-semibold">{t("leaderboard.title")}</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">{t("leaderboard.subtitle")}</p>
        </Reveal>

        {isLoading && <PageLoader label={t("common.loading")} />}
        {isError && <ErrorState />}

        {data && data.length === 0 && (
          <p className="mt-10 text-center text-sm text-muted-foreground">{t("leaderboard.empty")}</p>
        )}

        {data && data.length > 0 && (
          <ol className="mt-8 space-y-3">
            {data.map((entry, index) => {
              const badge = podium[index];
              const Icon = badge?.icon;
              return (
                <li key={entry.username}>
                  <Link
                    to={`/${entry.username}`}
                    className={cn(
                      "card-interactive flex min-w-0 items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-soft animate-soft-in",
                      badge && `ring-2 ${badge.ring}`,
                    )}
                    style={{ animationDelay: `${Math.min(index, 12) * 45}ms` }}
                  >
                    <span className="w-7 shrink-0 text-center font-display text-lg font-semibold text-muted-foreground">
                      {entry.rank}
                    </span>
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
                      {entry.avatar_url ? (
                        <img
                          src={entry.avatar_url}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-semibold">{initials(entry.full_name) || "O"}</span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate font-medium">{entry.full_name}</span>
                        {Icon && <Icon className={cn("h-4 w-4 shrink-0", badge.tint)} aria-hidden="true" />}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground" dir="ltr">
                        /{entry.username}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5 text-sm font-semibold">
                      <Eye className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      {entry.views}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        )}

        <p className="mt-8 text-center text-xs text-muted-foreground">{t("leaderboard.privacy")}</p>
      </main>
    </div>
  );
}
