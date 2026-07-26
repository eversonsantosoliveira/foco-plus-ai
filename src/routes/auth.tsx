import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BackButton } from "@/components/back-button";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Foco+" },
      { name: "description", content: "Acesse o Foco+ e deixe a IA organizar sua semana." },
    ],
  }),
  component: AuthPage,
});

async function routeAfterLogin(userId: string, nav: ReturnType<typeof useNavigate>) {
  const { data } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", userId)
    .maybeSingle();
  if (data?.onboarding_completed) {
    nav({ to: "/dashboard", replace: true });
  } else {
    nav({ to: "/onboarding", replace: true });
  }
}

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) routeAfterLogin(data.session.user.id, nav);
    });
  }, [nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name },
            emailRedirectTo: `${window.location.origin}/dashboard`,
          },
        });
        if (error) throw error;

        // Auto-confirm is enabled → session is returned. If not, sign in explicitly.
        let userId = data.session?.user.id ?? data.user?.id;
        if (!data.session) {
          const { data: signedIn, error: siErr } = await supabase.auth.signInWithPassword({ email, password });
          if (siErr) throw siErr;
          userId = signedIn.user?.id;
        }
        toast.success("🎉 Conta criada! 24h Premium liberadas.");
        if (userId) await routeAfterLogin(userId, nav);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bem-vindo de volta!");
        if (data.user) await routeAfterLogin(data.user.id, nav);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-12 gradient-primary text-white">
        <Link to="/" className="flex items-center gap-2 text-lg font-semibold">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur">F+</div>
          Foco+
        </Link>
        <div className="max-w-md">
          <Sparkles className="h-8 w-8 mb-6" />
          <h1 className="text-4xl font-semibold leading-tight tracking-tight">
            Sua semana, organizada em segundos.
          </h1>
          <p className="mt-4 text-lg text-white/80">
            O Foco+ usa Inteligência Artificial para eliminar a procrastinação. Você conta suas tarefas uma vez — a IA cuida do resto.
          </p>
        </div>
        <div className="text-sm text-white/70">
          Comece com 24h de acesso Premium gratuito. Sem cartão.
        </div>
      </div>

      <div className="relative flex items-center justify-center p-6">
        <div className="absolute left-4 top-4 z-10">
          <BackButton fallback="/" label="Voltar para a página inicial" />
        </div>
        <div className="w-full max-w-sm space-y-6 animate-fade-in">
          <div className="lg:hidden flex items-center gap-2 text-lg font-semibold">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary text-white">F+</div>
            Foco+
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              {mode === "signup" ? "Crie sua conta" : "Entrar"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "signup" ? "24h de acesso Premium grátis." : "Bem-vindo de volta."}
            </p>
          </div>
          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Nome</Label>
                <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Como devemos te chamar?" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Aguarde..." : mode === "signup" ? "Criar conta" : "Entrar"}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground">
            {mode === "signup" ? "Já tem conta?" : "Novo por aqui?"}{" "}
            <button
              type="button"
              onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
              className="font-medium text-primary hover:underline"
            >
              {mode === "signup" ? "Entrar" : "Criar conta"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
