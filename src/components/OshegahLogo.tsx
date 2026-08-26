import logoUrl from "@/assets/oshegah-logo.png";
import { cn } from "@/lib/utils";

export const OSHEGAH_LOGO_URL = logoUrl;

/**
 * Official OSHEGAH mark. Never stretched — always square, aspect ratio preserved.
 * `tone="light"` renders it on a soft light plate so it stays visible on navy surfaces.
 */
export function OshegahLogo({
  className,
  size = 36,
  tone = "auto",
  decorative = true,
}: {
  className?: string;
  size?: number;
  tone?: "auto" | "plate";
  decorative?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden",
        tone === "plate" && "rounded-full bg-white p-[3px]",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <img
        src={OSHEGAH_LOGO_URL}
        alt={decorative ? "" : "OSHEGAH"}
        aria-hidden={decorative || undefined}
        width={size}
        height={size}
        loading="eager"
        decoding="async"
        className="h-full w-full object-contain"
      />
    </span>
  );
}
