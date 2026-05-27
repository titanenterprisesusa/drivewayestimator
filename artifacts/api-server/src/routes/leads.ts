import { Router } from "express";
import { db, estimatesTable } from "@workspace/db";
import { appendEstimateToSheet } from "../lib/googleSheets";

const router = Router();

// POST /api/leads — captures contact info at step 1 before the estimate is complete.
// Logs the lead to DB and Google Sheets with requestedService: false.
router.post("/leads", async (req, res) => {
  const { customerName, phone, email, address, marketingConsent } = req.body ?? {};
  if (!customerName || !phone || !email || !address) {
    res.status(400).json({ error: "customerName, phone, email, and address are required" });
    return;
  }

  try {
    const [lead] = await db
      .insert(estimatesTable)
      .values({
        customerName: String(customerName),
        phone: String(phone),
        email: String(email),
        address: String(address),
        squareFootage: 0,
        hasTreeObstruction: false,
        basePrice: 0,
        crackFillPrice: null,
        totalPrice: 0,
        hasCrackFill: false,
        marketingConsent: marketingConsent !== false,
        requestedService: false,
      })
      .returning();

    appendEstimateToSheet({
      customerName: lead.customerName,
      phone: lead.phone,
      email: lead.email,
      address: lead.address,
      squareFootage: 0,
      basePrice: 0,
      hasCrackFill: false,
      crackFillPrice: null,
      totalPrice: 0,
      marketingConsent: lead.marketingConsent,
      promoCode: null,
      requestedService: false,
      createdAt: lead.createdAt,
    }).catch(() => {});

    res.status(201).json({ id: lead.id });
  } catch (error) {
    console.error("Lead POST error:", error);
    res.status(500).json({ error: String(error) });
  }
});

export default router;
