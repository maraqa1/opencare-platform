import { getApiUrl } from "@/lib/api";

export const customerAssessmentCookie = "module01_customer_session";

export async function backendRequest(path: string, init: RequestInit = {}) {
  return fetch(getApiUrl(path), { ...init, cache: "no-store" });
}

export function safeBackendBody(value: string) {
  try { return JSON.parse(value); } catch { return { detail: "Customer assessment service returned an invalid response." }; }
}
