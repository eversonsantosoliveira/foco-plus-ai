import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Target } from "lucide-react";
import { useAuth } from "@/lib/use-auth";
import { useProfile, planStatus, trialRemainingMs } from "@/lib/profile";
import { KIWIFY_CHECKOUT_URL } from "@/lib/billing";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Compact, SaaS-style plan summary card ("Seu Foco+" / "Plano atual").
 * Adapts automatically to the user's subscription state and keeps the
 * existing Kiwify checkout as the plan management action.
 */
export function PlanSummaryCard({ className }: { className?: string }) {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);

  // Re-render every 60s so the trial countdown stays live.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const status = planStatus(profile);
  const remaining = trialRemainingMs(profile);
  const h = Math.floor(remaining / 3_600_000);
  const m = Math.floor((remaining % 3_600_000) / 60_000);

  const title = status === "premium" ? "Foco+ Premium" : "Foco+";
  const description =
    status === "premium"
      ? "Todos os recursos estão disponíveis para você."
      : status === "trial"
        ? "Aproveite todos os recursos durante o teste grátis."
        : "Desbloqueie todos os recursos do Foco+";
  const cta = status === "premium" ? "Gerenciar plano" : "Conhecer Premium";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn("card-elevated p-4 sm:p-5", className)}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Target className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-sm font-semibold tracking-tight">{title}</span>
              {status === "premium" && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                  Ativo
                </span>
              )}
              {status === "trial" && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  {remaining > 0 ? `Teste · ${h}h ${m}m` : "Teste expirado"}
                </span>
              )}
              {status === "free" && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
                  Gratuito
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <a
          href={KIWIFY_CHECKOUT_URL}
          target="_blank"
          rel="noreferrer"
          className="shrink-0"
        >
          <Button variant="outline" size="sm" className="h-8 w-full px-3 text-xs sm:w-auto">
            {cta}
          </Button>
        </a>
      </div>
    </motion.div>
  );
}
