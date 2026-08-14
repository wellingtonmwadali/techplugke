import { apiFetch } from "./api";

export function initiateStkPush(orderId: string, phone: string): Promise<{ checkoutRequestId: string }> {
  return apiFetch("/api/payments/stkpush", {
    method: "POST",
    body: JSON.stringify({ orderId, phone }),
  });
}

export type OrderPaymentStatus = {
  orderNumber: string;
  status: string;
  paymentStatus: "unpaid" | "pending" | "paid" | "failed";
  mpesaReceiptNumber?: string;
  total: number;
};

export function getOrderPaymentStatus(orderId: string): Promise<OrderPaymentStatus> {
  return apiFetch(`/api/orders/${orderId}/mine`);
}
