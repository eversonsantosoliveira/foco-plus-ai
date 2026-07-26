import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/use-auth";
import { useProfile } from "@/lib/profile";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/lib/use-theme";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/back-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Sun, Moon, Monitor } from "lucide-react";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — Foco+" }] }),
  component: Config,
});

function Config() {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const { pref, setTheme } = useTheme();
  const qc = useQueryClient();
  const nav = useNavigate();

  const [form, setForm] = useState({
    language: "pt-BR",
    notifications_enabled: true,
    work_start: "09:00", work_end: "18:00",
    wake_time: "07:00", sleep_time: "23:00",
  });
  const [notifPerm, setNotifPerm] = useState<NotificationPermission | "unsupported">("default");

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) setNotifPerm(Notification.permission);
    else setNotifPerm("unsupported");
  }, []);

  useEffect(() => {
    if (!profile) return;
    setForm({
      language: profile.language ?? "pt-BR",
      notifications_enabled: profile.notifications_enabled ?? true,
      work_start: profile.work_start ?? "09:00",
      work_end: profile.work_end ?? "18:00",
      wake_time: profile.wake_time ?? "07:00",
      sleep_time: profile.sleep_time ?? "23:00",
    });
  }, [profile]);

  const update = async (patch: Partial<typeof form>) => {
    const next = { ...form, ...patch };
    setForm(next);
    const { error } = await supabase.from("profiles").update(next).eq("id", user!.id);
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["profile"] });
  };

  const toggleNotifs = async (v: boolean) => {
    if (v && "Notification" in window && Notification.permission !== "granted") {
      const p = await Notification.requestPermission();
      setNotifPerm(p);
      if (p !== "granted") return toast.error("Permissão negada pelo navegador");
    }
    await update({ notifications_enabled: v });
    toast.success(v ? "Notificações ativadas" : "Notificações desativadas");
  };

  const exportData = async () => {
    if (!user) return;
    const [tasks, habits, goals, events] = await Promise.all([
      supabase.from("tasks").select("*").eq("user_id", user.id),
      supabase.from("habits").select("*").eq("user_id", user.id),
      supabase.from("goals").select("*").eq("user_id", user.id),
      supabase.from("events").select("*").eq("user_id", user.id),
    ]);
    const blob = new Blob([JSON.stringify({ profile, tasks: tasks.data, habits: habits.data, goals: goals.data, events: events.data }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `focoplus-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Exportado");
  };

  const deleteAccount = async () => {
    if (!confirm("Tem certeza? Isso apagará TODOS os seus dados. Esta ação é irreversível.")) return;
    if (!user) return;
    await Promise.all([
      supabase.from("tasks").delete().eq("user_id", user.id),
      supabase.from("habits").delete().eq("user_id", user.id),
      supabase.from("goals").delete().eq("user_id", user.id),
      supabase.from("events").delete().eq("user_id", user.id),
      supabase.from("notifications").delete().eq("user_id", user.id),
      supabase.from("profiles").delete().eq("id", user.id),
    ]);
    await supabase.auth.signOut();
    toast.success("Dados apagados");
    nav({ to: "/", replace: true });
  };

  const logout = async () => {
    qc.clear();
    await supabase.auth.signOut();
    nav({ to: "/auth", replace: true });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <div className="mb-1 flex items-center gap-3"><BackButton fallback="/dashboard" /></div>
        <h1 className="text-3xl font-semibold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">Personalize sua experiência.</p>
      </div>

      <Section title="Aparência">
        <div className="space-y-3">
          <Label>Tema</Label>
          <div className="grid grid-cols-3 gap-2">
            {([
              { v: "light", label: "Claro", icon: Sun },
              { v: "dark", label: "Escuro", icon: Moon },
              { v: "system", label: "Sistema", icon: Monitor },
            ] as const).map((o) => (
              <button key={o.v} onClick={() => setTheme(o.v)}
                className={`flex flex-col items-center gap-2 rounded-lg border p-4 text-sm font-medium transition-colors ${pref === o.v ? "border-primary bg-primary/5" : "border-border hover:bg-muted"}`}>
                <o.icon className="h-5 w-5" />
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Idioma">
        <Select value={form.language} onValueChange={(v) => update({ language: v })}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
            <SelectItem value="en">English</SelectItem>
          </SelectContent>
        </Select>
      </Section>

      <Section title="Notificações">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">Lembretes no navegador</div>
            <p className="text-sm text-muted-foreground">30min, 10min e na hora de cada tarefa.</p>
            {notifPerm === "unsupported" && <p className="mt-1 text-xs text-destructive">Navegador sem suporte</p>}
          </div>
          <Switch checked={form.notifications_enabled} onCheckedChange={toggleNotifs} disabled={notifPerm === "unsupported"} />
        </div>
      </Section>

      <Section title="Horários">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><Label>Trabalho início</Label><Input type="time" value={form.work_start} onChange={(e) => update({ work_start: e.target.value })} /></div>
          <div className="space-y-1"><Label>Trabalho fim</Label><Input type="time" value={form.work_end} onChange={(e) => update({ work_end: e.target.value })} /></div>
          <div className="space-y-1"><Label>Acorda</Label><Input type="time" value={form.wake_time} onChange={(e) => update({ wake_time: e.target.value })} /></div>
          <div className="space-y-1"><Label>Dorme</Label><Input type="time" value={form.sleep_time} onChange={(e) => update({ sleep_time: e.target.value })} /></div>
        </div>
      </Section>

      <Section title="Dados & Conta">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportData}>Exportar dados</Button>
          <Button variant="outline" onClick={logout}>Sair</Button>
          <Button variant="destructive" onClick={deleteAccount}>Excluir conta</Button>
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
