import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/calendario")({
  head: () => ({ meta: [{ title: "Calendário — Foco+" }] }),
  component: Calendario,
});

function startOfWeek(d: Date) {
  const x = new Date(d);
  x.setDate(x.getDate() - x.getDay());
  x.setHours(0, 0, 0, 0);
  return x;
}

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6h to 21h

function Calendario() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [anchor, setAnchor] = useState(() => startOfWeek(new Date()));
  const weekEnd = new Date(anchor); weekEnd.setDate(weekEnd.getDate() + 7);

  const { data: tasks } = useQuery({
    enabled: !!user,
    queryKey: ["tasks", user?.id, anchor.toISOString()],
    queryFn: async () => {
      const { data } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user!.id)
        .gte("scheduled_start", anchor.toISOString())
        .lt("scheduled_start", weekEnd.toISOString());
      return data ?? [];
    },
  });

  const complete = async (id: string) => {
    await supabase.from("tasks").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["tasks"] });
  };

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(anchor); d.setDate(d.getDate() + i); return d;
  });

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Calendário</h1>
          <p className="text-muted-foreground">Semana de {anchor.toLocaleDateString("pt-BR")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => { const d = new Date(anchor); d.setDate(d.getDate() - 7); setAnchor(d); }}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" onClick={() => setAnchor(startOfWeek(new Date()))}>Hoje</Button>
          <Button variant="outline" size="icon" onClick={() => { const d = new Date(anchor); d.setDate(d.getDate() + 7); setAnchor(d); }}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="card-elevated overflow-x-auto">
        <div className="grid min-w-[800px] grid-cols-[60px_repeat(7,1fr)]">
          <div />
          {days.map((d, i) => {
            const today = d.toDateString() === new Date().toDateString();
            return (
              <div key={i} className={cn("border-b border-border px-2 py-3 text-center", today && "bg-primary/5")}>
                <div className="text-xs text-muted-foreground">{DAYS[d.getDay()]}</div>
                <div className={cn("text-lg font-semibold", today && "text-primary")}>{d.getDate()}</div>
              </div>
            );
          })}
          {HOURS.map((h) => (
            <>
              <div key={`h${h}`} className="border-t border-border px-2 py-2 text-right text-[10px] text-muted-foreground">{String(h).padStart(2, "0")}:00</div>
              {days.map((d, i) => {
                const slot = new Date(d); slot.setHours(h, 0, 0, 0);
                const slotEnd = new Date(slot); slotEnd.setHours(h + 1);
                const items = (tasks ?? []).filter((t) => {
                  if (!t.scheduled_start) return false;
                  const s = new Date(t.scheduled_start);
                  return s >= slot && s < slotEnd;
                });
                return (
                  <div key={`${h}-${i}`} className="min-h-[52px] border-l border-t border-border p-1">
                    {items.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => complete(t.id)}
                        className={cn(
                          "block w-full truncate rounded-md px-2 py-1 text-left text-xs font-medium transition-colors",
                          t.status === "completed"
                            ? "bg-success/15 text-success line-through"
                            : "bg-primary/10 text-primary hover:bg-primary/20",
                        )}
                      >
                        {t.title}
                      </button>
                    ))}
                  </div>
                );
              })}
            </>
          ))}
        </div>
      </div>
    </div>
  );
}
