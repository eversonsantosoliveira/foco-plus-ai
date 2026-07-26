import { createFileRoute } from "@tanstack/react-router";

/**
 * Kiwify webhook endpoint.
 *
 * Configure in Kiwify → Configurações → Webhooks with:
 *   URL: https://<your-domain>/api/public/kiwify?token=<KIWIFY_WEBHOOK_TOKEN>
 *
 * On any "order approved" / "subscription active" event we mark the matching
 * profile (by customer email) as premium. On cancel/refund we downgrade.
 *
 * Requires the KIWIFY_WEBHOOK_TOKEN secret to be set.
 */
export const Route = createFileRoute("/api/public/kiwify")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const providedToken = url.searchParams.get("token") ?? request.headers.get("x-kiwify-token");
        const expectedToken = process.env.KIWIFY_WEBHOOK_TOKEN;

        if (!expectedToken) {
          return new Response("Webhook not configured", { status: 503 });
        }
        if (!providedToken || providedToken !== expectedToken) {
          return new Response("Unauthorized", { status: 401 });
        }

        let body: Record<string, unknown> = {};
        try {
          body = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        // Kiwify payloads vary; extract common fields defensively.
        const order = (body.order ?? body) as Record<string, unknown>;
        const customer = (order.Customer ?? order.customer ?? body.customer ?? {}) as Record<string, unknown>;
        const email = (customer.email ?? (body as any).customer_email ?? "").toString().toLowerCase().trim();
        const status = ((body.order_status ?? body.webhook_event_type ?? body.status ?? "") as string).toLowerCase();

        if (!email) {
          return new Response("Missing customer email", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Find the user id by email through auth.
        const { data: authList, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
        if (listErr) {
          return new Response("Lookup failed", { status: 500 });
        }
        const user = authList.users.find((u) => u.email?.toLowerCase() === email);
        if (!user) {
          // Accept the webhook but there is no matching account yet.
          return new Response("ok", { status: 200 });
        }

        const activate = ["paid", "approved", "active", "order_approved", "subscription_renewed", "completed"].some((s) => status.includes(s));
        const deactivate = ["refund", "canceled", "chargeback", "expired"].some((s) => status.includes(s));

        if (activate) {
          const premiumUntil = new Date();
          premiumUntil.setMonth(premiumUntil.getMonth() + 1);
          await supabaseAdmin
            .from("profiles")
            .update({ is_premium: true, premium_until: premiumUntil.toISOString() })
            .eq("id", user.id);
        } else if (deactivate) {
          await supabaseAdmin
            .from("profiles")
            .update({ is_premium: false, premium_until: null })
            .eq("id", user.id);
        }

        return Response.json({ ok: true });
      },
    },
  },
});
