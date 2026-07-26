import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { useRealtime } from "@/lib/use-realtime";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/back-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Flame, Check, Trash2, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/habitos")({
  head: () => ({ meta: [{ title: "Hábitos — Foco+" }] }),
  component: Habitos,
});

type Habit = Database["public"]["Tables"]["habits"]["Row"];
type Log = Database["public"]["Tables"]["habit_logs"]["Row"];

const DAY_LABELS = ["D", "S", "T", "Q", "Q", "S", "S"];

function todayStr() { return new Date().toISOString().slice(0, 10); }
function dayStr(d: Date) { return d.toISOString().slice(0, 10); }

const emptyForm = { name: "", frequency: [0, 1, 2, 3, 4, 5, 6] as number[], target_per_week: 7 };

function Habitos() {
  const { user } = useAuth();
  const qc = useQueryClient();
  useRealtime("habits", user?.id, ["habits"]);
  useRealtime("habit_logs", user?.id, ["habit_logs", "habit_history"]);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Habit | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: habits } = useQuery({
    enabled: !!user,
    queryKey: ["habits", user?.id],
    queryFn: async () => ((await supabase.from("habits").select("*").eq("user_id", user!.id).order("created_at")).data ?? []) as Habit[],
  });

  const { data: logsToday } = useQuery({
    enabled: !!user,
    queryKey: ["habit_logs", user?.id],
    queryFn: async () => ((await supabase.from("habit_logs").select("*").eq("user_id", user!.id).eq("log_date", todayStr())).data ?? []) as Log[],
  });

  const { data: history } = useQuery({
    enabled: !!user,
    queryKey: ["habit_history", user?.id],
    queryFn: async () => {
      const since = new Date(); since.setDate(since.getDate() - 90);
      return ((await supabase.from("habit_logs").select("*").eq("user_id", user!.id).gte("log_date", dayStr(since))).data ?? []) as Log[];
    },
  });

  const doneToday = (habitId: string) => logsToday?.some((l) => l.habit_id === habitId);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (h: Habit) => {
    setEditing(h);
    setForm({ name: h.name, frequency: h.frequency ?? [0, 1, 2, 3, 4, 5, 6], target_per_week: h.target_per_week ?? 7 });
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (editing) {
        const { error } = await supabase.from("habits").update({ name: form.name, frequency: form.frequency, target_per_week: form.target_per_week }).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("habits").insert({ user_id: user!.id, name: form.name, frequency: form.frequency, target_per_week: form.target_per_week });
        if (error) throw error;
      }
    },
    onSuccess: () => { setOpen(false); toast.success(editing ? "Atualizado" : "Hábito criado"); qc.invalidateQueries({ queryKey: ["habits"] }); },
  });

  const toggle = async (habit: Habit) => {
    const existing = logsToday?.find((l) => l.habit_id === habit.id);
    if (existing) {
      await supabase.from("habit_logs").delete().eq("id", existing.id);
      await supabase.from("habits").update({ streak: Math.max(0, habit.streak - 1) }).eq("id", habit.id);
    } else {
      await supabase.from("habit_logs").insert({ user_id: user!.id, habit_id: habit.id, log_date: todayStr() });
      const nextStreak = habit.streak + 1;
      await supabase.from("habits").update({ streak: nextStreak, best_streak: Math.max(habit.best_streak, nextStreak) }).eq("id", habit.id);
    }
  };

  const remove = async (id: string) => {
    await supabase.from("habits").delete().eq("id", id);
    toast.success("Excluído");
  };

  const heatmap = useMemo(() => {
    // 90 days grouped by habit for header display
    const days = Array.from({ length: 90 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (89 - i)); return dayStr(d); });
    return days;
  }, []);

  const habitStats = (habitId: string) => {
    const logs = (history ?? []).filter((l) => l.habit_id === habitId).map((l) => l.log_date);
    const last7 = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - i); return dayStr(d); });
    const last30 = Array.from({ length: 30 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - i); return dayStr(d); });
    const rate7 = Math.round((last7.filter((d) => logs.includes(d)).length / 7) * 100);
    const rate30 = Math.round((last30.filter((d) => logs.includes(d)).length / 30) * 100);
    return { rate7, rate30, logs: new Set(logs) };
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="mb-1 flex items-center gap-3"><BackButton fallback="/dashboard" /></div>
          <h1 className="text-3xl font-semibold tracking-tight">Hábitos</h1>
          <p className="text-muted-foreground">Pequenas ações, grandes mudanças.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={openCreate}><Plus className="mr-1.5 h-4 w-4" /> Novo hábito</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Editar hábito" : "Novo hábito"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Beber 2L de água" /></div>
              <div className="space-y-2">
                <Label>Dias da semana</Label>
                <div className="flex gap-1">
                  {DAY_LABELS.map((lbl, idx) => {
                    const active = form.frequency.includes(idx);
                    return (
                      <button key={idx} type="button" onClick={() => setForm({ ...form, frequency: active ? form.frequency.filter((x) => x !== idx) : [...form.frequency, idx].sort() })}
                        className={cn("h-9 w-9 rounded-lg border text-xs font-medium", active ? "border-primary bg-primary text-primary-foreground" : "border-border")}>
                        {lbl}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Meta semanal (X vezes)</Label>
                <Select value={String(form.target_per_week)} onValueChange={(v) => setForm({ ...form, target_per_week: Number(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7].map((n) => <SelectItem key={n} value={String(n)}>{n}x</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" disabled={!form.name} onClick={() => save.mutate()}>{editing ? "Salvar" : "Criar"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3">
        {(habits ?? []).map((h) => {
          const done = doneToday(h.id);
          const stats = habitStats(h.id);
          return (
            <div key={h.id} className="card-elevated p-4">
              <div className="flex items-center gap-4">
                <button onClick={() => toggle(h)}
                  className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-all",
                    done ? "bg-success text-success-foreground" : "border-2 border-muted-foreground/30 hover:border-primary")}>
                  {done && <Check className="h-5 w-5" />}
                </button>
                <div className="flex-1">
                  <div className="font-medium">{h.name}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Flame className="h-3.5 w-3.5 text-orange-500" /> {h.streak} dias · melhor {h.best_streak}</span>
                    <span>7 dias: {stats.rate7}%</span>
                    <span>30 dias: {stats.rate30}%</span>
                    <span>Meta: {h.target_per_week ?? 7}x/sem</span>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => openEdit(h)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => remove(h.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
              <div className="mt-3 flex flex-wrap gap-0.5">
                {heatmap.map((d) => (
                  <div key={d} title={d}
                    className={cn("h-3 w-3 rounded-sm", stats.logs.has(d) ? "bg-primary" : "bg-muted")} />
                ))}
              </div>
            </div>
          );
        })}
        {(habits ?? []).length === 0 && <div className="py-12 text-center text-sm text-muted-foreground">Nenhum hábito ainda.</div>}
      </div>
    </div>
  );
}
