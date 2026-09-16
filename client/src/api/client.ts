import type { AggregatedSales, ConnectionStatus } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, init);
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(body.error ?? `Request to ${path} failed with ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export function fetchConnections(): Promise<{ connections: ConnectionStatus[] }> {
  return request("/api/connections");
}

export function fetchSales(start: Date, end: Date): Promise<AggregatedSales> {
  const params = new URLSearchParams({ start: start.toISOString(), end: end.toISOString() });
  return request(`/api/sales?${params.toString()}`);
}

export function disconnectPlatform(platform: "etsy" | "square" | "shopify"): Promise<{ ok: boolean }> {
  return request(`/api/auth/${platform}/disconnect`, { method: "POST" });
}

export function startOAuth(platform: "etsy" | "square"): void {
  window.location.href = `${API_BASE_URL}/api/auth/${platform}/start`;
}

export function startShopifyOAuth(shop: string): void {
  window.location.href = `${API_BASE_URL}/api/auth/shopify/start?shop=${encodeURIComponent(shop)}`;
}

export async function importLocalPosCsv(file: File): Promise<{ imported: number; skipped: number }> {
  const formData = new FormData();
  formData.append("file", file);
  return request("/api/local-pos/import", { method: "POST", body: formData });
}

export function clearLocalPosData(): Promise<{ ok: boolean }> {
  return request("/api/local-pos", { method: "DELETE" });
}

export { API_BASE_URL };
