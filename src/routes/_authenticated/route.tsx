import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_premium, premium_until, trial_ends_at")
      .eq("id", data.user.id)
      .maybeSingle();

    const now = Date.now();
    const premiumActive =
      !!profile?.is_premium &&
      (!profile.premium_until || new Date(profile.premium_until).getTime() > now);
    const trialActive =
      !!profile?.trial_ends_at && new Date(profile.trial_ends_at).getTime() > now;

    if (profile && !premiumActive && !trialActive) {
      throw redirect({ to: "/", search: { expired: "1" } as never });
    }

    return { user: data.user };
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
