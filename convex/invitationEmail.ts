/**
 * Invitation Email Action (Node.js runtime)
 *
 * Sends workspace invitation emails via Resend API.
 * Separated from invitations.ts because Convex requires
 * Node.js actions to be in their own "use node" file.
 */

"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

export const sendInvitationEmail = internalAction({
  args: { invitationId: v.id("workspaceInvitations") },
  handler: async (ctx, args) => {
    const data = await ctx.runQuery(internal.invitations.getInvitationData, {
      invitationId: args.invitationId,
    });
    if (!data) {
      console.error("[invitations] Invitation not found for email send");
      return;
    }

    const appUrl = process.env.APP_URL;
    const resendApiKey = process.env.RESEND_API_KEY;

    if (!resendApiKey) {
      console.error("[invitations] RESEND_API_KEY not configured — skipping email");
      return;
    }
    if (!appUrl) {
      console.error("[invitations] APP_URL not configured — skipping email");
      return;
    }

    const acceptUrl = `${appUrl}/invite/accept?token=${data.token}`;

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f6f6f9;">
  <div style="max-width:480px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
    <div style="background:#6965db;padding:24px 32px;">
      <h1 style="margin:0;color:#fff;font-size:20px;font-weight:600;">Drawink</h1>
    </div>
    <div style="padding:32px;">
      <h2 style="margin:0 0 8px;font-size:18px;color:#1b1b1f;">You're invited!</h2>
      <p style="margin:0 0 24px;color:#767680;font-size:14px;line-height:1.5;">
        <strong style="color:#1b1b1f;">${data.inviterName}</strong> has invited you to join
        <strong style="color:#1b1b1f;">"${data.workspaceName}"</strong> on Drawink.
      </p>
      <a href="${acceptUrl}"
         style="display:inline-block;background:#6965db;color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;font-size:14px;">
        Accept Invitation
      </a>
      <p style="margin:24px 0 0;color:#9e9eab;font-size:12px;">
        This invitation expires in 7 days. If you didn't expect this email, you can safely ignore it.
      </p>
    </div>
  </div>
</body>
</html>`.trim();

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: "Drawink <onboarding@resend.dev>",
          to: [data.email],
          subject: `${data.inviterName} invited you to "${data.workspaceName}" on Drawink`,
          html,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error("[invitations] Resend API error:", res.status, err);
      } else {
        console.log(`[invitations] Email sent to ${data.email}`);
      }
    } catch (err) {
      console.error("[invitations] Failed to send email:", err);
    }
  },
});
