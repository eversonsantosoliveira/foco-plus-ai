import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, Share, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "foco_pwa_banner_dismissed_at";
const DISMISS_DAYS = 30;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  if (typeof window === "undefined") return true;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIosSafari() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && "ontouchend" in document);
  const webkit = /WebKit/.test(ua);
  const otherBrowser = /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return iOS && webkit && !otherBrowser;
}

function recentlyDismissed() {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const at = Number(raw);
    if (!Number.isFinite(at)) return false;
    return Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    const onInstalled = () => {
      setVisible(false);
      setDeferred(null);
      try {
        localStorage.setItem(DISMISS_KEY, String(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000));
      } catch {
        /* ignore */
      }
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    // iOS Safari never fires beforeinstallprompt — show the manual banner.
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (isIosSafari()) {
      timer = setTimeout(() => setVisible(true), 1200);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      if (timer) clearTimeout(timer);
    };
  }, []);

  const dismiss = () => {
    setVisible(false);
    setShowIosHelp(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
  };

  const install = async () => {
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      setDeferred(null);
      if (choice.outcome === "accepted") {
        setVisible(false);
      } else {
        dismiss();
      }
      return;
    }
    setShowIosHelp(true);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
          className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md sm:inset-x-auto sm:right-4 sm:bottom-4"
          role="dialog"
          aria-label="Instalar Foco+"
        >
          <div className="relative rounded-2xl border border-border bg-card p-4 shadow-xl">
            <button
              type="button"
              onClick={dismiss}
              aria-label="Fechar"
              className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-start gap-3 pr-8">
              <img
                src="/icon-192.png"
                alt="Foco+"
                width={44}
                height={44}
                className="h-11 w-11 shrink-0 rounded-xl shadow-sm"
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-tight">
                  Instale o Foco+ e acesse com 1 toque.
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Abre em tela cheia, como um app nativo.
                </p>
              </div>
            </div>

            {showIosHelp ? (
              <div className="mt-3 rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
                <p className="flex flex-wrap items-center gap-1.5">
                  Toque em
                  <span className="inline-flex items-center gap-1 rounded-md bg-background px-1.5 py-0.5 font-medium text-foreground">
                    <Share className="h-3.5 w-3.5" /> Compartilhar
                  </span>
                  →
                  <span className="inline-flex items-center gap-1 rounded-md bg-background px-1.5 py-0.5 font-medium text-foreground">
                    <Plus className="h-3.5 w-3.5" /> Adicionar à Tela de Início
                  </span>
                </p>
              </div>
            ) : (
              <div className="mt-3 flex gap-2">
                <Button onClick={install} className="h-10 flex-1 gap-2">
                  <Download className="h-4 w-4" />
                  Instalar
                </Button>
                <Button variant="ghost" onClick={dismiss} className="h-10">
                  Agora não
                </Button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
