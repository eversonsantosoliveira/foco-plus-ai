import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { useProfile, isPremiumActive } from "@/lib/profile";
import { organizeWeek } from "@/lib/ai-organize.functions";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { CheckCircle2, Clock, ListChecks, Sparkles, TrendingUp, Crown } from "lucide-react";
import { KIWIFY_CHECKOUT_URL } from "@/lib/billing";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Foco+" }] }),
  component: Dashboard,
});

function startOfWeek(d = new Date()) {
  const x = new Date(d);
  const day = x.getDay();
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

function Dashboard() {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const qc = useQueryClient();
  const premium = isPremiumActive(profile);
  const organize = useServerFn(organizeWeek);

  const { data: tasks } = useQuery({
    enabled: !!user,
    queryKey: ["tasks", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user!.id)
        .order("scheduled_start", { ascending: true, nullsFirst: false });
      return data ?? [];
    },
  });

  const stats = useMemo(() => {
    const start = startOfWeek();
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const weekTasks = (tasks ?? []).filter((t) => {
      const d = t.scheduled_start ? new Date(t.scheduled_start) : null;
      return d && d >= start && d < end;
    });
    const completed = weekTasks.filter((t) => t.status === "completed").length;
    const pending = weekTasks.filter((t) => t.status !== "completed").length;
    const focusMin = weekTasks
      .filter((t) => t.status === "completed")
      .reduce((sum, t) => sum + (t.estimated_minutes ?? 0), 0);
    const progress = weekTasks.length ? Math.round((completed / weekTasks.length) * 100) : 0;
    const next = (tasks ?? [])
      .filter((t) => t.status !== "completed" && t.scheduled_start && new Date(t.scheduled_start) > new Date())
      .sort((a, b) => new Date(a.scheduled_start!).getTime() - new Date(b.scheduled_start!).getTime())[0];
    return { completed, pending, focusMin, progress, next, weekTotal: weekTasks.length };
  }, [tasks]);

  const organizeMut = useMutation({
    mutationFn: async () => organize({ data: { weekStartISO: startOfWeek().toISOString() } }),
    onSuccess: (r) => {
      toast.success(r.message);
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const greet = () => {
    const h = new Date().getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  };

  const completeTask = async (id: string) => {
    await supabase.from("tasks").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["tasks"] });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">
          {greet()}, {profile?.full_name?.split(" ")[0] ?? "por aqui"}.
        </h1>
        <p className="mt-1 text-muted-foreground">Sua semana está {stats.weekTotal > 0 ? "organizada" : "esperando por você"}.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard icon={CheckCircle2} label="Concluídas" value={String(stats.completed)} tone="success" />
        <StatCard icon={ListChecks} label="Pendentes" value={String(stats.pending)} />
        <StatCard icon={Clock} label="Tempo focado" value={`${Math.floor(stats.focusMin / 60)}h ${stats.focusMin % 60}m`} />
        <StatCard icon={TrendingUp} label="Progresso semanal" value={`${stats.progress}%`} tone="primary" />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="card-elevated col-span-2 p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-medium text-primary">Próxima tarefa</div>
              <h3 className="mt-1 text-lg font-semibold">
                {stats.next ? stats.next.title : "Nada agendado. Aproveite!"}
              </h3>
              {stats.next?.scheduled_start && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {new Date(stats.next.scheduled_start).toLocaleString("pt-BR", { weekday: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
              )}
            </div>
            {stats.next && (
              <Button size="sm" onClick={() => completeTask(stats.next!.id)}>Concluir</Button>
            )}
          </div>
          <div className="mt-6">
            <div className="mb-2 flex justify-between text-xs text-muted-foreground">
              <span>Progresso da semana</span>
              <span>{stats.progress}%</span>
            </div>
            <Progress value={stats.progress} />
          </div>
        </div>

        <div className="card-elevated p-6 bg-gradient-to-br from-primary/10 to-transparent">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary text-white">
            <Sparkles className="h-5 w-5" />
          </div>
          <h3 className="mt-4 font-semibold">Organizar minha semana</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            A IA distribui todas as suas tarefas de forma equilibrada.
          </p>
          {premium ? (
            <Button className="mt-4 w-full" onClick={() => organizeMut.mutate()} disabled={organizeMut.isPending}>
              {organizeMut.isPending ? "Organizando..." : "Organizar agora"}
            </Button>
          ) : (
            <a href={KIWIFY_CHECKOUT_URL} target="_blank" rel="noreferrer" className="mt-4 block">
              <Button className="w-full">
                <Crown className="mr-2 h-4 w-4" /> Desbloquear IA
              </Button>
            </a>
          )}
        </div>
      </div>

      <div className="card-elevated p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">Tarefas de hoje</h3>
          <Link to="/tarefas"><Button variant="ghost" size="sm">Ver todas</Button></Link>
        </div>
        <div className="space-y-2">
          {(tasks ?? [])
            .filter((t) => {
              if (!t.scheduled_start) return false;
              const d = new Date(t.scheduled_start);
              const today = new Date();
              return d.toDateString() === today.toDateString();
            })
            .slice(0, 8)
            .map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => completeTask(t.id)}
                    className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${t.status === "completed" ? "border-success bg-success" : "border-muted-foreground/40"}`}
                  >
                    {t.status === "completed" && <CheckCircle2 className="h-4 w-4 text-success-foreground" />}
                  </button>
                  <div>
                    <div className={`text-sm font-medium ${t.status === "completed" ? "text-muted-foreground line-through" : ""}`}>{t.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(t.scheduled_start!).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · {t.estimated_minutes} min
                    </div>
                  </div>
                </div>
              </div>
            ))}
          {(tasks ?? []).filter((t) => t.scheduled_start && new Date(t.scheduled_start).toDateString() === new Date().toDateString()).length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">Sem tarefas para hoje.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; tone?: "primary" | "success" }) {
  return (
    <div className="card-elevated p-5">
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${tone === "success" ? "bg-success/15 text-success" : tone === "primary" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
