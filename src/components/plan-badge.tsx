import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "@tanstack/react-router";
import { Crown, Sparkles, Circle } from "lucide-react";
import { useAuth } from "@/lib/use-auth";
import { useProfile, planStatus, trialRemainingMs } from "@/lib/profile";
import { useRealtime } from "@/lib/use-realtime";
import { KIWIFY_CHECKOUT_URL } from "@/lib/billing";
import { cn } from "@/lib/utils";

function formatRemaining(ms: number) {
  if (ms <= 0) return "Expirado";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h > 0) return `Restam ${h}h ${m}m`;
  return `Restam ${m}m`;
}

export function PlanBadge({ variant = "sidebar" }: { variant?: "sidebar" | "header" }) {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  useRealtime("profiles", user?.id, ["profile"]);
  const nav = useNavigate();

  // Re-render every 60s so trial countdown & expiry stay live.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const status = planStatus(profile);
  const remaining = trialRemainingMs(profile);

  const handleClick = () => {
    if (status === "free") {
      window.open(KIWIFY_CHECKOUT_URL, "_blank", "noopener");
      return;
    }
    nav({ to: "/perfil" });
  };

  const config =
    status === "premium"
      ? {
          Icon: Crown,
          label: "Premium",
          badge: "Ativo",
          iconClass: "text-primary",
          bg: "bg-primary/10 border-primary/30 hover:bg-primary/15",
          badgeClass: "bg-primary text-primary-foreground",
        }
      : status === "trial"
        ? {
            Icon: Sparkles,
            label: "Teste Grátis",
            badge: formatRemaining(remaining),
            iconClass: "text-emerald-500",
            bg: "bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/15",
            badgeClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
          }
        : {
            Icon: Circle,
            label: "Gratuito",
            badge: "Upgrade disponível",
            iconClass: "text-muted-foreground",
            bg: "bg-muted/40 border-border hover:bg-muted",
            badgeClass: "bg-primary/15 text-primary",
          };

  if (variant === "header") {
    return (
      <button
        onClick={handleClick}
        className={cn(
          "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all",
          config.bg,
        )}
      >
        <config.Icon className={cn("h-3.5 w-3.5", config.iconClass)} />
        <span>{config.label}</span>
      </button>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.button
        key={status}
        onClick={handleClick}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "group flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all",
          config.bg,
        )}
      >
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background/80 shadow-sm",
          )}
        >
          <config.Icon className={cn("h-4 w-4", config.iconClass)} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold tracking-tight">{config.label}</span>
          </div>
          <div className={cn("mt-0.5 inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium", config.badgeClass)}>
            {config.badge}
          </div>
        </div>
      </motion.button>
    </AnimatePresence>
  );
}
