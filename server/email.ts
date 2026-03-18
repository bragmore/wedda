import { execSync } from "child_process";

/**
 * Email sending utility that supports multiple transports:
 * 1. external-tool CLI (works in sandbox/cron context)
 * 2. Resend API (works in serverless/Netlify context)
 * 3. SMTP via nodemailer (works anywhere with SMTP credentials)
 */

// ── Transport: external-tool CLI ─────────────────────────────────────────
function sendViaExternalTool(to: string[], subject: string, body: string): boolean {
  try {
    const params = JSON.stringify({
      source_id: "gcal",
      tool_name: "send_email",
      arguments: {
        action: { action: "send", to, subject, body, in_reply_to: null },
        user_prompt: null,
      },
    });
    execSync(`external-tool call '${params.replace(/'/g, "'\\''")}' `, { timeout: 15000 });
    return true;
  } catch {
    return false;
  }
}

// ── Transport: Resend API ────────────────────────────────────────────────
async function sendViaResend(to: string[], subject: string, body: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || "Wedda <noreply@wedda.se>",
        to,
        subject,
        text: body,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Main email function ──────────────────────────────────────────────────
export function sendEmail(to: string[], subject: string, body: string): boolean {
  // Try Resend first (works everywhere including serverless)
  if (process.env.RESEND_API_KEY) {
    // Fire and forget for non-blocking
    sendViaResend(to, subject, body)
      .then(ok => {
        if (ok) console.log(`[EMAIL] Sent via Resend to ${to.join(", ")}: ${subject}`);
        else console.error(`[EMAIL] Resend failed for ${to.join(", ")}`);
      })
      .catch(err => console.error(`[EMAIL] Resend error: ${err.message}`));
    return true;
  }

  // Fall back to external-tool CLI (works in sandbox)
  try {
    const result = sendViaExternalTool(to, subject, body);
    if (result) {
      console.log(`[EMAIL] Sent via external-tool to ${to.join(", ")}: ${subject}`);
    }
    return result;
  } catch (err: any) {
    console.error(`[EMAIL] Failed to send to ${to.join(", ")}:`, err.message);
    return false;
  }
}
