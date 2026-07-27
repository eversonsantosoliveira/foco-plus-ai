import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { useProfile } from "@/lib/profile";
import { useTheme } from "@/lib/use-theme";
import { Button } from "@/components/ui/button";
import { PlanBadge } from "@/components/plan-badge";
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

const MOBILE_NAV_PAGES = [
  NAV.slice(0, 5),
  NAV.slice(5, 8),
] as const;


export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const { theme, toggle } = useTheme();
  const nav = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const qc = useQueryClient();
  const [mobileNavPage, setMobileNavPage] = useState(0);

  // Sync bottom nav page with current route
  useEffect(() => {
    const idx = MOBILE_NAV_PAGES.findIndex((page) =>
      page.some((n) => path === n.to || path.startsWith(n.to + "/")),
    );
    if (idx !== -1) setMobileNavPage(idx);
  }, [path]);

  // Redirect to onboarding if not completed
  useEffect(() => {
    if (profile && !profile.onboarding_completed && path !== "/onboarding") {
      nav({ to: "/onboarding" });
    }
  }, [profile, path, nav]);

  // Refresh profile / premium status when the user returns to the tab
  useEffect(() => {
    const onFocus = () => qc.invalidateQueries({ queryKey: ["profile"] });
    const onVisibility = () => {
      if (document.visibilityState === "visible") onFocus();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [qc]);

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
        <div className="mt-4">
          <PlanBadge />
        </div>
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
            <div className="hidden sm:block">
              <PlanBadge variant="header" />
            </div>
            <Button variant="ghost" size="icon" onClick={toggle} aria-label="Alternar tema">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Sair">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
        {/* Mobile bottom nav (paged) */}
        <nav className="sticky bottom-0 z-30 border-t border-border bg-background/90 py-2 backdrop-blur md:hidden">
          <div className="relative overflow-hidden">
            <AnimatePresence initial={false} mode="wait">
              <motion.div
                key={mobileNavPage}
                initial={{ x: mobileNavPage === 0 ? -40 : 40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: mobileNavPage === 0 ? 40 : -40, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
                className="flex items-center justify-around"
              >
                {MOBILE_NAV_PAGES[mobileNavPage].map((n) => {
                  const active = path === n.to || path.startsWith(n.to + "/");
                  const Icon = n.icon;
                  return (
                    <Link
                      key={n.to}
                      to={n.to}
                      className={cn(
                        "flex min-h-11 min-w-11 flex-col items-center gap-0.5 rounded-md px-3 py-1.5 text-[10px] font-medium",
                        active ? "text-primary" : "text-muted-foreground",
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      {n.label}
                    </Link>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setMobileNavPage((p) => (p === 0 ? 1 : 0))}
                  aria-label={mobileNavPage === 0 ? "Mais opções" : "Voltar"}
                  className="flex min-h-11 min-w-11 items-center justify-center rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {mobileNavPage === 0 ? (
                    <ChevronRight className="h-5 w-5" />
                  ) : (
                    <ChevronLeft className="h-5 w-5" />
                  )}
                </button>
              </motion.div>
            </AnimatePresence>
          </div>
        </nav>
      </div>
    </div>
  );
}
