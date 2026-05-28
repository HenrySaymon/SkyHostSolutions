import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";

export type ButtonShape = "square" | "soft" | "pill";
export type ThemeMode = "dark" | "light";

export type AppearanceSettings = {
  themeMode: ThemeMode;
  primaryColor: string;
  backgroundColor: string;
  cardColor: string;
  textColor: string;
  brandColor: string;
  brandSkyColor: string;
  brandHostColor: string;
  brandSolutionsColor: string;
  buttonShape: ButtonShape;
};

const DEFAULT_APPEARANCE: AppearanceSettings = {
  themeMode: "dark",
  primaryColor: "#0ea5e9",
  backgroundColor: "#0f172a",
  cardColor: "#111c2f",
  textColor: "#f8fafc",
  brandColor: "#38bdf8",
  brandSkyColor: "#38bdf8",
  brandHostColor: "#818cf8",
  brandSolutionsColor: "#f0f6ff",
  buttonShape: "soft",
};

const THEME_SURFACES: Record<ThemeMode, Pick<AppearanceSettings, "backgroundColor" | "cardColor" | "textColor">> = {
  dark: {
    backgroundColor: "#0f172a",
    cardColor: "#111c2f",
    textColor: "#f8fafc",
  },
  light: {
    backgroundColor: "#f8fafc",
    cardColor: "#ffffff",
    textColor: "#0f172a",
  },
};

const STORAGE_KEY = "skyhost-appearance";

type AppearanceContextType = {
  settings: AppearanceSettings;
  updateSettings: (next: AppearanceSettings) => void;
  setThemeMode: (mode: ThemeMode) => void;
  saveSettings: (next?: AppearanceSettings) => Promise<void>;
  resetSettings: () => void;
};

const AppearanceContext = createContext<AppearanceContextType | undefined>(undefined);

function hexToHsl(hex: string) {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    if (max === g) h = (b - r) / d + 2;
    if (max === b) h = (r - g) / d + 4;
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function radiusForShape(shape: ButtonShape) {
  if (shape === "square") return "0.125rem";
  if (shape === "pill") return "9999px";
  return "0.5rem";
}

function applyAppearance(settings: AppearanceSettings) {
  const root = document.documentElement;
  root.classList.toggle("dark", settings.themeMode === "dark");
  const isDark = settings.themeMode === "dark";
  root.style.setProperty("--primary", hexToHsl(settings.primaryColor));
  root.style.setProperty("--ring", hexToHsl(settings.primaryColor));
  root.style.setProperty("--accent", hexToHsl(settings.primaryColor));
  root.style.setProperty("--sidebar-primary", hexToHsl(settings.primaryColor));
  root.style.setProperty("--background", hexToHsl(settings.backgroundColor));
  root.style.setProperty("--card", hexToHsl(settings.cardColor));
  root.style.setProperty("--popover", hexToHsl(settings.cardColor));
  root.style.setProperty("--foreground", hexToHsl(settings.textColor));
  root.style.setProperty("--card-foreground", hexToHsl(settings.textColor));
  root.style.setProperty("--popover-foreground", hexToHsl(settings.textColor));
  root.style.setProperty("--primary-foreground", isDark ? "222 47% 11%" : "210 40% 98%");
  root.style.setProperty("--secondary", isDark ? "217 32% 18%" : "210 40% 96%");
  root.style.setProperty("--secondary-foreground", isDark ? "210 40% 98%" : "222 47% 11%");
  root.style.setProperty("--muted", isDark ? "217 32% 18%" : "210 40% 96%");
  root.style.setProperty("--muted-foreground", isDark ? "215 20% 65%" : "215 16% 47%");
  root.style.setProperty("--accent-foreground", isDark ? "222 47% 11%" : "210 40% 98%");
  root.style.setProperty("--border", isDark ? "217 32% 18%" : "214 32% 91%");
  root.style.setProperty("--input", isDark ? "217 32% 18%" : "214 32% 91%");
  root.style.setProperty("--sidebar", hexToHsl(settings.cardColor));
  root.style.setProperty("--sidebar-foreground", hexToHsl(settings.textColor));
  root.style.setProperty("--sidebar-border", isDark ? "217 32% 18%" : "214 32% 91%");
  root.style.setProperty("--sidebar-accent", isDark ? "217 32% 18%" : "210 40% 96%");
  root.style.setProperty("--sidebar-accent-foreground", hexToHsl(settings.textColor));
  root.style.setProperty("--destructive", isDark ? "0 63% 31%" : "0 84% 60%");
  root.style.setProperty("--destructive-foreground", "210 40% 98%");
  root.style.setProperty("--radius", radiusForShape(settings.buttonShape));
}

function readStoredSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_APPEARANCE;
    return { ...DEFAULT_APPEARANCE, ...JSON.parse(raw) } as AppearanceSettings;
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppearanceSettings>(() => readStoredSettings());

  useEffect(() => {
    fetch("/api/appearance")
      .then((response) => response.ok ? response.json() : null)
      .then((data: AppearanceSettings | null) => {
        if (data) setSettings({ ...DEFAULT_APPEARANCE, ...data });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    applyAppearance(settings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const value = useMemo<AppearanceContextType>(() => ({
    settings,
    updateSettings: setSettings,
    setThemeMode: (themeMode) => setSettings((current) => ({ ...current, themeMode, ...THEME_SURFACES[themeMode] })),
    saveSettings: async (next = settings) => {
      const response = await fetch("/api/admin/appearance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!response.ok) throw new Error("Failed to save appearance");
      setSettings({ ...DEFAULT_APPEARANCE, ...(await response.json()) });
    },
    resetSettings: () => setSettings(DEFAULT_APPEARANCE),
  }), [settings]);

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppearance() {
  const context = useContext(AppearanceContext);
  if (!context) throw new Error("useAppearance must be used within an AppearanceProvider");
  return context;
}
