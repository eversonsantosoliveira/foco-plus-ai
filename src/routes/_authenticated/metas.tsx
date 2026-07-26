import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/back-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/metas")({
  head: () => ({ meta: [{ title: "Metas — Foco+" }] }),
  component: Metas,
});

function Metas() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", target_value: 0, unit: "" });

  const { data: goals } = useQuery({
    enabled: !!user,
    queryKey: ["goals", user?.id],
    queryFn: async () => (await supabase.from("goals").select("*").eq("user_id", user!.id).order("created_at")).data ?? [],
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("goals").insert({ user_id: user!.id, ...form });
      if (error) throw error;
    },
    onSuccess: () => { setOpen(false); setForm({ title: "", target_value: 0, unit: "" }); qc.invalidateQueries({ queryKey: ["goals"] }); toast.success("Meta criada"); },
  });

  const updateProgress = async (id: string, current: number) => {
    await supabase.from("goals").update({ current_value: current }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["goals"] });
  };
  const remove = async (id: string) => {
    await supabase.from("goals").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["goals"] });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="mb-1 flex items-center gap-3"><BackButton fallback="/dashboard" /></div>
        <h1 className="text-3xl font-semibold tracking-tight">Metas</h1>
          <p className="text-muted-foreground">Objetivos semanais e progresso.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-1.5 h-4 w-4" /> Nova meta</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova meta</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>Título</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Estudar inglês" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Alvo</Label><Input type="number" value={form.target_value} onChange={(e) => setForm({ ...form, target_value: Number(e.target.value) })} /></div>
                <div className="space-y-2"><Label>Unidade</Label><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="horas, páginas..." /></div>
              </div>
              <Button className="w-full" disabled={!form.title} onClick={() => create.mutate()}>Criar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {(goals ?? []).map((g) => {
          const pct = g.target_value > 0 ? Math.min(100, Math.round((Number(g.current_value) / Number(g.target_value)) * 100)) : 0;
          return (
            <div key={g.id} className="card-elevated p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{g.title}</h3>
                  <p className="text-sm text-muted-foreground">{g.current_value} / {g.target_value} {g.unit}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => remove(g.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
              <Progress value={pct} className="mt-4" />
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => updateProgress(g.id, Math.max(0, Number(g.current_value) - 1))}>-1</Button>
                <Button size="sm" onClick={() => updateProgress(g.id, Number(g.current_value) + 1)}>+1</Button>
              </div>
            </div>
          );
        })}
        {(goals ?? []).length === 0 && <div className="col-span-full py-12 text-center text-sm text-muted-foreground">Nenhuma meta ainda.</div>}
      </div>
    </div>
  );
}
