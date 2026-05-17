import { pgTable, serial, text, real, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const estimatesTable = pgTable("estimates", {
  id: serial("id").primaryKey(),
  customerName: text("customer_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  address: text("address").notNull(),
  squareFootage: real("square_footage").notNull(),
  hasTreeObstruction: boolean("has_tree_obstruction").notNull().default(false),
  basePrice: real("base_price").notNull(),
  crackFillPrice: real("crack_fill_price"),
  totalPrice: real("total_price").notNull(),
  hasCrackFill: boolean("has_crack_fill").notNull().default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertEstimateSchema = createInsertSchema(estimatesTable).omit({ id: true, createdAt: true });
export type InsertEstimate = z.infer<typeof insertEstimateSchema>;
export type Estimate = typeof estimatesTable.$inferSelect;
