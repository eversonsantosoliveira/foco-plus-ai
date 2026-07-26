import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BackButton } from "@/components/back-button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";


export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Vamos começar — Foco+" }] }),
  component: Onboarding,
});

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function DayPicker({ value, onChange }: { value: number[]; onChange: (v: number[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {DAYS.map((d, i) => {
        const active = value.includes(i);
        return (
          <button
            key={i}
            type="button"
            onClick={() => onChange(active ? value.filter((v) => v !== i) : [...value, i])}
            className={cn(
              "h-10 w-14 rounded-lg text-sm font-medium transition-all",
              active ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:bg-accent",
            )}
          >
            {d}
          </button>
        );
      })}
    </div>
  );
}

function Onboarding() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    wake_time: "07:00",
    sleep_time: "23:00",
    work_days: [1, 2, 3, 4, 5],
    work_start: "09:00",
    work_end: "18:00",
    available_days: [1, 2, 3, 4, 5, 6],
    gym_days: [] as number[],
    daily_available_minutes: 120,
    objectives: "",
    habits_text: "",
    fixed_commitments: "",
  });

  const steps = [
    {
      title: "Como podemos te chamar?",
      body: (
        <div className="space-y-2">
          <Label>Nome</Label>
          <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Seu nome" />
        </div>
      ),
    },
    {
      title: "Sua rotina de sono",
      body: (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Acorda às</Label>
            <Input type="time" value={form.wake_time} onChange={(e) => setForm({ ...form, wake_time: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Dorme às</Label>
            <Input type="time" value={form.sleep_time} onChange={(e) => setForm({ ...form, sleep_time: e.target.value })} />
          </div>
        </div>
      ),
    },
    {
      title: "Seus dias e horário de trabalho",
      body: (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Dias de trabalho</Label>
            <DayPicker value={form.work_days} onChange={(v) => setForm({ ...form, work_days: v })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Início</Label>
              <Input type="time" value={form.work_start} onChange={(e) => setForm({ ...form, work_start: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Fim</Label>
              <Input type="time" value={form.work_end} onChange={(e) => setForm({ ...form, work_end: e.target.value })} />
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Sua disponibilidade",
      body: (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Dias disponíveis para tarefas pessoais</Label>
            <DayPicker value={form.available_days} onChange={(v) => setForm({ ...form, available_days: v })} />
          </div>
          <div className="space-y-2">
            <Label>Dias de academia</Label>
            <DayPicker value={form.gym_days} onChange={(v) => setForm({ ...form, gym_days: v })} />
          </div>
          <div className="space-y-2">
            <Label>Tempo livre por dia (minutos): {form.daily_available_minutes}</Label>
            <input
              type="range"
              min={30}
              max={480}
              step={15}
              value={form.daily_available_minutes}
              onChange={(e) => setForm({ ...form, daily_available_minutes: Number(e.target.value) })}
              className="w-full accent-[color:var(--color-primary)]"
            />
          </div>
        </div>
      ),
    },
    {
      title: "Seus objetivos e hábitos",
      body: (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Objetivos principais</Label>
            <Textarea rows={3} value={form.objectives} onChange={(e) => setForm({ ...form, objectives: e.target.value })} placeholder="Ex: Aprender inglês, fazer academia, ler mais..." />
          </div>
          <div className="space-y-2">
            <Label>Hábitos que quer manter</Label>
            <Textarea rows={3} value={form.habits_text} onChange={(e) => setForm({ ...form, habits_text: e.target.value })} placeholder="Ex: Beber 2L de água, meditar 10min, dormir cedo..." />
          </div>
          <div className="space-y-2">
            <Label>Compromissos fixos</Label>
            <Textarea rows={3} value={form.fixed_commitments} onChange={(e) => setForm({ ...form, fixed_commitments: e.target.value })} placeholder="Ex: Reunião toda segunda 10h, curso terça 20h..." />
          </div>
        </div>
      ),
    },
  ];

  const finish = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from("profiles").update({ ...form, onboarding_completed: true }).eq("id", user.id);
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Tudo pronto! Bora focar 🚀");
    nav({ to: "/dashboard" });
  };

  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div className="mx-auto max-w-lg py-8 animate-fade-in">
      <div className="mb-4 flex items-center gap-3">
        <BackButton fallback="/dashboard" />
        <span className="text-sm text-muted-foreground">Configuração inicial</span>
      </div>
      <div className="mb-6 flex items-center gap-2">
        {steps.map((_, i) => (
          <div key={i} className={cn("h-1.5 flex-1 rounded-full transition-colors", i <= step ? "bg-primary" : "bg-muted")} />
        ))}
      </div>
      <div className="card-elevated p-8">

        <div className="text-xs font-medium text-primary">Passo {step + 1} de {steps.length}</div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{current.title}</h1>
        <div className="mt-6">{current.body}</div>
        <div className="mt-8 flex justify-between">
          <Button variant="ghost" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>Voltar</Button>
          {isLast ? (
            <Button onClick={finish} disabled={loading}>{loading ? "Salvando..." : "Concluir"}</Button>
          ) : (
            <Button onClick={() => setStep(step + 1)}>Continuar</Button>
          )}
        </div>
      </div>
    </div>
  );
}
