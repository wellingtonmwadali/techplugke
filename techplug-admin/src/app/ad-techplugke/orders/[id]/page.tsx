"use client";

import Image from "next/image";
import { use, useEffect, useState } from "react";
import { CheckCircle } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { formatKes } from "@/lib/format";
import Toast from "@/components/admin/Toast";

const STATUSES = ["placed", "processing", "shipped", "delivered", "cancelled"];

const STATUS_BADGES: Record<string, string> = {
  placed: "bg-amber-50 text-amber-700 border-amber-200",
  processing: "bg-blue-50 text-blue-700 border-blue-200",
  shipped: "bg-purple-50 text-purple-700 border-purple-200",
  delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-rose-50 text-sale border-rose-200",
};

type OrderItem = {
  productId: string;
  name: string;
  price: number;
  color: string;
  quantity: number;
  image: string;
};

type Order = {
  _id: string;
  orderNumber: string;
  items: OrderItem[];
  contact: {
    name: string;
    phone: string;
    email: string;
    address: string;
    town: string;
    notes?: string;
  };
  paymentMethod: string;
  subtotal: number;
  shippingFee: number;
  total: number;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export default function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Order>(`/api/orders/${id}`)
      .then(setOrder)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load order."));
  }, [id]);

  async function updateStatus(status: string, successMessage?: string) {
    setUpdating(true);
    try {
      const updated = await apiFetch<Order>(`/api/orders/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, updatedAt: order?.updatedAt }),
      });
      setOrder(updated);
      if (successMessage) setToastMessage(successMessage);
    } catch {
      setError("Failed to update order status.");
    } finally {
      setUpdating(false);
    }
  }

  if (error) return <p className="text-sm text-sale">{error}</p>;
  if (!order) return <p className="text-sm text-ink/60">Loading…</p>;

  const canConfirmAndProcess = order.status === "placed";

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl italic">Order #{order.orderNumber}</h1>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${
            STATUS_BADGES[order.status] ?? "bg-slate-100 text-slate-600 border-slate-200"
          }`}
        >
          {order.status}
        </span>
      </div>
      <p className="mt-1 text-sm text-ink/60">
        Placed {new Date(order.createdAt).toLocaleString()}
      </p>

      {canConfirmAndProcess && (
        <button
          onClick={() => updateStatus("processing", "Order processed! Email notification sent to customer.")}
          disabled={updating}
          className="mt-4 flex items-center gap-2 rounded-full bg-[#D0F244] px-6 py-3 text-sm font-bold text-slate-950 shadow-sm transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
        >
          <CheckCircle size={18} />
          {updating ? "Processing…" : "Confirm & Process Order"}
        </button>
      )}

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          <section>
            <h2 className="font-display text-lg">Items</h2>
            <ul className="mt-3 flex flex-col gap-3">
              {order.items.map((item, i) => (
                <li key={i} className="flex items-center gap-3 rounded-lg border hairline bg-white p-3">
                  <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-cream">
                    <Image src={item.image} alt={item.name} fill className="object-cover" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-ink/60">
                      {item.color && `${item.color} · `}Qty {item.quantity}
                    </p>
                  </div>
                  <p className="text-sm font-medium">{formatKes(item.price * item.quantity)}</p>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="font-display text-lg">Contact & shipping</h2>
            <div className="mt-3 rounded-lg border hairline bg-white p-4 text-sm">
              <p className="font-medium">{order.contact.name}</p>
              <p className="text-ink/70">{order.contact.email}</p>
              <p className="text-ink/70">{order.contact.phone}</p>
              <p className="mt-2 text-ink/70">
                {order.contact.address}, {order.contact.town}
              </p>
              {order.contact.notes && (
                <p className="mt-2 text-ink/60">Notes: {order.contact.notes}</p>
              )}
            </div>
          </section>
        </div>

        <aside className="flex flex-col gap-6">
          <div className="rounded-lg border hairline bg-white p-4">
            <h2 className="font-display text-lg">Status</h2>
            <select
              value={order.status}
              disabled={updating}
              onChange={(e) => updateStatus(e.target.value)}
              className="mt-3 w-full rounded-lg border hairline bg-white px-3 py-2 text-sm"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-lg border hairline bg-white p-4 text-sm">
            <h2 className="font-display text-lg">Payment</h2>
            <p className="mt-2 capitalize text-ink/70">{order.paymentMethod}</p>
            <div className="mt-4 flex flex-col gap-1.5 border-t hairline pt-3">
              <div className="flex justify-between text-ink/70">
                <span>Subtotal</span>
                <span>{formatKes(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-ink/70">
                <span>Shipping</span>
                <span>{formatKes(order.shippingFee)}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Total</span>
                <span>{formatKes(order.total)}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
    </div>
  );
}
