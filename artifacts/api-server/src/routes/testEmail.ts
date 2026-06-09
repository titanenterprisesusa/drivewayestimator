import { Router } from "express";
import { sendNotificationEmail } from "../lib/mailer";

const router = Router();

router.get("/test-email", async (_req, res) => {
  console.log("[test-email] Route hit — attempting test email send");
  try {
    await sendNotificationEmail({
      customerName: "Test Customer",
      phone: "401-555-1234",
      email: "test@example.com",
      address: "123 Test St, Warwick, RI 02886",
      hasCrackFill: true,
      crackFillPrice: 75,
      squareFootage: 500,
      basePrice: 250,
      totalPrice: 325,
      promoCode: null,
      createdAt: new Date(),
    });
    console.log("[test-email] Test email completed without error");
    res.json({ success: true, message: "Test email sent — check server logs and your inbox" });
  } catch (err) {
    console.error("[test-email] Test email FAILED — full error:", err);
    res.status(500).json({ success: false, error: String(err), detail: err });
  }
});

export default router;
