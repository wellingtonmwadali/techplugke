import { apiFetch } from "./api";

export function sendOrderConfirmation(orderId: string): Promise<{ success: boolean; message: string }> {
  return apiFetch("/api/marketing/order-confirmation", {
    method: "POST",
    body: JSON.stringify({ orderId }),
  });
}

export function previewDealOfMonth(productIds: string[], note: string): Promise<{ html: string }> {
  const params = new URLSearchParams({ productIds: productIds.join(","), note });
  return apiFetch(`/api/marketing/deal-of-month/preview?${params.toString()}`);
}

export function sendDealOfMonth(input: {
  productIds: string[];
  recipientType: "all" | "selected";
  customerIds?: string[];
  note?: string;
}): Promise<{ success: boolean; sent: number; total: number; message: string }> {
  return apiFetch("/api/marketing/deal-of-month", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
