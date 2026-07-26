import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/use-auth";
import { useProfile, isPremiumActive, trialRemainingMs } from "@/lib/profile";
import { Button } from "@/components/ui/button";
import { KIWIFY_CHECKOUT_URL, PREMIUM_PRICE_LABEL } from "@/lib/billing";
import { Crown, Check } from "lucide-react";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({ meta: [{ title: "Perfil — Foco+" }] }),
  component: Perfil,
});

function Perfil() {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const premium = isPremiumActive(profile);
  const ms = trialRemainingMs(profile);
  const h = Math.floor(ms / 3600_000);
  const m = Math.floor((ms % 3600_000) / 60_000);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Perfil</h1>
        <p className="text-muted-foreground">Sua conta e assinatura.</p>
      </div>

      <div className="card-elevated p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full gradient-primary text-2xl font-semibold text-white">
            {(profile?.full_name ?? "?").charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-semibold">{profile?.full_name ?? "Sem nome"}</h2>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>
      </div>

      <div className="card-elevated overflow-hidden">
        <div className="gradient-primary p-6 text-white">
          <div className="flex items-center gap-2 text-sm opacity-90"><Crown className="h-4 w-4" /> Seu plano</div>
          <h3 className="mt-1 text-2xl font-semibold">{premium ? "Foco+ Premium" : "Teste Gratuito"}</h3>
          {!premium && <p className="mt-1 text-sm opacity-80">{ms > 0 ? `${h}h ${m}m restantes` : "Teste expirado"}</p>}
        </div>
        <div className="space-y-3 p-6">
          {[
            "IA organiza sua semana inteira",
            "Reorganização automática",
            "Notificações inteligentes",
            "Hábitos, metas e relatórios",
          ].map((f) => (
            <div key={f} className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-success" /> {f}</div>
          ))}
          <div className="pt-2 text-sm font-semibold">{PREMIUM_PRICE_LABEL}</div>
          <a href={KIWIFY_CHECKOUT_URL} target="_blank" rel="noreferrer" className="block">
            <Button className="w-full">{premium ? "Gerenciar assinatura" : "Continuar Premium"}</Button>
          </a>
        </div>
      </div>
    </div>
  );
}
