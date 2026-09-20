import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Sparkles, Brain, CalendarClock, Zap, Crown, Lock } from "lucide-react";
import { KIWIFY_CHECKOUT_URL } from "@/lib/billing";
import { PlanSummaryCard } from "@/components/plan-summary-card";

const searchSchema = z.object({ expired: z.string().optional() });

export const Route = createFileRoute("/")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Foco+ — Sua semana organizada por IA" },
      { name: "description", content: "Assistente de produtividade com IA que elimina a procrastinação. Informe suas tarefas uma vez — a IA organiza sua semana inteira." },
      { property: "og:title", content: "Foco+ — Sua semana organizada por IA" },
      { property: "og:description", content: "A IA que organiza sua semana e vence a procrastinação." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Landing,
});


function Landing() {
  const { expired } = Route.useSearch();
  const isExpired = expired === "1";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary text-white shadow-glow">F+</div>
            Foco+
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/auth"><Button variant="ghost">Entrar</Button></Link>
            <Link to="/auth"><Button>Começar grátis</Button></Link>
          </div>
        </div>
      </header>

      {isExpired && (
        <motion.section
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="border-b border-primary/20 bg-primary/5"
        >
          <div className="mx-auto flex max-w-5xl flex-col items-start gap-4 px-6 py-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold">Seu teste gratuito terminou</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Assine o Foco+ Premium para voltar a utilizar todas as funcionalidades.
                </p>
              </div>
            </div>
            <a href={KIWIFY_CHECKOUT_URL} target="_blank" rel="noreferrer" className="w-full md:w-auto">
              <Button size="lg" className="h-11 w-full gap-2 md:w-auto">
                <Crown className="h-4 w-4" />
                Assinar Foco+ Premium
              </Button>
            </a>
          </div>
        </motion.section>
      )}

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="mx-auto max-w-4xl px-6 pt-20 pb-24 text-center">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Powered by Inteligência Artificial
          </div>
          <h1 className="text-5xl font-semibold tracking-tight md:text-6xl">
            Você conta. A IA <span className="text-primary">organiza</span>.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            O Foco+ é o assistente de produtividade que elimina a procrastinação. Informe suas tarefas uma única vez e deixe a IA distribuir tudo pela semana, do jeito certo.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/auth"><Button size="lg" className="h-12 px-6">Começar 24h grátis</Button></Link>
            <a href={KIWIFY_CHECKOUT_URL} target="_blank" rel="noreferrer">
              <Button size="lg" variant="outline" className="h-12 px-6">Ver planos</Button>
            </a>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Sem cartão. Sem instalação.</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { icon: Brain, title: "IA que planeja por você", desc: "Prioridade, prazos, hábitos e horários — tudo balanceado automaticamente." },
            { icon: CalendarClock, title: "Reorganização inteligente", desc: "Não concluiu algo? A IA sugere um novo horário e ajusta a semana." },
            { icon: Zap, title: "Notificações no momento certo", desc: "Lembretes 30min, 10min e na hora — para você não escapar." },
          ].map((f) => (
            <div key={f.title} className="card-elevated p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="premium" className="mx-auto max-w-2xl px-6 pb-24">
        <PlanSummaryCard />
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Foco+
      </footer>
    </div>
  );
}
