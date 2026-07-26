import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { useRealtime } from "@/lib/use-realtime";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/back-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/metas")({
  head: () => ({ meta: [{ title: "Metas — Foco+" }] }),
  component: Metas,
});

type Goal = Database["public"]["Tables"]["goals"]["Row"];
type Habit = Database["public"]["Tables"]["habits"]["Row"];

const emptyForm = {
  title: "", description: "", target_value: 10, unit: "",
  period: "weekly" as "weekly" | "monthly" | "custom",
  start_date: "", end_date: "",
  linked_habit_id: "none", linked_category: "",
};

function dateRange(period: "weekly" | "monthly" | "custom") {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  if (period === "weekly") { start.setDate(start.getDate() - start.getDay()); end.setDate(start.getDate() + 7); }
  else if (period === "monthly") { start.setDate(1); end.setMonth(end.getMonth() + 1); end.setDate(0); }
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

function Metas() {
  const { user } = useAuth();
  const qc = useQueryClient();
  useRealtime("goals", user?.id, ["goals"]);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: goals } = useQuery({
    enabled: !!user,
    queryKey: ["goals", user?.id],
    queryFn: async () => ((await supabase.from("goals").select("*").eq("user_id", user!.id).order("created_at")).data ?? []) as Goal[],
  });

  const { data: habits } = useQuery({
    enabled: !!user,
    queryKey: ["habits-list", user?.id],
    queryFn: async () => ((await supabase.from("habits").select("id,name").eq("user_id", user!.id)).data ?? []) as Pick<Habit, "id" | "name">[],
  });

  const openCreate = () => {
    const r = dateRange("weekly");
    setEditing(null);
    setForm({ ...emptyForm, start_date: r.start, end_date: r.end });
    setOpen(true);
  };
  const openEdit = (g: Goal) => {
    setEditing(g);
    setForm({
      title: g.title, description: g.description ?? "",
      target_value: Number(g.target_value), unit: g.unit ?? "",
      period: (g.period as "weekly" | "monthly" | "custom") ?? "weekly",
      start_date: g.start_date ?? "", end_date: g.end_date ?? "",
      linked_habit_id: g.linked_habit_id ?? "none", linked_category: g.linked_category ?? "",
    });
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title, description: form.description || null,
        target_value: form.target_value, unit: form.unit || null,
        period: form.period,
        start_date: form.start_date || null, end_date: form.end_date || null,
        linked_habit_id: form.linked_habit_id === "none" ? null : form.linked_habit_id,
        linked_category: form.linked_category || null,
      };
      if (editing) {
        const { error } = await supabase.from("goals").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("goals").insert({ ...payload, user_id: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => { setOpen(false); toast.success(editing ? "Atualizada" : "Meta criada"); qc.invalidateQueries({ queryKey: ["goals"] }); },
  });

  const updateProgress = async (id: string, current: number) => {
    await supabase.from("goals").update({ current_value: Math.max(0, current) }).eq("id", id);
  };
  const remove = async (id: string) => {
    await supabase.from("goals").delete().eq("id", id);
    toast.success("Excluída");
  };

  const daysLeft = (g: Goal) => {
    if (!g.end_date) return null;
    return Math.max(0, Math.ceil((new Date(g.end_date).getTime() - Date.now()) / 86400_000));
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="mb-1 flex items-center gap-3"><BackButton fallback="/dashboard" /></div>
          <h1 className="text-3xl font-semibold tracking-tight">Metas</h1>
          <p className="text-muted-foreground">Semanais, mensais ou personalizadas — com progresso automático.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={openCreate}><Plus className="mr-1.5 h-4 w-4" /> Nova meta</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Editar meta" : "Nova meta"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5"><Label>Título</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Estudar inglês" autoFocus /></div>
              <div className="space-y-1.5"><Label>Descrição</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Alvo</Label><Input type="number" value={form.target_value} onChange={(e) => setForm({ ...form, target_value: Number(e.target.value) })} /></div>
                <div className="space-y-1.5"><Label>Unidade</Label><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="horas, páginas..." /></div>
              </div>
              <div className="space-y-1.5">
                <Label>Período</Label>
                <Select value={form.period} onValueChange={(v) => {
                  const period = v as "weekly" | "monthly" | "custom";
                  const r = period === "custom" ? { start: form.start_date, end: form.end_date } : dateRange(period);
                  setForm({ ...form, period, start_date: r.start, end_date: r.end });
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="custom">Personalizada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.period === "custom" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>Início</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label>Fim</Label><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Vincular hábito</Label>
                  <Select value={form.linked_habit_id} onValueChange={(v) => setForm({ ...form, linked_habit_id: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {(habits ?? []).map((h) => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Categoria de tarefa</Label><Input value={form.linked_category} onChange={(e) => setForm({ ...form, linked_category: e.target.value })} placeholder="Estudos" /></div>
              </div>
              <Button className="w-full" disabled={!form.title} onClick={() => save.mutate()}>{editing ? "Salvar" : "Criar"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {(goals ?? []).map((g) => {
          const pct = Number(g.target_value) > 0 ? Math.min(100, Math.round((Number(g.current_value) / Number(g.target_value)) * 100)) : 0;
          const dl = daysLeft(g);
          return (
            <div key={g.id} className="card-elevated p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{g.title}</h3>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase text-muted-foreground">{g.period ?? "weekly"}</span>
                  </div>
                  {g.description && <p className="mt-1 text-xs text-muted-foreground">{g.description}</p>}
                  <p className="mt-1 text-sm text-muted-foreground">{g.current_value} / {g.target_value} {g.unit ?? ""}</p>
                  {dl !== null && <p className="text-xs text-muted-foreground">{dl} dias restantes</p>}
                </div>
                <div className="flex">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(g)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(g.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
              <Progress value={pct} className="mt-4" />
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => updateProgress(g.id, Number(g.current_value) - 1)}>-1</Button>
                <Button size="sm" onClick={() => updateProgress(g.id, Number(g.current_value) + 1)}>+1</Button>
                <div className="ml-auto text-lg font-semibold">{pct}%</div>
              </div>
            </div>
          );
        })}
        {(goals ?? []).length === 0 && <div className="col-span-full py-12 text-center text-sm text-muted-foreground">Nenhuma meta ainda.</div>}
      </div>
    </div>
  );
}
