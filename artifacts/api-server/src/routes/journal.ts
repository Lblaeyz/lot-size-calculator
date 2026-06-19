import { Router } from "express";
import { db, tradesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/journal/trades", async (req, res) => {
  const trades = await db.select().from(tradesTable).orderBy(tradesTable.createdAt);
  res.json(trades.reverse());
});

router.post("/journal/trades", async (req, res) => {
  const body = req.body;
  const [trade] = await db.insert(tradesTable).values({
    pair: body.pair,
    direction: body.direction,
    lotSize: body.lotSize,
    slPips: body.slPips,
    tpPips: body.tpPips ?? null,
    riskUSD: body.riskUSD,
    riskNGN: body.riskNGN,
    usdRate: body.usdRate,
    rr: body.rr ?? null,
    notes: body.notes ?? "",
  }).returning();
  res.status(201).json(trade);
});

router.patch("/journal/trades/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const body = req.body;
  const [trade] = await db.update(tradesTable).set({
    ...(body.outcome !== undefined && { outcome: body.outcome }),
    ...(body.pnlUSD !== undefined && { pnlUSD: body.pnlUSD }),
    ...(body.pnlNGN !== undefined && { pnlNGN: body.pnlNGN }),
    ...(body.notes !== undefined && { notes: body.notes }),
  }).where(eq(tradesTable.id, id)).returning();
  if (!trade) { res.status(404).json({ error: "Not found" }); return; }
  res.json(trade);
});

router.delete("/journal/trades/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(tradesTable).where(eq(tradesTable.id, id));
  res.status(204).send();
});

export default router;
