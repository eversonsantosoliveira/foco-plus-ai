import { useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  fallback?: string;
  label?: string;
  className?: string;
};

/**
 * Circular, minimalist back button.
 * Uses browser history when possible, otherwise falls back to `/dashboard`.
 * Always renders a 44x44px clickable area for accessibility.
 */
export function BackButton({ fallback = "/dashboard", label = "Voltar", className }: Props) {
  const router = useRouter();

  const handleClick = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.history.back();
      return;
    }
    router.navigate({ to: fallback });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={label}
      className={cn(
        "inline-flex h-11 w-11 items-center justify-center rounded-full",
        "border border-border/60 bg-background/70 text-foreground/80 backdrop-blur",
        "shadow-sm transition-all duration-200",
        "hover:-translate-x-0.5 hover:bg-accent hover:text-foreground hover:shadow-md",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        "active:scale-95",
        className,
      )}
    >
      <ArrowLeft className="h-4 w-4" />
    </button>
  );
}
