/**
 * Convex HTTP Router — Clerk Webhook Handler
 *
 * Receives Clerk webhook events and syncs user data to Convex.
 * Handles: user.created, user.updated, user.deleted
 *
 * Setup:
 * 1. Add CLERK_WEBHOOK_SECRET env var in Convex dashboard
 * 2. Configure Clerk webhook endpoint: https://<deployment>.convex.site/clerk-webhook
 * 3. Subscribe to: user.created, user.updated, user.deleted
 */

import { httpRouter } from "convex/server";
import { Webhook } from "svix";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // ---- Verify webhook signature ----
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("[clerk-webhook] CLERK_WEBHOOK_SECRET not configured");
      return new Response("Server misconfigured", { status: 500 });
    }

    const svixId = request.headers.get("svix-id");
    const svixTimestamp = request.headers.get("svix-timestamp");
    const svixSignature = request.headers.get("svix-signature");

    if (!svixId || !svixTimestamp || !svixSignature) {
      return new Response("Missing svix headers", { status: 400 });
    }

    const body = await request.text();

    const wh = new Webhook(webhookSecret);
    let evt: any;
    try {
      evt = wh.verify(body, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      });
    } catch (err) {
      console.error("[clerk-webhook] Verification failed:", err);
      return new Response("Invalid signature", { status: 401 });
    }

    // ---- Handle events ----
    const eventType = evt.type as string;

    switch (eventType) {
      case "user.created":
      case "user.updated": {
        const { id, email_addresses, first_name, last_name, image_url } = evt.data;
        const primaryEmail =
          email_addresses?.find((e: any) => e.id === evt.data.primary_email_address_id)
            ?.email_address ?? email_addresses?.[0]?.email_address ?? "";

        const name = [first_name, last_name].filter(Boolean).join(" ") || "User";

        await ctx.runMutation(internal.users.upsertFromClerk, {
          clerkId: id,
          email: primaryEmail,
          name,
          photoUrl: image_url ?? undefined,
        });

        console.log(`[clerk-webhook] ${eventType}: ${id}`);
        break;
      }

      case "user.deleted": {
        const { id } = evt.data;
        if (id) {
          await ctx.runMutation(internal.users.deleteFromClerk, {
            clerkId: id,
          });
          console.log(`[clerk-webhook] user.deleted: ${id}`);
        }
        break;
      }

      default:
        console.log(`[clerk-webhook] Unhandled event type: ${eventType}`);
    }

    return new Response("OK", { status: 200 });
  }),
});

export default http;
