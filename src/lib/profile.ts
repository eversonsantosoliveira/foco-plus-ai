import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  theme: string;
  language: string;
  onboarding_completed: boolean;
  wake_time: string | null;
  sleep_time: string | null;
  work_days: number[] | null;
  work_start: string | null;
  work_end: string | null;
  available_days: number[] | null;
  gym_days: number[] | null;
  gym_time: string | null;
  daily_available_minutes: number | null;
  objectives: string | null;
  habits_text: string | null;
  fixed_commitments: string | null;
  trial_started_at: string;
  trial_ends_at: string;
  is_premium: boolean;
  premium_until: string | null;
  notifications_enabled: boolean;
  created_at: string;
};

export function useProfile(userId: string | undefined) {
  return useQuery({
    enabled: !!userId,
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId!).maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });
}

export type PlanStatus = "premium" | "trial" | "free";

export function planStatus(p: Pick<Profile, "is_premium" | "trial_ends_at" | "premium_until"> | null | undefined): PlanStatus {
  if (!p) return "free";
  if (p.is_premium && (!p.premium_until || new Date(p.premium_until) > new Date())) return "premium";
  if (new Date(p.trial_ends_at) > new Date()) return "trial";
  return "free";
}

export function isPremiumActive(p: Pick<Profile, "is_premium" | "trial_ends_at" | "premium_until"> | null | undefined) {
  const s = planStatus(p);
  return s === "premium" || s === "trial";
}

export function trialRemainingMs(p: Pick<Profile, "trial_ends_at"> | null | undefined) {
  if (!p) return 0;
  return Math.max(0, new Date(p.trial_ends_at).getTime() - Date.now());
}
