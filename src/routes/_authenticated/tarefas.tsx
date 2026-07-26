import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/back-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Trash2, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/tarefas")({
  head: () => ({ meta: [{ title: "Tarefas — Foco+" }] }),
  component: Tarefas,
});

function Tarefas() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: tasks } = useQuery({
    enabled: !!user,
    queryKey: ["tasks", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("tasks").select("*").eq("user_id", user!.id).order("scheduled_start", { ascending: true, nullsFirst: false });
      return data ?? [];
    },
  });

  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: 2,
    estimated_minutes: 30,
    deadline: "",
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tasks").insert({
        user_id: user!.id,
        title: form.title,
        description: form.description || null,
        priority: form.priority,
        estimated_minutes: form.estimated_minutes,
        deadline: form.deadline || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tarefa criada");
      setOpen(false);
      setForm({ title: "", description: "", priority: 2, estimated_minutes: 30, deadline: "" });
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = async (id: string, current: string) => {
    await supabase.from("tasks").update({
      status: current === "completed" ? "pending" : "completed",
      completed_at: current === "completed" ? null : new Date().toISOString(),
    }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["tasks"] });
  };
  const remove = async (id: string) => {
    await supabase.from("tasks").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["tasks"] });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="mb-1 flex items-center gap-3"><BackButton fallback="/dashboard" /></div>
        <h1 className="text-3xl font-semibold tracking-tight">Tarefas</h1>
          <p className="text-muted-foreground">Adicione tudo. A IA distribui pela semana.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-1.5 h-4 w-4" /> Nova tarefa</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova tarefa</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>Título</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div className="space-y-2"><Label>Descrição</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Prioridade</Label>
                  <Select value={String(form.priority)} onValueChange={(v) => setForm({ ...form, priority: Number(v) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Alta</SelectItem>
                      <SelectItem value="2">Média</SelectItem>
                      <SelectItem value="3">Baixa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Duração (min)</Label><Input type="number" min={5} value={form.estimated_minutes} onChange={(e) => setForm({ ...form, estimated_minutes: Number(e.target.value) })} /></div>
              </div>
              <div className="space-y-2"><Label>Prazo (opcional)</Label><Input type="datetime-local" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></div>
              <Button className="w-full" onClick={() => create.mutate()} disabled={!form.title || create.isPending}>Criar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="card-elevated divide-y divide-border">
        {(tasks ?? []).map((t) => (
          <div key={t.id} className="flex items-center gap-3 p-4">
            <button onClick={() => toggle(t.id, t.status)} className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${t.status === "completed" ? "border-success bg-success" : "border-muted-foreground/40 hover:border-primary"}`}>
              {t.status === "completed" && <CheckCircle2 className="h-4 w-4 text-success-foreground" />}
            </button>
            <div className="min-w-0 flex-1">
              <div className={`truncate text-sm font-medium ${t.status === "completed" ? "line-through text-muted-foreground" : ""}`}>{t.title}</div>
              <div className="text-xs text-muted-foreground">
                {t.scheduled_start ? new Date(t.scheduled_start).toLocaleString("pt-BR", { weekday: "short", hour: "2-digit", minute: "2-digit" }) : "Sem horário"}
                {" · "}{t.estimated_minutes} min
                {t.priority === 1 && " · Alta"}
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => remove(t.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
        {(tasks ?? []).length === 0 && <div className="p-12 text-center text-sm text-muted-foreground">Nenhuma tarefa ainda. Comece adicionando uma.</div>}
      </div>
    </div>
  );
}
