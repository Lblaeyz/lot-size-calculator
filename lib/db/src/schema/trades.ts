import { pgTable, serial, text, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tradesTable = pgTable("trades", {
  id: serial("id").primaryKey(),
  pair: text("pair").notNull(),
  direction: text("direction").notNull(),
  lotSize: real("lot_size").notNull(),
  slPips: real("sl_pips").notNull(),
  tpPips: real("tp_pips"),
  riskUSD: real("risk_usd").notNull(),
  riskNGN: real("risk_ngn").notNull(),
  usdRate: real("usd_rate").notNull(),
  rr: text("rr"),
  outcome: text("outcome"),
  pnlUSD: real("pnl_usd"),
  pnlNGN: real("pnl_ngn"),
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTradeSchema = createInsertSchema(tradesTable).omit({ id: true, createdAt: true });
export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type Trade = typeof tradesTable.$inferSelect;
