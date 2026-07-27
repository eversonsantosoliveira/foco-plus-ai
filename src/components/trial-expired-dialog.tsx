import { useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Crown, Lock } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { KIWIFY_CHECKOUT_URL } from "@/lib/billing";

export function TrialExpiredDialog({ open }: { open: boolean }) {
  const nav = useNavigate();

  const handleSubscribe = () => {
    window.open(KIWIFY_CHECKOUT_URL, "_blank", "noopener");
  };

  const handleLater = () => {
    nav({ to: "/", search: { expired: "1" } as never });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleLater(); }}>
      <DialogContent
        className="max-w-md border-border/60 bg-background/95 p-0 backdrop-blur-xl [&>button]:hidden"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
          className="p-8 text-center"
        >
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary text-white shadow-glow">
            <Lock className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">
            🔒 Seu período de teste gratuito terminou
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Esperamos que o Foco+ tenha ajudado você a organizar melhor sua rotina.
            Seu acesso gratuito de 24 horas chegou ao fim.
            <br /><br />
            Para continuar utilizando todos os recursos — organização inteligente com IA, tarefas, calendário, hábitos, metas e relatórios — assine o plano <strong>Foco+ Premium</strong>.
          </p>
          <div className="mt-7 flex flex-col gap-2">
            <Button size="lg" className="h-12 w-full gap-2" onClick={handleSubscribe}>
              <Crown className="h-4 w-4" />
              Assinar Foco+ Premium
            </Button>
            <Button size="lg" variant="ghost" className="h-11 w-full" onClick={handleLater}>
              Agora não
            </Button>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
