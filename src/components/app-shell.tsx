import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  LayoutDashboard,
  ListChecks,
  CalendarDays,
  Sparkles,
  Target,
  BarChart3,
  User as UserIcon,
  Settings,
  LogOut,
  Moon,
  Sun,
  Crown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { useProfile, isPremiumActive, trialRemainingMs } from "@/lib/profile";
import { useTheme } from "@/lib/use-theme";
import { Button } from "@/components/ui/button";
import { KIWIFY_CHECKOUT_URL } from "@/lib/billing";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/tarefas", label: "Tarefas", icon: ListChecks },
  { to: "/calendario", label: "Calendário", icon: CalendarDays },
  { to: "/habitos", label: "Hábitos", icon: Sparkles },
  { to: "/metas", label: "Metas", icon: Target },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/perfil", label: "Perfil", icon: UserIcon },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

function TrialPill({ ms, premium }: { ms: number; premium: boolean }) {
  if (premium) {
    return (
      <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
        <Crown className="h-3.5 w-3.5" /> Premium
      </div>
    );
  }
  const h = Math.floor(ms / 3600_000);
  const m = Math.floor((ms % 3600_000) / 60_000);
  return (
    <a
      href={KIWIFY_CHECKOUT_URL}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
        ms > 0
          ? "bg-warning/15 text-warning-foreground hover:bg-warning/25"
          : "bg-destructive/15 text-destructive hover:bg-destructive/25",
      )}
    >
      <Crown className="h-3.5 w-3.5" />
      {ms > 0 ? `Teste: ${h}h ${m}m` : "Teste expirado"}
    </a>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const { theme, toggle } = useTheme();
  const nav = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const qc = useQueryClient();

  const premium = isPremiumActive(profile);
  const remaining = trialRemainingMs(profile);

  // Redirect to onboarding if not completed
  useEffect(() => {
    if (profile && !profile.onboarding_completed && path !== "/onboarding") {
      nav({ to: "/onboarding" });
    }
  }, [profile, path, nav]);

  // Refresh profile / premium status when the user returns to the tab
  // (e.g. after completing Kiwify checkout).
  useEffect(() => {
    const wasPremium = premium;
    const onFocus = () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") onFocus();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    // If premium just flipped on, celebrate.
    if (wasPremium && sessionStorage.getItem("foco_premium_toast") !== "1") {
      sessionStorage.setItem("foco_premium_toast", "1");
    }
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [qc, premium]);

  // Toast when premium activates during a session (e.g. webhook confirmed payment).
  useEffect(() => {
    if (!profile) return;
    const key = `foco_premium_ack_${profile.id}`;
    const wasAck = localStorage.getItem(key) === "1";
    if (profile.is_premium && !wasAck) {
      localStorage.setItem(key, "1");
      toast.success("🎉 Bem-vindo ao Foco+ Premium!");
    }
    if (!profile.is_premium && wasAck) {
      localStorage.removeItem(key);
    }
  }, [profile]);

  const handleSignOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    nav({ to: "/auth", replace: true });
  };


  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-sidebar px-4 py-6 md:flex">
        <Link to="/dashboard" className="mb-8 flex items-center gap-2 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary text-white font-bold shadow-glow">
            F+
          </div>
          <div className="text-lg font-semibold tracking-tight">Foco+</div>
        </Link>
        <nav className="flex-1 space-y-1">
          {NAV.map((n) => {
            const active = path === n.to || path.startsWith(n.to + "/");
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        {!premium && (
          <a
            href={KIWIFY_CHECKOUT_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-4 block rounded-xl bg-gradient-to-br from-primary to-primary/70 p-4 text-primary-foreground shadow-glow transition-transform hover:scale-[1.02]"
          >
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Crown className="h-4 w-4" /> Foco+ Premium
            </div>
            <p className="mt-1 text-xs opacity-90">Desbloqueie a IA para organizar toda a sua semana automaticamente.</p>
            <div className="mt-3 rounded-md bg-white/15 py-1.5 text-center text-xs font-semibold">
              Assinar por R$ 49,90/mês
            </div>
          </a>
        )}
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-md md:px-8">
          <div className="flex items-center gap-2 md:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary text-white font-bold">
              F+
            </div>
            <span className="font-semibold">Foco+</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <TrialPill ms={remaining} premium={premium} />
            <Button variant="ghost" size="icon" onClick={toggle} aria-label="Alternar tema">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Sair">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
        {/* Mobile bottom nav */}
        <nav className="sticky bottom-0 z-30 flex items-center justify-around border-t border-border bg-background/90 py-2 backdrop-blur md:hidden">
          {NAV.slice(0, 5).map((n) => {
            const active = path === n.to;
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-md px-3 py-1.5 text-[10px] font-medium",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                {n.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
