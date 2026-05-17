import { Router } from "express";
import { db, estimatesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreateEstimateBody,
  GetEstimateParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/estimates", async (_req, res) => {
  try {
    const estimates = await db
      .select()
      .from(estimatesTable)
      .orderBy(estimatesTable.createdAt);
    res.json(estimates);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch estimates" });
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
      })
      .returning();
    res.status(201).json(estimate);
  } catch (err) {
    res.status(500).json({ error: "Failed to create estimate" });
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
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch estimate" });
  }
});

export default router;
