import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Sparkles, Brain, CalendarClock, Zap, Check } from "lucide-react";
import { KIWIFY_CHECKOUT_URL } from "@/lib/billing";

export const Route = createFileRoute("/")({
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

      <section className="mx-auto max-w-3xl px-6 pb-24">
        <div className="card-elevated overflow-hidden">
          <div className="gradient-primary p-8 text-white">
            <h2 className="text-2xl font-semibold">Foco+ Premium</h2>
            <p className="mt-1 text-white/80">Acesso total à IA e todos os recursos.</p>
            <div className="mt-6 flex items-baseline gap-2">
              <span className="text-4xl font-semibold">R$ 49,90</span>
              <span className="text-white/70">/mês</span>
            </div>
          </div>
          <div className="p-8 space-y-3">
            {[
              "Organização automática da semana pela IA",
              "Reorganização inteligente de tarefas",
              "Hábitos, metas e relatórios completos",
              "Notificações inteligentes",
              "Dark mode e sincronização em tempo real",
            ].map((i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <Check className="h-4 w-4 text-success" /> {i}
              </div>
            ))}
            <a href={KIWIFY_CHECKOUT_URL} target="_blank" rel="noreferrer" className="block">
              <Button className="mt-4 w-full h-12">Assinar Premium</Button>
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Foco+
      </footer>
    </div>
  );
}
