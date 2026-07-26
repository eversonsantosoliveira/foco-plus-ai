import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Flame, Check, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/habitos")({
  head: () => ({ meta: [{ title: "Hábitos — Foco+" }] }),
  component: Habitos,
});

function Habitos() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  const { data: habits } = useQuery({
    enabled: !!user,
    queryKey: ["habits", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("habits").select("*").eq("user_id", user!.id).order("created_at");
      return data ?? [];
    },
  });

  const { data: logs } = useQuery({
    enabled: !!user,
    queryKey: ["habit_logs", user?.id],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await supabase.from("habit_logs").select("*").eq("user_id", user!.id).eq("log_date", today);
      return data ?? [];
    },
  });

  const doneToday = (habitId: string) => logs?.some((l) => l.habit_id === habitId);

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("habits").insert({ user_id: user!.id, name });
      if (error) throw error;
    },
    onSuccess: () => { setOpen(false); setName(""); qc.invalidateQueries({ queryKey: ["habits"] }); toast.success("Hábito criado"); },
  });

  const toggle = async (habitId: string) => {
    const today = new Date().toISOString().slice(0, 10);
    const existing = logs?.find((l) => l.habit_id === habitId);
    if (existing) {
      await supabase.from("habit_logs").delete().eq("id", existing.id);
    } else {
      await supabase.from("habit_logs").insert({ user_id: user!.id, habit_id: habitId, log_date: today });
      const h = habits?.find((x) => x.id === habitId);
      if (h) {
        await supabase.from("habits").update({ streak: h.streak + 1, best_streak: Math.max(h.best_streak, h.streak + 1) }).eq("id", habitId);
      }
    }
    qc.invalidateQueries({ queryKey: ["habit_logs"] });
    qc.invalidateQueries({ queryKey: ["habits"] });
  };

  const remove = async (id: string) => {
    await supabase.from("habits").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["habits"] });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Hábitos</h1>
          <p className="text-muted-foreground">Pequenas ações, grandes mudanças.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-1.5 h-4 w-4" /> Novo hábito</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo hábito</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Beber 2L de água" /></div>
              <Button className="w-full" disabled={!name} onClick={() => create.mutate()}>Criar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {(habits ?? []).map((h) => {
          const done = doneToday(h.id);
          return (
            <div key={h.id} className="card-elevated flex items-center gap-4 p-4">
              <button onClick={() => toggle(h.id)} className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-all ${done ? "bg-success text-success-foreground" : "border-2 border-muted-foreground/30 hover:border-primary"}`}>
                {done && <Check className="h-5 w-5" />}
              </button>
              <div className="flex-1">
                <div className="font-medium">{h.name}</div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Flame className="h-3.5 w-3.5 text-orange-500" /> {h.streak} dias · melhor: {h.best_streak}
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => remove(h.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          );
        })}
        {(habits ?? []).length === 0 && <div className="col-span-full py-12 text-center text-sm text-muted-foreground">Nenhum hábito ainda.</div>}
      </div>
    </div>
  );
}
