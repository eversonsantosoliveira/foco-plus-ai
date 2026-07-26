import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/use-auth";
import { useProfile, planStatus, trialRemainingMs } from "@/lib/profile";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/back-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { KIWIFY_CHECKOUT_URL, PREMIUM_PRICE_LABEL } from "@/lib/billing";
import { Crown, Check, Upload } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({ meta: [{ title: "Perfil — Foco+" }] }),
  component: Perfil,
});

const DAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

function Perfil() {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const qc = useQueryClient();

  const status = planStatus(profile);
  const ms = trialRemainingMs(profile);
  const h = Math.floor(ms / 3600_000);
  const m = Math.floor((ms % 3600_000) / 60_000);

  const [form, setForm] = useState({
    full_name: "", avatar_url: "", wake_time: "07:00", sleep_time: "23:00",
    work_start: "09:00", work_end: "18:00",
    work_days: [1, 2, 3, 4, 5] as number[],
    available_days: [0, 1, 2, 3, 4, 5, 6] as number[],
    gym_days: [] as number[], gym_time: "",
    daily_available_minutes: 120,
    objectives: "",
  });
  const [emailForm, setEmailForm] = useState("");
  const [passForm, setPassForm] = useState({ pw: "", confirm: "" });
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initial = useRef(false);

  useEffect(() => {
    if (!profile) return;
    setForm({
      full_name: profile.full_name ?? "",
      avatar_url: profile.avatar_url ?? "",
      wake_time: profile.wake_time ?? "07:00",
      sleep_time: profile.sleep_time ?? "23:00",
      work_start: profile.work_start ?? "09:00",
      work_end: profile.work_end ?? "18:00",
      work_days: profile.work_days ?? [1, 2, 3, 4, 5],
      available_days: profile.available_days ?? [0, 1, 2, 3, 4, 5, 6],
      gym_days: profile.gym_days ?? [],
      gym_time: profile.gym_time ?? "",
      daily_available_minutes: profile.daily_available_minutes ?? 120,
      objectives: profile.objectives ?? "",
    });
    setEmailForm(user?.email ?? "");
    initial.current = true;
  }, [profile, user?.email]);

  // Auto-save
  useEffect(() => {
    if (!initial.current || !user) return;
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      const { error } = await supabase.from("profiles").update(form).eq("id", user.id);
      if (error) toast.error(error.message);
      else qc.invalidateQueries({ queryKey: ["profile"] });
    }, 800);
  }, [form, user, qc]);

  const toggleDay = (key: "work_days" | "available_days" | "gym_days", idx: number) => {
    const arr = form[key];
    setForm({ ...form, [key]: arr.includes(idx) ? arr.filter((x) => x !== idx) : [...arr, idx].sort() });
  };

  const uploadAvatar = async (file: File) => {
    if (!user) return;
    const path = `${user.id}/${Date.now()}-${file.name}`;
    // Try bucket 'avatars'; if missing, gracefully error.
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (upErr) return toast.error("Configure o bucket 'avatars' no backend");
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    setForm({ ...form, avatar_url: data.publicUrl });
    toast.success("Foto atualizada");
  };

  const changeEmail = async () => {
    if (!emailForm) return;
    const { error } = await supabase.auth.updateUser({ email: emailForm });
    if (error) toast.error(error.message);
    else toast.success("Email de confirmação enviado");
  };

  const changePassword = async () => {
    if (passForm.pw.length < 6) return toast.error("Mínimo 6 caracteres");
    if (passForm.pw !== passForm.confirm) return toast.error("Senhas diferentes");
    const { error } = await supabase.auth.updateUser({ password: passForm.pw });
    if (error) toast.error(error.message);
    else { toast.success("Senha alterada"); setPassForm({ pw: "", confirm: "" }); }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <div className="mb-1 flex items-center gap-3"><BackButton fallback="/dashboard" /></div>
        <h1 className="text-3xl font-semibold tracking-tight">Perfil</h1>
        <p className="text-muted-foreground">Salvo automaticamente.</p>
      </div>

      {/* Avatar + basic */}
      <div className="card-elevated p-6">
        <div className="flex items-center gap-4">
          <label className="group relative flex h-20 w-20 cursor-pointer items-center justify-center overflow-hidden rounded-full gradient-primary text-3xl font-semibold text-white">
            {form.avatar_url
              ? <img src={form.avatar_url} alt="" className="h-full w-full object-cover" />
              : (form.full_name ?? "?").charAt(0).toUpperCase()}
            <div className="absolute inset-0 hidden items-center justify-center bg-black/40 group-hover:flex">
              <Upload className="h-5 w-5 text-white" />
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
          </label>
          <div className="flex-1 space-y-2">
            <div className="space-y-1"><Label>Nome</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
          </div>
        </div>
      </div>

      {/* Plano */}
      <div className="card-elevated overflow-hidden">
        <div className="gradient-primary p-6 text-white">
          <div className="flex items-center gap-2 text-sm opacity-90"><Crown className="h-4 w-4" /> Seu plano</div>
          <h3 className="mt-1 text-2xl font-semibold">
            {status === "premium" ? "Foco+ Premium" : status === "trial" ? "Teste Grátis" : "Gratuito"}
          </h3>
          {status === "trial" && <p className="mt-1 text-sm opacity-80">{ms > 0 ? `${h}h ${m}m restantes` : "Teste expirado"}</p>}
          {status === "premium" && profile?.premium_until && <p className="mt-1 text-sm opacity-80">Ativo até {new Date(profile.premium_until).toLocaleDateString("pt-BR")}</p>}
          {profile?.created_at && <p className="mt-1 text-xs opacity-70">Conta desde {new Date(profile.created_at).toLocaleDateString("pt-BR")}</p>}
        </div>
        <div className="space-y-3 p-6">
          {["IA organiza sua semana", "Reorganização automática", "Notificações inteligentes", "Hábitos, metas e relatórios"].map((f) => (
            <div key={f} className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-success" /> {f}</div>
          ))}
          <div className="pt-2 text-sm font-semibold">{PREMIUM_PRICE_LABEL}</div>
          <a href={KIWIFY_CHECKOUT_URL} target="_blank" rel="noreferrer" className="block">
            <Button className="w-full">{status === "premium" ? "Gerenciar assinatura" : "Assinar Premium"}</Button>
          </a>
        </div>
      </div>

      {/* Rotina */}
      <Section title="Rotina">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><Label>Acorda</Label><Input type="time" value={form.wake_time} onChange={(e) => setForm({ ...form, wake_time: e.target.value })} /></div>
          <div className="space-y-1"><Label>Dorme</Label><Input type="time" value={form.sleep_time} onChange={(e) => setForm({ ...form, sleep_time: e.target.value })} /></div>
          <div className="space-y-1"><Label>Trabalho início</Label><Input type="time" value={form.work_start} onChange={(e) => setForm({ ...form, work_start: e.target.value })} /></div>
          <div className="space-y-1"><Label>Trabalho fim</Label><Input type="time" value={form.work_end} onChange={(e) => setForm({ ...form, work_end: e.target.value })} /></div>
          <div className="col-span-2 space-y-1">
            <Label>Dias de trabalho</Label>
            <DayPicker days={form.work_days} onToggle={(i) => toggleDay("work_days", i)} />
          </div>
          <div className="col-span-2 space-y-1">
            <Label>Dias livres (disponíveis)</Label>
            <DayPicker days={form.available_days} onToggle={(i) => toggleDay("available_days", i)} />
          </div>
          <div className="col-span-2 space-y-1">
            <Label>Academia</Label>
            <DayPicker days={form.gym_days} onToggle={(i) => toggleDay("gym_days", i)} />
          </div>
          <div className="space-y-1"><Label>Horário academia</Label><Input type="time" value={form.gym_time} onChange={(e) => setForm({ ...form, gym_time: e.target.value })} /></div>
          <div className="space-y-1"><Label>Tempo disponível/dia (min)</Label><Input type="number" value={form.daily_available_minutes} onChange={(e) => setForm({ ...form, daily_available_minutes: Number(e.target.value) })} /></div>
        </div>
      </Section>

      <Section title="Objetivos">
        <Textarea rows={3} value={form.objectives} onChange={(e) => setForm({ ...form, objectives: e.target.value })} placeholder="Ex: passar no concurso, dominar inglês..." />
      </Section>

      <Section title="Conta">
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 space-y-1"><Label>Email</Label><Input value={emailForm} onChange={(e) => setEmailForm(e.target.value)} /></div>
            <Button variant="outline" onClick={changeEmail}>Atualizar email</Button>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 space-y-1"><Label>Nova senha</Label><Input type="password" value={passForm.pw} onChange={(e) => setPassForm({ ...passForm, pw: e.target.value })} /></div>
            <div className="flex-1 space-y-1"><Label>Confirmar</Label><Input type="password" value={passForm.confirm} onChange={(e) => setPassForm({ ...passForm, confirm: e.target.value })} /></div>
            <Button variant="outline" onClick={changePassword}>Alterar senha</Button>
          </div>
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

function DayPicker({ days, onToggle }: { days: number[]; onToggle: (i: number) => void }) {
  return (
    <div className="flex gap-1">
      {DAYS.map((lbl, i) => {
        const active = days.includes(i);
        return (
          <button key={i} type="button" onClick={() => onToggle(i)}
            className={`h-9 w-9 rounded-lg border text-xs font-medium transition-colors ${active ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted"}`}>
            {lbl}
          </button>
        );
      })}
    </div>
  );
}

// Switch import kept to avoid tree-shake warnings if used elsewhere.
void Switch;
