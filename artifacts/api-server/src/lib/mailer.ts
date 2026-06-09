import nodemailer from "nodemailer";
import { logger } from "./logger";

export interface NotificationEmailData {
  customerName: string;
  phone: string;
  email: string;
  address: string;
  hasCrackFill: boolean;
  crackFillPrice?: number | null;
  squareFootage: number;
  basePrice: number;
  totalPrice: number;
  promoCode?: string | null;
  createdAt: Date;
}

export async function sendNotificationEmail(data: NotificationEmailData): Promise<void> {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;
  const notifyEmail = process.env.NOTIFY_EMAIL;

  console.log("[mailer] EMAIL_USER loaded:", !!emailUser);
  console.log("[mailer] EMAIL_PASS loaded:", !!emailPass);
  console.log("[mailer] NOTIFY_EMAIL loaded:", !!notifyEmail);

  if (!emailUser || !emailPass || !notifyEmail) {
    console.warn("[mailer] Skipping email — one or more required secrets are missing (EMAIL_USER, EMAIL_PASS, NOTIFY_EMAIL)");
    logger.warn("Email notification skipped: EMAIL_USER, EMAIL_PASS, or NOTIFY_EMAIL not set");
    return;
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });

  const timestamp = data.createdAt.toLocaleString("en-US", {
    timeZone: "America/New_York",
    dateStyle: "full",
    timeStyle: "short",
  });

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:#1a1a2e;padding:28px 32px;">
            <p style="margin:0;font-size:20px;font-weight:bold;color:#ffffff;">Titan Enterprises</p>
            <p style="margin:4px 0 0;font-size:14px;color:#aab0c4;">New Driveway Estimate Request</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 24px;font-size:16px;color:#333333;">
              A customer has submitted a driveway sealing estimate and requested service.
            </p>

            <!-- Details table -->
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
              <tr style="background:#f8f9fa;">
                <td style="padding:12px 16px;font-size:13px;font-weight:bold;color:#555555;width:40%;border-bottom:1px solid #e9ecef;">Customer Name</td>
                <td style="padding:12px 16px;font-size:14px;color:#1a1a2e;border-bottom:1px solid #e9ecef;">${escHtml(data.customerName)}</td>
              </tr>
              <tr>
                <td style="padding:12px 16px;font-size:13px;font-weight:bold;color:#555555;border-bottom:1px solid #e9ecef;">Phone</td>
                <td style="padding:12px 16px;font-size:14px;color:#1a1a2e;border-bottom:1px solid #e9ecef;">${escHtml(data.phone)}</td>
              </tr>
              <tr style="background:#f8f9fa;">
                <td style="padding:12px 16px;font-size:13px;font-weight:bold;color:#555555;border-bottom:1px solid #e9ecef;">Email</td>
                <td style="padding:12px 16px;font-size:14px;color:#1a1a2e;border-bottom:1px solid #e9ecef;">${escHtml(data.email)}</td>
              </tr>
              <tr>
                <td style="padding:12px 16px;font-size:13px;font-weight:bold;color:#555555;border-bottom:1px solid #e9ecef;">Address</td>
                <td style="padding:12px 16px;font-size:14px;color:#1a1a2e;border-bottom:1px solid #e9ecef;">${escHtml(data.address)}</td>
              </tr>
              <tr style="background:#f8f9fa;">
                <td style="padding:12px 16px;font-size:13px;font-weight:bold;color:#555555;border-bottom:1px solid #e9ecef;">Service Type</td>
                <td style="padding:12px 16px;font-size:14px;color:#1a1a2e;border-bottom:1px solid #e9ecef;">
                  Driveway Sealing${data.hasCrackFill ? " + Crack Fill" : ""}
                </td>
              </tr>
              <tr>
                <td style="padding:12px 16px;font-size:13px;font-weight:bold;color:#555555;border-bottom:1px solid #e9ecef;">Crack Fill</td>
                <td style="padding:12px 16px;font-size:14px;color:#1a1a2e;border-bottom:1px solid #e9ecef;">${data.hasCrackFill ? "Yes" : "No"}</td>
              </tr>
              <tr style="background:#f8f9fa;">
                <td style="padding:12px 16px;font-size:13px;font-weight:bold;color:#555555;border-bottom:1px solid #e9ecef;">Square Footage</td>
                <td style="padding:12px 16px;font-size:14px;color:#1a1a2e;border-bottom:1px solid #e9ecef;">${data.squareFootage.toLocaleString()} sq ft</td>
              </tr>
              ${
                data.promoCode
                  ? `<tr>
                <td style="padding:12px 16px;font-size:13px;font-weight:bold;color:#555555;border-bottom:1px solid #e9ecef;">Promo Code</td>
                <td style="padding:12px 16px;font-size:14px;color:#1a1a2e;border-bottom:1px solid #e9ecef;">${escHtml(data.promoCode)}</td>
              </tr>`
                  : ""
              }
              <tr>
                <td style="padding:12px 16px;font-size:13px;font-weight:bold;color:#555555;border-bottom:1px solid #e9ecef;">Quote Total</td>
                <td style="padding:12px 16px;font-size:15px;font-weight:bold;color:#1a7a4a;border-bottom:1px solid #e9ecef;">$${data.totalPrice.toFixed(2)}</td>
              </tr>
              <tr style="background:#f8f9fa;">
                <td style="padding:12px 16px;font-size:13px;font-weight:bold;color:#555555;">Submitted At</td>
                <td style="padding:12px 16px;font-size:14px;color:#1a1a2e;">${escHtml(timestamp)}</td>
              </tr>
            </table>

            <p style="margin:28px 0 0;font-size:13px;color:#888888;">
              This notification was generated automatically by the Titan Enterprises Driveway Estimator.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  console.log("[mailer] Attempting to send email to:", notifyEmail, "for customer:", data.customerName);
  try {
    await transporter.sendMail({
      from: `"Titan Enterprises Estimator" <${emailUser}>`,
      to: notifyEmail,
      subject: `New Driveway Estimate Request – ${data.customerName}`,
      html,
    });
    console.log("[mailer] Email sent successfully to:", notifyEmail);
    logger.info({ to: notifyEmail, customerName: data.customerName }, "Notification email sent");
  } catch (err) {
    console.error("[mailer] Email send FAILED — full error:", err);
    throw err;
  }
}

function escHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
