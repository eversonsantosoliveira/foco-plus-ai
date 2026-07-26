import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribe to postgres_changes for a table filtered by user_id.
 * Invalidates the given react-query keys when any change is received.
 */
export function useRealtime(
  table: "tasks" | "habits" | "habit_logs" | "goals" | "events" | "profiles",
  userId: string | undefined,
  invalidateKeys: string[],
) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`rt-${table}-${userId}-${Math.random().toString(36).slice(2)}`);
    channel
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `user_id=eq.${userId}` },
        () => {
          for (const k of invalidateKeys) qc.invalidateQueries({ queryKey: [k] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, userId]);
}
