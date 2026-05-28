import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { fetchJson } from "@/lib/api-data";

type Currency = "USD" | "EUR" | "INR";

type CurrencyContextType = {
  currency: Currency;
  setCurrency: (curr: Currency) => void;
  formatPrice: (usd: number, eur?: number, inr?: number) => string;
  rates: Record<string, number>;
};

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const FALLBACK_RATES: Record<string, number> = { USD: 1, EUR: 0.92, INR: 83.5 };

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<Currency>("USD");
  const [rates, setRates] = useState<Record<string, number>>(FALLBACK_RATES);

  useEffect(() => {
    fetchJson<Record<string, number>>("/api/currency/rates")
      .then((data: Record<string, number>) => {
        if (data.USD && data.EUR && data.INR) setRates(data);
      })
      .catch(() => {});
  }, []);

  const formatPrice = (usd: number, eur?: number, inr?: number) => {
    if (currency === "EUR") {
      const val = eur !== undefined && eur > 0 ? eur : usd * (rates.EUR ?? FALLBACK_RATES.EUR);
      return new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(val);
    }
    if (currency === "INR") {
      const val = inr !== undefined && inr > 0 ? inr : usd * (rates.INR ?? FALLBACK_RATES.INR);
      return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(val);
    }
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(usd);
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatPrice, rates }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) throw new Error("useCurrency must be used within a CurrencyProvider");
  return context;
}
