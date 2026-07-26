import { createFileRoute } from "@tanstack/react-router";
import { BackButton } from "@/components/back-button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { useRealtime } from "@/lib/use-realtime";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { useMemo } from "react";
import { Flame, CheckCircle2, Clock, ListChecks, TrendingUp, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios — Foco+" }] }),
  component: Relatorios,
});

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const PIE_COLORS = ["#2563EB", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

function Relatorios() {
  const { user } = useAuth();
  useRealtime("tasks", user?.id, ["tasks-report"]);
  useRealtime("habit_logs", user?.id, ["logs-report"]);

  const { data: tasks } = useQuery({
    enabled: !!user,
    queryKey: ["tasks-report", user?.id],
    queryFn: async () => (await supabase.from("tasks").select("*").eq("user_id", user!.id)).data ?? [],
  });
  const { data: logs } = useQuery({
    enabled: !!user,
    queryKey: ["logs-report", user?.id],
    queryFn: async () => {
      const since = new Date(); since.setDate(since.getDate() - 30);
      return (await supabase.from("habit_logs").select("*").eq("user_id", user!.id).gte("log_date", since.toISOString().slice(0, 10))).data ?? [];
    },
  });

  const weekChart = useMemo(() => {
    const start = new Date(); start.setDate(start.getDate() - start.getDay()); start.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(start); day.setDate(day.getDate() + i);
      const end = new Date(day); end.setDate(end.getDate() + 1);
      const dayTasks = (tasks ?? []).filter((t) => t.completed_at && new Date(t.completed_at) >= day && new Date(t.completed_at) < end);
      const dayLogs = (logs ?? []).filter((l) => l.log_date === day.toISOString().slice(0, 10));
      const focus = dayTasks.reduce((s, t) => s + (t.estimated_minutes ?? 0), 0);
      return { day: DAYS[i], concluidas: dayTasks.length, focoMin: focus, habitos: dayLogs.length };
    });
  }, [tasks, logs]);

  const trend30 = useMemo(() => {
    const arr = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
      const end = new Date(d); end.setDate(end.getDate() + 1);
      const done = (tasks ?? []).filter((t) => t.completed_at && new Date(t.completed_at) >= d && new Date(t.completed_at) < end).length;
      arr.push({ date: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), tarefas: done });
    }
    return arr;
  }, [tasks]);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    (tasks ?? []).filter((t) => t.status === "completed").forEach((t) => {
      const c = t.category ?? "Sem categoria";
      map.set(c, (map.get(c) ?? 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [tasks]);

  const totalDone = (tasks ?? []).filter((t) => t.status === "completed").length;
  const totalPending = (tasks ?? []).filter((t) => t.status !== "completed").length;
  const totalMin = (tasks ?? []).filter((t) => t.status === "completed").reduce((s, t) => s + (t.estimated_minutes ?? 0), 0);
  const habitsDone30 = (logs ?? []).length;
  const bestDay = [...weekChart].sort((a, b) => b.concluidas - a.concluidas)[0];
  const worstDay = [...weekChart].sort((a, b) => a.concluidas - b.concluidas)[0];

  // Streak: consecutive days with at least one completed task
  const streak = useMemo(() => {
    const set = new Set((tasks ?? []).filter((t) => t.completed_at).map((t) => new Date(t.completed_at!).toISOString().slice(0, 10)));
    let s = 0; const d = new Date();
    while (set.has(d.toISOString().slice(0, 10))) { s++; d.setDate(d.getDate() - 1); }
    return s;
  }, [tasks]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <div className="mb-1 flex items-center gap-3"><BackButton fallback="/dashboard" /></div>
        <h1 className="text-3xl font-semibold tracking-tight">Relatórios</h1>
        <p className="text-muted-foreground">Sua produtividade real em números.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card icon={CheckCircle2} label="Concluídas" value={String(totalDone)} tone="success" />
        <Card icon={ListChecks} label="Pendentes" value={String(totalPending)} />
        <Card icon={Clock} label="Horas focadas" value={`${Math.floor(totalMin / 60)}h ${totalMin % 60}m`} />
        <Card icon={Sparkles} label="Hábitos (30d)" value={String(habitsDone30)} tone="primary" />
        <Card icon={Flame} label="Sequência" value={`${streak}d`} tone="warn" />
        <Card icon={TrendingUp} label="Melhor dia" value={bestDay?.day ?? "-"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card-elevated p-6">
          <h3 className="mb-4 font-semibold">Semana atual</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="day" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="concluidas" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="habitos" fill="#10B981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Melhor: {bestDay?.day} · Menor: {worstDay?.day}
          </p>
        </div>

        <div className="card-elevated p-6">
          <h3 className="mb-4 font-semibold">Últimos 30 dias</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend30}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" stroke="var(--color-muted-foreground)" fontSize={10} interval={4} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                <Line type="monotone" dataKey="tarefas" stroke="var(--color-primary)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-elevated p-6 lg:col-span-2">
          <h3 className="mb-4 font-semibold">Tarefas concluídas por categoria</h3>
          {byCategory.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Sem dados ainda.</p>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                    {byCategory.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Card({ icon: Icon, label, value, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; tone?: "success" | "primary" | "warn" }) {
  const toneCls =
    tone === "success" ? "bg-success/15 text-success" :
    tone === "primary" ? "bg-primary/15 text-primary" :
    tone === "warn" ? "bg-orange-500/15 text-orange-600 dark:text-orange-400" :
    "bg-muted text-muted-foreground";
  return (
    <div className="card-elevated p-5">
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${toneCls}`}><Icon className="h-4 w-4" /></div>
      <div className="mt-3 text-2xl font-semibold tracking-tight">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
