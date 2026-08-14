import { apiFetch } from "./api";

export type Settings = {
  _id: string;
  shopName: string;
  ownerName: string;
  notificationEmail: string;
  emailOnNewOrder: boolean;
  emailOnLowStock: boolean;
  logoUrl?: string;
};

export type PublicSettings = {
  shopName: string;
  logoUrl?: string;
};

export function getSettings(): Promise<Settings> {
  return apiFetch<Settings>("/api/settings");
}

// Unauthenticated — used by the storefront header/footer, which render on every public page.
export function getPublicSettings(): Promise<PublicSettings> {
  return apiFetch<PublicSettings>("/api/settings/public");
}

export function updateSettings(
  input: Partial<Omit<Settings, "_id" | "logoUrl">> & { logoUrl?: string | null }
): Promise<Settings> {
  return apiFetch<Settings>("/api/settings", { method: "PUT", body: JSON.stringify(input) });
}
