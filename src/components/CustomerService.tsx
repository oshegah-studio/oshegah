import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

export function CustomerService({ className }: { className?: string }) {
  const { t } = useI18n();
  return <Button asChild variant="secondary" size="sm" className={cn("max-w-full whitespace-normal", className)}>
    <a href="https://wa.me/201070485277" target="_blank" rel="noopener noreferrer">
      <MessageCircle aria-hidden="true" />{t("common.customerService")}
    </a>
  </Button>;
}