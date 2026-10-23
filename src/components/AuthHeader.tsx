import { Wordmark } from "@/components/Brand";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MobileHeaderMenu } from "@/components/MobileHeaderMenu";

/** Auth panels are narrower than the viewport: keep intrinsic controls on their own desktop row. */
export function AuthHeader() {
  return (
    <header className="grid w-full min-w-0 grid-cols-[1fr_auto] items-center gap-3">
      <Wordmark className="justify-self-start" />
      <MobileHeaderMenu />
      <div className="col-span-2 hidden items-center justify-end gap-2 sm:flex">
        <ThemeToggle />
        <LanguageSwitcher compact />
      </div>
    </header>
  );
}