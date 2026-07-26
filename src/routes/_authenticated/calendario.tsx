import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { useRealtime } from "@/lib/use-realtime";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/back-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Plus, Trash2, Copy, Pencil } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/calendario")({
  head: () => ({ meta: [{ title: "Calendário — Foco+" }] }),
  component: Calendario,
});

type Event = Database["public"]["Tables"]["events"]["Row"];
type Task = Database["public"]["Tables"]["tasks"]["Row"];

function startOfWeek(d: Date) {
  const x = new Date(d); x.setDate(x.getDate() - x.getDay()); x.setHours(0, 0, 0, 0); return x;
}
function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const HOURS = Array.from({ length: 16 }, (_, i) => i + 6);

const emptyEvent = { id: "", title: "", description: "", start: "", end: "", color: "primary" };

function Calendario() {
  const { user } = useAuth();
  const qc = useQueryClient();
  useRealtime("tasks", user?.id, ["cal-tasks"]);
  useRealtime("events", user?.id, ["cal-events"]);

  const [view, setView] = useState<"week" | "day">("week");
  const [anchor, setAnchor] = useState(() => (view === "week" ? startOfWeek(new Date()) : startOfDay(new Date())));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyEvent);
  const [editingId, setEditingId] = useState<string | null>(null);

  const rangeEnd = new Date(anchor);
  rangeEnd.setDate(rangeEnd.getDate() + (view === "week" ? 7 : 1));

  const { data: tasks } = useQuery({
    enabled: !!user,
    queryKey: ["cal-tasks", user?.id, anchor.toISOString(), view],
    queryFn: async () => {
      const { data } = await supabase.from("tasks").select("*")
        .eq("user_id", user!.id)
        .gte("scheduled_start", anchor.toISOString())
        .lt("scheduled_start", rangeEnd.toISOString());
      return (data ?? []) as Task[];
    },
  });

  const { data: events } = useQuery({
    enabled: !!user,
    queryKey: ["cal-events", user?.id, anchor.toISOString(), view],
    queryFn: async () => {
      const { data } = await supabase.from("events").select("*")
        .eq("user_id", user!.id)
        .gte("start_at", anchor.toISOString())
        .lt("start_at", rangeEnd.toISOString());
      return (data ?? []) as Event[];
    },
  });

  const days = useMemo(() => Array.from({ length: view === "week" ? 7 : 1 }, (_, i) => {
    const d = new Date(anchor); d.setDate(d.getDate() + i); return d;
  }), [anchor, view]);

  const openCreate = (slot?: Date) => {
    const start = slot ?? new Date();
    const end = new Date(start); end.setHours(end.getHours() + 1);
    setEditingId(null);
    setForm({ id: "", title: "", description: "", start: start.toISOString().slice(0, 16), end: end.toISOString().slice(0, 16), color: "primary" });
    setDialogOpen(true);
  };
  const openEdit = (e: Event) => {
    setEditingId(e.id);
    setForm({ id: e.id, title: e.title, description: e.description ?? "", start: new Date(e.start_at).toISOString().slice(0, 16), end: new Date(e.end_at).toISOString().slice(0, 16), color: e.color ?? "primary" });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.title || !form.start || !form.end) return toast.error("Preencha os campos");
    const payload = {
      title: form.title,
      description: form.description || null,
      start_at: new Date(form.start).toISOString(),
      end_at: new Date(form.end).toISOString(),
      color: form.color,
    };
    if (editingId) {
      await supabase.from("events").update(payload).eq("id", editingId);
      toast.success("Evento atualizado");
    } else {
      await supabase.from("events").insert({ ...payload, user_id: user!.id });
      toast.success("Evento criado");
    }
    setDialogOpen(false);
    qc.invalidateQueries({ queryKey: ["cal-events"] });
  };

  const remove = async (id: string) => {
    await supabase.from("events").delete().eq("id", id);
    toast.success("Excluído");
  };
  const duplicate = async (ev: Event) => {
    await supabase.from("events").insert({
      user_id: user!.id, title: ev.title, description: ev.description,
      start_at: ev.start_at, end_at: ev.end_at, color: ev.color,
    });
    toast.success("Duplicado");
  };

  const handleDrop = async (day: Date, hour: number, id: string, kind: "task" | "event") => {
    const start = new Date(day); start.setHours(hour, 0, 0, 0);
    if (kind === "task") {
      const t = tasks?.find((x) => x.id === id);
      const dur = t?.estimated_minutes ?? 30;
      const end = new Date(start.getTime() + dur * 60_000);
      await supabase.from("tasks").update({ scheduled_start: start.toISOString(), scheduled_end: end.toISOString(), status: "scheduled" }).eq("id", id);
    } else {
      const ev = events?.find((x) => x.id === id);
      if (!ev) return;
      const dur = new Date(ev.end_at).getTime() - new Date(ev.start_at).getTime();
      const end = new Date(start.getTime() + dur);
      await supabase.from("events").update({ start_at: start.toISOString(), end_at: end.toISOString() }).eq("id", id);
    }
  };

  const shift = (n: number) => {
    const d = new Date(anchor); d.setDate(d.getDate() + n); setAnchor(d);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-3"><BackButton fallback="/dashboard" /></div>
          <h1 className="text-3xl font-semibold tracking-tight">Calendário</h1>
          <p className="text-muted-foreground">
            {view === "week" ? `Semana de ${anchor.toLocaleDateString("pt-BR")}` : anchor.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-lg border border-border">
            <button onClick={() => { setView("day"); setAnchor(startOfDay(new Date())); }} className={cn("px-3 py-1.5 text-xs font-medium", view === "day" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>Dia</button>
            <button onClick={() => { setView("week"); setAnchor(startOfWeek(new Date())); }} className={cn("px-3 py-1.5 text-xs font-medium", view === "week" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>Semana</button>
          </div>
          <Button variant="outline" size="icon" onClick={() => shift(view === "week" ? -7 : -1)}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" onClick={() => setAnchor(view === "week" ? startOfWeek(new Date()) : startOfDay(new Date()))}>Hoje</Button>
          <Button variant="outline" size="icon" onClick={() => shift(view === "week" ? 7 : 1)}><ChevronRight className="h-4 w-4" /></Button>
          <Button onClick={() => openCreate()}><Plus className="mr-1.5 h-4 w-4" /> Novo</Button>
        </div>
      </div>

      <div className="card-elevated overflow-x-auto">
        <div className={cn("grid min-w-[600px]", view === "week" ? "grid-cols-[60px_repeat(7,1fr)]" : "grid-cols-[60px_1fr]")}>
          <div />
          {days.map((d, i) => {
            const today = d.toDateString() === new Date().toDateString();
            return (
              <div key={i} className={cn("border-b border-border px-2 py-3 text-center", today && "bg-primary/5")}>
                <div className="text-xs text-muted-foreground">{DAYS[d.getDay()]}</div>
                <div className={cn("text-lg font-semibold", today && "text-primary")}>{d.getDate()}</div>
              </div>
            );
          })}
          {HOURS.map((h) => (
            <div key={h} className="contents">
              <div className="border-t border-border px-2 py-2 text-right text-[10px] text-muted-foreground">{String(h).padStart(2, "0")}:00</div>
              {days.map((d, i) => {
                const slot = new Date(d); slot.setHours(h, 0, 0, 0);
                const slotEnd = new Date(slot); slotEnd.setHours(h + 1);
                const dayTasks = (tasks ?? []).filter((t) => t.scheduled_start && new Date(t.scheduled_start) >= slot && new Date(t.scheduled_start) < slotEnd);
                const dayEvents = (events ?? []).filter((e) => new Date(e.start_at) >= slot && new Date(e.start_at) < slotEnd);
                return (
                  <div
                    key={`${h}-${i}`}
                    className="min-h-[56px] border-l border-t border-border p-1"
                    onClick={(ev) => { if (ev.target === ev.currentTarget) openCreate(slot); }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      const [kind, id] = e.dataTransfer.getData("text/plain").split(":");
                      if (id) handleDrop(d, h, id, kind as "task" | "event");
                    }}
                  >
                    {dayTasks.map((t) => (
                      <div
                        key={t.id}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData("text/plain", `task:${t.id}`)}
                        className={cn("mb-1 truncate rounded-md px-2 py-1 text-[10px] font-medium",
                          t.status === "completed" ? "bg-success/15 text-success line-through" : "bg-primary/10 text-primary")}
                        title={t.title}
                      >
                        📋 {t.title}
                      </div>
                    ))}
                    {dayEvents.map((ev) => (
                      <div
                        key={ev.id}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData("text/plain", `event:${ev.id}`)}
                        className="group relative mb-1 truncate rounded-md bg-orange-500/15 px-2 py-1 text-[10px] font-medium text-orange-700 dark:text-orange-300"
                      >
                        <span>📅 {ev.title}</span>
                        <div className="absolute right-0 top-0 hidden gap-0.5 group-hover:flex">
                          <button onClick={(e) => { e.stopPropagation(); openEdit(ev); }} className="rounded bg-background/70 p-0.5"><Pencil className="h-2.5 w-2.5" /></button>
                          <button onClick={(e) => { e.stopPropagation(); duplicate(ev); }} className="rounded bg-background/70 p-0.5"><Copy className="h-2.5 w-2.5" /></button>
                          <button onClick={(e) => { e.stopPropagation(); remove(ev.id); }} className="rounded bg-background/70 p-0.5"><Trash2 className="h-2.5 w-2.5" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? "Editar evento" : "Novo evento"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Título</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus /></div>
            <div className="space-y-1.5"><Label>Descrição</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Início</Label><Input type="datetime-local" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Fim</Label><Input type="datetime-local" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} /></div>
            </div>
            <Button className="w-full" onClick={save}>{editingId ? "Salvar" : "Criar"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
