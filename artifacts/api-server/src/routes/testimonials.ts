import { Router, type IRouter } from "express";
import { db, testimonialsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/testimonials", async (_req, res): Promise<void> => {
  const testimonials = await db.select().from(testimonialsTable);
  res.json(testimonials);
});

export default router;
