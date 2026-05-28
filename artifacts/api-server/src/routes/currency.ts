import { Router, type IRouter } from "express";

const router: IRouter = Router();

let ratesCache: { rates: Record<string, number>; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

router.get("/currency/rates", async (_req, res): Promise<void> => {
  try {
    const now = Date.now();
    if (ratesCache && now - ratesCache.fetchedAt < CACHE_TTL_MS) {
      res.json(ratesCache.rates);
      return;
    }

    const response = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
    if (!response.ok) throw new Error("Failed to fetch rates");
    const data = (await response.json()) as { rates: Record<string, number> };
    const rates = { USD: 1, EUR: data.rates.EUR ?? 0.92, INR: data.rates.INR ?? 83.5 };
    ratesCache = { rates, fetchedAt: now };
    res.json(rates);
  } catch {
    // Fallback to approximate rates
    res.json({ USD: 1, EUR: 0.92, INR: 83.5 });
  }
});

export default router;
