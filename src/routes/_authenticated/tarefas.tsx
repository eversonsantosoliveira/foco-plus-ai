import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { useRealtime } from "@/lib/use-realtime";
import { isPremiumActive, useProfile } from "@/lib/profile";
import { organizeWeek } from "@/lib/ai-organize.functions";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/back-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Trash2, CheckCircle2, Search, Sparkles, Pencil, Copy, Clock } from "lucide-react";
import { KIWIFY_CHECKOUT_URL } from "@/lib/billing";
import type { Database } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/tarefas")({
  head: () => ({ meta: [{ title: "Tarefas — Foco+" }] }),
  component: Tarefas,
});

type Task = Database["public"]["Tables"]["tasks"]["Row"];

// UI priority (Urgente/Alta/Média/Baixa) maps to numeric priority.
// Legacy: 1=Alta, 2=Média, 3=Baixa. We extend: 0=Urgente.
const PRIORITY = {
  0: { label: "Urgente", color: "bg-destructive/15 text-destructive border-destructive/30" },
  1: { label: "Alta", color: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30" },
  2: { label: "Média", color: "bg-primary/10 text-primary border-primary/25" },
  3: { label: "Baixa", color: "bg-muted text-muted-foreground border-border" },
} as const;

const STATUS_COLS: { key: "pending" | "scheduled" | "completed"; label: string }[] = [
  { key: "pending", label: "Pendente" },
  { key: "scheduled", label: "Agendada" },
  { key: "completed", label: "Concluída" },
];

const emptyForm = { title: "", description: "", priority: 2, estimated_minutes: 30, deadline: "", category: "", scheduled_start: "" };

function Tarefas() {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const qc = useQueryClient();
  useRealtime("tasks", user?.id, ["tasks"]);
  const organize = useServerFn(organizeWeek);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterWhen, setFilterWhen] = useState<"all" | "today" | "week" | "overdue">("all");

  const { data: tasks, isLoading } = useQuery({
    enabled: !!user,
    queryKey: ["tasks", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user!.id)
        .order("position", { ascending: true })
        .order("scheduled_start", { ascending: true, nullsFirst: false });
      return (data ?? []) as Task[];
    },
  });

  const categories = useMemo(() => {
    const s = new Set<string>();
    (tasks ?? []).forEach((t) => t.category && s.add(t.category));
    return Array.from(s);
  }, [tasks]);

  const filtered = useMemo(() => {
    let list = tasks ?? [];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((t) => t.title.toLowerCase().includes(q) || (t.description ?? "").toLowerCase().includes(q));
    }
    if (filterPriority !== "all") list = list.filter((t) => String(t.priority) === filterPriority);
    if (filterCategory !== "all") list = list.filter((t) => t.category === filterCategory);
    if (filterWhen !== "all") {
      const now = new Date();
      const today = new Date(now); today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
      const weekEnd = new Date(today); weekEnd.setDate(weekEnd.getDate() + 7);
      list = list.filter((t) => {
        const d = t.scheduled_start ? new Date(t.scheduled_start) : t.deadline ? new Date(t.deadline) : null;
        if (!d) return filterWhen === "overdue" ? false : false;
        if (filterWhen === "today") return d >= today && d < tomorrow;
        if (filterWhen === "week") return d >= today && d < weekEnd;
        if (filterWhen === "overdue") return d < now && t.status !== "completed";
        return true;
      });
    }
    return list;
  }, [tasks, search, filterPriority, filterCategory, filterWhen]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (t: Task) => {
    setEditing(t);
    setForm({
      title: t.title,
      description: t.description ?? "",
      priority: t.priority,
      estimated_minutes: t.estimated_minutes ?? 30,
      deadline: t.deadline ? new Date(t.deadline).toISOString().slice(0, 16) : "",
      category: t.category ?? "",
      scheduled_start: t.scheduled_start ? new Date(t.scheduled_start).toISOString().slice(0, 16) : "",
    });
    setDialogOpen(true);
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title,
        description: form.description || null,
        priority: form.priority,
        estimated_minutes: form.estimated_minutes,
        deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
        category: form.category || null,
        scheduled_start: form.scheduled_start ? new Date(form.scheduled_start).toISOString() : null,
        scheduled_end: form.scheduled_start
          ? new Date(new Date(form.scheduled_start).getTime() + form.estimated_minutes * 60_000).toISOString()
          : null,
        status: form.scheduled_start ? "scheduled" : "pending",
      };
      if (editing) {
        const { error } = await supabase.from("tasks").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tasks").insert({ ...payload, user_id: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Tarefa atualizada" : "Tarefa criada");
      setDialogOpen(false);
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleComplete = async (t: Task) => {
    const done = t.status === "completed";
    await supabase.from("tasks").update({
      status: done ? "pending" : "completed",
      completed_at: done ? null : new Date().toISOString(),
    }).eq("id", t.id);
    if (!done) toast.success("Concluída ✅");
  };

  const remove = async (id: string) => {
    await supabase.from("tasks").delete().eq("id", id);
    toast.success("Tarefa excluída");
  };

  const duplicate = async (t: Task) => {
    const { id: _id, created_at: _c, updated_at: _u, completed_at: _cc, ...rest } = t;
    void _id; void _c; void _u; void _cc;
    await supabase.from("tasks").insert({ ...rest, status: "pending", completed_at: null });
    toast.success("Duplicada");
  };

  const moveTo = async (t: Task, status: "pending" | "scheduled" | "completed") => {
    await supabase.from("tasks").update({
      status,
      completed_at: status === "completed" ? new Date().toISOString() : null,
    }).eq("id", t.id);
  };

  const organizeMut = useMutation({
    mutationFn: async () => {
      const start = new Date(); start.setDate(start.getDate() - start.getDay()); start.setHours(0, 0, 0, 0);
      return organize({ data: { weekStartISO: start.toISOString() } });
    },
    onSuccess: (r) => { toast.success(r.message); qc.invalidateQueries({ queryKey: ["tasks"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const premium = isPremiumActive(profile);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-3"><BackButton fallback="/dashboard" /></div>
          <h1 className="text-3xl font-semibold tracking-tight">Tarefas</h1>
          <p className="text-muted-foreground">Organize seu dia. Arraste entre colunas para mudar o status.</p>
        </div>
        <div className="flex items-center gap-2">
          {premium ? (
            <Button variant="outline" onClick={() => organizeMut.mutate()} disabled={organizeMut.isPending}>
              <Sparkles className="mr-1.5 h-4 w-4" /> {organizeMut.isPending ? "Organizando..." : "IA reorganiza"}
            </Button>
          ) : (
            <a href={KIWIFY_CHECKOUT_URL} target="_blank" rel="noreferrer">
              <Button variant="outline"><Sparkles className="mr-1.5 h-4 w-4" /> IA (Premium)</Button>
            </a>
          )}
          <Button onClick={openCreate}><Plus className="mr-1.5 h-4 w-4" /> Nova tarefa</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="card-elevated flex flex-wrap items-center gap-2 p-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." className="pl-9" />
        </div>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Prioridade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="0">Urgente</SelectItem>
            <SelectItem value="1">Alta</SelectItem>
            <SelectItem value="2">Média</SelectItem>
            <SelectItem value="3">Baixa</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            {categories.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
          </SelectContent>
        </Select>
        <Select value={filterWhen} onValueChange={(v) => setFilterWhen(v as "all" | "today" | "week" | "overdue")}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Qualquer data</SelectItem>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="week">Esta semana</SelectItem>
            <SelectItem value="overdue">Atrasadas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Kanban */}
      <div className="grid gap-4 md:grid-cols-3">
        {STATUS_COLS.map((col) => (
          <div
            key={col.key}
            className="card-elevated flex min-h-[300px] flex-col p-4"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              const id = e.dataTransfer.getData("text/plain");
              const t = tasks?.find((x) => x.id === id);
              if (t && t.status !== col.key) moveTo(t, col.key);
            }}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">{col.label}</h3>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {filtered.filter((t) => t.status === col.key).length}
              </span>
            </div>
            <div className="flex-1 space-y-2">
              {isLoading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
              {filtered.filter((t) => t.status === col.key).map((t) => (
                <div
                  key={t.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", t.id)}
                  className="group cursor-grab rounded-lg border border-border bg-background p-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing"
                >
                  <div className="flex items-start gap-2">
                    <button
                      onClick={() => toggleComplete(t)}
                      className={cn(
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                        t.status === "completed" ? "border-success bg-success" : "border-muted-foreground/40 hover:border-primary",
                      )}
                    >
                      {t.status === "completed" && <CheckCircle2 className="h-3.5 w-3.5 text-success-foreground" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className={cn("text-sm font-medium", t.status === "completed" && "text-muted-foreground line-through")}>
                        {t.title}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
                        <span className={cn("rounded border px-1.5 py-0.5 font-medium", PRIORITY[t.priority as 0 | 1 | 2 | 3]?.color ?? PRIORITY[2].color)}>
                          {PRIORITY[t.priority as 0 | 1 | 2 | 3]?.label ?? "Média"}
                        </span>
                        {t.category && <span className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground">{t.category}</span>}
                        {t.estimated_minutes ? (
                          <span className="flex items-center gap-0.5 text-muted-foreground">
                            <Clock className="h-3 w-3" /> {t.estimated_minutes}m
                          </span>
                        ) : null}
                      </div>
                      {(t.scheduled_start || t.deadline) && (
                        <div className="mt-1 text-[10px] text-muted-foreground">
                          {t.scheduled_start
                            ? new Date(t.scheduled_start).toLocaleString("pt-BR", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
                            : `Prazo: ${new Date(t.deadline!).toLocaleDateString("pt-BR")}`}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col opacity-0 transition-opacity group-hover:opacity-100">
                      <button onClick={() => openEdit(t)} className="rounded p-1 hover:bg-muted"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => duplicate(t)} className="rounded p-1 hover:bg-muted"><Copy className="h-3.5 w-3.5" /></button>
                      <button onClick={() => remove(t.id)} className="rounded p-1 hover:bg-muted"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                </div>
              ))}
              {!isLoading && filtered.filter((t) => t.status === col.key).length === 0 && (
                <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                  Solte tarefas aqui
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild><span className="hidden" /></DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar tarefa" : "Nova tarefa"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Título</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus /></div>
            <div className="space-y-1.5"><Label>Descrição</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Prioridade</Label>
                <Select value={String(form.priority)} onValueChange={(v) => setForm({ ...form, priority: Number(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Urgente</SelectItem>
                    <SelectItem value="1">Alta</SelectItem>
                    <SelectItem value="2">Média</SelectItem>
                    <SelectItem value="3">Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Duração (min)</Label><Input type="number" min={5} value={form.estimated_minutes} onChange={(e) => setForm({ ...form, estimated_minutes: Number(e.target.value) })} /></div>
              <div className="space-y-1.5"><Label>Categoria</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Trabalho, Estudos..." /></div>
              <div className="space-y-1.5"><Label>Prazo</Label><Input type="datetime-local" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></div>
              <div className="col-span-2 space-y-1.5"><Label>Agendar para</Label><Input type="datetime-local" value={form.scheduled_start} onChange={(e) => setForm({ ...form, scheduled_start: e.target.value })} /></div>
            </div>
            <Button className="w-full" disabled={!form.title || saveMut.isPending} onClick={() => saveMut.mutate()}>
              {saveMut.isPending ? "Salvando..." : editing ? "Salvar" : "Criar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
