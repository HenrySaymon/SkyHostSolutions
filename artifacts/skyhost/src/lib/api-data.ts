const COMMON_ARRAY_KEYS = [
  "data",
  "items",
  "results",
  "records",
  "services",
  "testimonials",
  "orders",
  "tickets",
  "invoices",
  "clients",
  "users",
  "replies",
];

export function toArray<T>(value: unknown, preferredKeys: string[] = []): T[] {
  if (Array.isArray(value)) return value as T[];

  if (!value || typeof value !== "object") return [];

  const record = value as Record<string, unknown>;
  for (const key of [...preferredKeys, ...COMMON_ARRAY_KEYS]) {
    if (Array.isArray(record[key])) return record[key] as T[];
  }

  return [];
}

export async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const apiBase = import.meta.env.VITE_API_BASE_URL as string | undefined;
  const requestInput =
    typeof input === "string" && input.startsWith("/api") && apiBase
      ? `${apiBase.replace(/\/$/, "")}${input}`
      : input;
  const response = await fetch(requestInput, { credentials: "include", ...init });
  const contentType = response.headers.get("content-type") ?? "";
  const raw = await response.text();

  let data: unknown = null;
  if (raw.trim()) {
    if (contentType.includes("application/json")) {
      data = JSON.parse(raw);
    } else {
      const looksLikeHtml = raw.trimStart().startsWith("<!DOCTYPE") || raw.trimStart().startsWith("<html");
      const message = looksLikeHtml
        ? "API route returned the website HTML. Check that the API server/reverse proxy is running and this route exists."
        : raw.slice(0, 300);
      throw new Error(message);
    }
  }

  if (!response.ok) {
    const error = data && typeof data === "object" && "error" in data
      ? String((data as { error?: unknown }).error)
      : `Request failed with status ${response.status}`;
    throw new Error(error);
  }

  return data as T;
}
