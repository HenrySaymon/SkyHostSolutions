import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, servicesTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/services", async (_req, res): Promise<void> => {
  const services = await db
    .select()
    .from(servicesTable)
    .where(eq(servicesTable.enabled, true));

  res.json(services.map(toServiceJson));
});

router.get("/services/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [service] = await db
    .select()
    .from(servicesTable)
    .where(and(eq(servicesTable.id, id), eq(servicesTable.enabled, true)));

  if (!service) {
    res.status(404).json({ error: "Service not found" });
    return;
  }

  const related = await db
    .select()
    .from(servicesTable)
    .where(and(eq(servicesTable.category, service.category), eq(servicesTable.enabled, true)));

  res.json({
    service: toServiceJson(service),
    relatedServices: related.filter((s) => s.id !== id).slice(0, 3).map(toServiceJson),
  });
});

function toServiceJson(s: typeof servicesTable.$inferSelect) {
  return {
    id: s.id,
    name: s.name,
    slug: s.slug,
    category: s.category,
    shortDescription: s.shortDescription,
    description: s.description,
    features: Array.isArray(s.features) ? s.features : [],
    priceUsd: Number(s.priceUsd),
    priceEur: Number(s.priceEur),
    priceInr: Number(s.priceInr),
    imageUrl: s.imageUrl,
    enabled: s.enabled,
  };
}

export { toServiceJson };
export default router;
