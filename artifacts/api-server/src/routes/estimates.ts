import { Router } from "express";
import { db, estimatesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateEstimateBody, GetEstimateParams } from "@workspace/api-zod";
import { appendEstimateToSheet } from "../lib/googleSheets";
import { sendNotificationEmail } from "../lib/mailer";

const router = Router();

router.get("/estimates", async (_req, res) => {
  try {
    const estimates = await db
      .select()
      .from(estimatesTable)
      .orderBy(estimatesTable.createdAt);
    res.json(estimates);
  } catch (error) {
    console.error("Estimate POST error full:", error);
    res.status(500).json({
      error: String(error),
      detail: error instanceof Error ? error.message : JSON.stringify(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
});

router.post("/estimates", async (req, res) => {
  const parsed = CreateEstimateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const [estimate] = await db
      .insert(estimatesTable)
      .values({
        customerName: parsed.data.customerName,
        phone: parsed.data.phone,
        email: parsed.data.email,
        address: parsed.data.address,
        squareFootage: parsed.data.squareFootage,
        hasTreeObstruction: parsed.data.hasTreeObstruction ?? false,
        basePrice: parsed.data.basePrice,
        crackFillPrice: parsed.data.crackFillPrice ?? null,
        totalPrice: parsed.data.totalPrice,
        hasCrackFill: parsed.data.hasCrackFill,
        notes: parsed.data.notes ?? null,
        marketingConsent: parsed.data.marketingConsent ?? true,
        promoCode: parsed.data.promoCode ?? null,
        requestedService: true,
      })
      .returning();

    // Fire-and-forget: write to Google Sheet in background (never blocks the response)
    appendEstimateToSheet({
      customerName: estimate.customerName,
      phone: estimate.phone,
      email: estimate.email,
      address: estimate.address,
      squareFootage: estimate.squareFootage,
      basePrice: estimate.basePrice,
      hasCrackFill: estimate.hasCrackFill,
      crackFillPrice: estimate.crackFillPrice,
      totalPrice: estimate.totalPrice,
      marketingConsent: estimate.marketingConsent,
      promoCode: estimate.promoCode ?? null,
      requestedService: true,
      createdAt: estimate.createdAt,
    }).catch(() => {});

    // Fire-and-forget: send email notification to business owner
    sendNotificationEmail({
      customerName: estimate.customerName,
      phone: estimate.phone,
      email: estimate.email,
      address: estimate.address,
      hasCrackFill: estimate.hasCrackFill,
      crackFillPrice: estimate.crackFillPrice,
      squareFootage: estimate.squareFootage,
      basePrice: estimate.basePrice,
      totalPrice: estimate.totalPrice,
      promoCode: estimate.promoCode ?? null,
      createdAt: estimate.createdAt,
    }).catch((err) => console.error("Notification email failed:", err));

    res.status(201).json(estimate);
  } catch (error) {
    console.error("Estimate POST error full:", error);
    res.status(500).json({
      error: String(error),
      detail: error instanceof Error ? error.message : JSON.stringify(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
});

router.get("/estimates/:id", async (req, res) => {
  const parsed = GetEstimateParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  try {
    const [estimate] = await db
      .select()
      .from(estimatesTable)
      .where(eq(estimatesTable.id, parsed.data.id));
    if (!estimate) {
      res.status(404).json({ error: "Estimate not found" });
      return;
    }
    res.json(estimate);
  } catch (error) {
    console.error("Estimate POST error full:", error);
    res.status(500).json({
      error: String(error),
      detail: error instanceof Error ? error.message : JSON.stringify(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
});

export default router;
