import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

async function assertActiveSubscription(supabase: SupabaseClient, userId: string) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_premium, premium_until, trial_ends_at")
    .eq("id", userId)
    .maybeSingle();
  const now = Date.now();
  const premiumActive =
    !!profile?.is_premium &&
    (!profile.premium_until || new Date(profile.premium_until).getTime() > now);
  const trialActive =
    !!profile?.trial_ends_at && new Date(profile.trial_ends_at).getTime() > now;
  if (!premiumActive && !trialActive) {
    throw new Error("SUBSCRIPTION_EXPIRED: Assine o Foco+ Premium para continuar.");
  }
}

const InputSchema = z.object({
  weekStartISO: z.string(),
});

type PlannedTask = {
  id: string;
  scheduled_start: string;
  scheduled_end: string;
};

export const organizeWeek = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertActiveSubscription(supabase, userId);
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const weekStart = new Date(data.weekStartISO);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const [{ data: profile }, { data: tasks }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase
        .from("tasks")
        .select("*")
        .eq("user_id", userId)
        .neq("status", "completed"),
    ]);

    if (!tasks || tasks.length === 0) {
      return { planned: 0, message: "Nenhuma tarefa para organizar." };
    }

    const systemPrompt = `Você é a IA do Foco+, um assistente de produtividade para pessoas que procrastinam.
Sua tarefa: distribuir as tarefas do usuário durante a semana de forma equilibrada, respeitando horários, prioridade, prazo e evitando sobrecarga.
Retorne APENAS JSON válido no formato:
{"planned":[{"id":"uuid","scheduled_start":"ISO","scheduled_end":"ISO"}]}
Nunca inclua explicações fora do JSON.`;

    const userPrompt = `Perfil do usuário:
- Acorda: ${profile?.wake_time ?? "07:00"}
- Dorme: ${profile?.sleep_time ?? "23:00"}
- Trabalho ${profile?.work_start ?? "09:00"}-${profile?.work_end ?? "18:00"} nos dias ${profile?.work_days?.join(",") ?? "1,2,3,4,5"}
- Dias disponíveis (0=Dom..6=Sáb): ${profile?.available_days?.join(",") ?? "1,2,3,4,5,6"}
- Dias academia: ${profile?.gym_days?.join(",") ?? ""}
- Tempo livre diário (min): ${profile?.daily_available_minutes ?? 120}
- Objetivos: ${profile?.objectives ?? ""}
- Hábitos: ${profile?.habits_text ?? ""}
- Compromissos fixos: ${profile?.fixed_commitments ?? ""}

Semana a organizar: ${weekStart.toISOString()} até ${weekEnd.toISOString()}.
Tarefas (id | título | prioridade 1-3 | duração min | prazo | fixo):
${tasks.map((t) => `${t.id} | ${t.title} | ${t.priority} | ${t.estimated_minutes} | ${t.deadline ?? "-"} | ${t.is_fixed}`).join("\n")}

Regras:
- Não mova tarefas com is_fixed=true (mantenha scheduled_start atual se houver).
- Distribua equilibradamente por dia.
- Priorize maior prioridade e prazo mais próximo.
- Respeite horários de trabalho, sono e academia.
- Não agende no horário de sono.
- Use blocos contínuos.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      throw new Error(`AI Gateway [${res.status}]: ${t}`);
    }
    const json = await res.json();
    const content = json.choices?.[0]?.message?.content ?? "{}";
    let parsed: { planned: PlannedTask[] };
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error("A IA retornou uma resposta inválida.");
    }

    const planned = (parsed.planned ?? []).filter((p) => p.id && p.scheduled_start && p.scheduled_end);
    for (const p of planned) {
      await supabase
        .from("tasks")
        .update({
          scheduled_start: p.scheduled_start,
          scheduled_end: p.scheduled_end,
          status: "scheduled",
        })
        .eq("id", p.id)
        .eq("user_id", userId);
    }
    return { planned: planned.length, message: `Semana organizada com ${planned.length} tarefas.` };
  });

export const suggestReschedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ taskId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertActiveSubscription(supabase, userId);
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");
    const { data: task } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", data.taskId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!task) throw new Error("Tarefa não encontrada");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3.5-flash",
        messages: [
          {
            role: "system",
            content:
              'Sugira um novo horário para uma tarefa não concluída. Responda APENAS JSON: {"suggested_start":"ISO","suggested_end":"ISO","reason":"texto curto em português"}',
          },
          {
            role: "user",
            content: `Tarefa: ${task.title}. Duração: ${task.estimated_minutes} min. Horário atual: ${task.scheduled_start}. Sugira um novo horário nos próximos 3 dias.`,
          },
        ],
        response_format: { type: "json_object" },
      }),
    });
    const j = await res.json();
    return JSON.parse(j.choices?.[0]?.message?.content ?? "{}");
  });
