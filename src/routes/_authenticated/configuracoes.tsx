import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/use-auth";
import { useProfile } from "@/lib/profile";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/lib/use-theme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — Foco+" }] }),
  component: Config,
});

function Config() {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const { theme, setTheme } = useTheme();
  const [form, setForm] = useState({ full_name: "", wake_time: "07:00", sleep_time: "23:00", work_start: "09:00", work_end: "18:00" });
  const [notifs, setNotifs] = useState(false);

  useEffect(() => {
    if (profile) setForm({
      full_name: profile.full_name ?? "",
      wake_time: profile.wake_time ?? "07:00",
      sleep_time: profile.sleep_time ?? "23:00",
      work_start: profile.work_start ?? "09:00",
      work_end: profile.work_end ?? "18:00",
    });
  }, [profile]);

  const save = async () => {
    const { error } = await supabase.from("profiles").update(form).eq("id", user!.id);
    if (error) return toast.error(error.message);
    toast.success("Salvo");
  };

  const requestNotifications = async () => {
    if (!("Notification" in window)) return toast.error("Navegador sem suporte");
    const p = await Notification.requestPermission();
    setNotifs(p === "granted");
    if (p === "granted") toast.success("Notificações ativadas");
  };

  const exportData = async () => {
    if (!user) return;
    const [tasks, habits, goals] = await Promise.all([
      supabase.from("tasks").select("*").eq("user_id", user.id),
      supabase.from("habits").select("*").eq("user_id", user.id),
      supabase.from("goals").select("*").eq("user_id", user.id),
    ]);
    const blob = new Blob([JSON.stringify({ tasks: tasks.data, habits: habits.data, goals: goals.data }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "focoplus-export.json"; a.click(); URL.revokeObjectURL(url);
  };

  const deleteAccount = async () => {
    if (!confirm("Tem certeza? Isso apagará todos os seus dados.")) return;
    if (!user) return;
    await supabase.from("tasks").delete().eq("user_id", user.id);
    await supabase.from("habits").delete().eq("user_id", user.id);
    await supabase.from("goals").delete().eq("user_id", user.id);
    await supabase.auth.signOut();
    toast.success("Dados apagados");
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">Personalize a experiência.</p>
      </div>

      <Section title="Perfil">
        <div className="space-y-4">
          <div className="space-y-2"><Label>Nome</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Acorda</Label><Input type="time" value={form.wake_time} onChange={(e) => setForm({ ...form, wake_time: e.target.value })} /></div>
            <div className="space-y-2"><Label>Dorme</Label><Input type="time" value={form.sleep_time} onChange={(e) => setForm({ ...form, sleep_time: e.target.value })} /></div>
            <div className="space-y-2"><Label>Trabalho início</Label><Input type="time" value={form.work_start} onChange={(e) => setForm({ ...form, work_start: e.target.value })} /></div>
            <div className="space-y-2"><Label>Trabalho fim</Label><Input type="time" value={form.work_end} onChange={(e) => setForm({ ...form, work_end: e.target.value })} /></div>
          </div>
          <Button onClick={save}>Salvar</Button>
        </div>
      </Section>

      <Section title="Aparência">
        <div className="flex items-center justify-between">
          <div><div className="font-medium">Tema escuro</div><p className="text-sm text-muted-foreground">Menos brilho, mais foco.</p></div>
          <Switch checked={theme === "dark"} onCheckedChange={(v) => setTheme(v ? "dark" : "light")} />
        </div>
      </Section>

      <Section title="Notificações">
        <div className="flex items-center justify-between">
          <div><div className="font-medium">Lembretes no navegador</div><p className="text-sm text-muted-foreground">30min, 10min e na hora de cada tarefa.</p></div>
          <Switch checked={notifs} onCheckedChange={requestNotifications} />
        </div>
      </Section>

      <Section title="Dados">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportData}>Exportar dados</Button>
          <Button variant="destructive" onClick={deleteAccount}>Excluir dados</Button>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card-elevated p-6">
      <h3 className="mb-4 font-semibold">{title}</h3>
      {children}
    </div>
  );
}
