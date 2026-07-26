import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { useMemo } from "react";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios — Foco+" }] }),
  component: Relatorios,
});

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function Relatorios() {
  const { user } = useAuth();
  const { data: tasks } = useQuery({
    enabled: !!user,
    queryKey: ["tasks-report", user?.id],
    queryFn: async () => (await supabase.from("tasks").select("*").eq("user_id", user!.id)).data ?? [],
  });

  const chart = useMemo(() => {
    const start = new Date(); start.setDate(start.getDate() - start.getDay()); start.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(start); day.setDate(day.getDate() + i);
      const end = new Date(day); end.setDate(end.getDate() + 1);
      const dayTasks = (tasks ?? []).filter((t) => t.completed_at && new Date(t.completed_at) >= day && new Date(t.completed_at) < end);
      const focus = dayTasks.reduce((s, t) => s + (t.estimated_minutes ?? 0), 0);
      return { day: DAYS[i], concluidas: dayTasks.length, focoMin: focus };
    });
  }, [tasks]);

  const totalDone = (tasks ?? []).filter((t) => t.status === "completed").length;
  const totalMin = (tasks ?? []).filter((t) => t.status === "completed").reduce((s, t) => s + (t.estimated_minutes ?? 0), 0);
  const bestDay = chart.reduce((a, b) => (b.concluidas > a.concluidas ? b : a), chart[0]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <div className="mb-1 flex items-center gap-3"><BackButton fallback="/dashboard" /></div>
        <h1 className="text-3xl font-semibold tracking-tight">Relatórios</h1>
        <p className="text-muted-foreground">Sua produtividade em números.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card label="Tarefas concluídas" value={String(totalDone)} />
        <Card label="Horas focadas" value={`${Math.floor(totalMin / 60)}h ${totalMin % 60}m`} />
        <Card label="Dia mais produtivo" value={bestDay?.day ?? "-"} />
      </div>

      <div className="card-elevated p-6">
        <h3 className="mb-4 font-semibold">Semana atual</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="day" stroke="var(--color-muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
              <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
              <Bar dataKey="concluidas" fill="var(--color-primary)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-elevated p-5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}
