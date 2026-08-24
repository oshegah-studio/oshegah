import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-display text-sm font-semibold",
        className,
      )}
      aria-hidden="true"
    >
      O
    </span>
  );
}

export function Wordmark({
  className,
  to = "/",
  invert = false,
}: { className?: string; to?: string; invert?: boolean }) {
  return (
    <Link to={to} className={cn("group inline-flex items-center gap-2.5", className)} aria-label="OSHEGAH home">
      <BrandMark className={invert ? "bg-sky text-navy" : undefined} />
      <span
        className={cn(
          "font-display text-[1.05rem] font-semibold tracking-[0.18em]",
          invert ? "text-white" : "text-foreground",
        )}
      >
        OSHEGAH
      </span>
    </Link>
  );
}
