"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Mail } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { formatKes } from "@/lib/format";
import { sendOrderConfirmation } from "@/lib/marketing";
import Toast from "@/components/admin/Toast";

const STATUSES = ["placed", "processing", "shipped", "delivered", "cancelled"];
// "till" is the only method accepted for new orders — the others remain filterable here
// since historical orders placed before the switch to Till-only payments still exist.
const PAYMENT_METHODS = ["till", "mpesa", "cod", "card"];

type Order = {
  _id: string;
  orderNumber: string;
  contact: { name: string; phone: string; email: string };
  paymentMethod: string;
  total: number;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const requestIdRef = useRef(0);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (status) params.set("status", status);
    if (paymentMethod) params.set("paymentMethod", paymentMethod);
    if (from) params.set("from", from);
    if (to) params.set("to", to);

    const timeout = setTimeout(() => {
      const requestId = ++requestIdRef.current;
      apiFetch<Order[]>(`/api/orders?${params.toString()}`)
        .then((result) => {
          // Ignore this response if a newer filter request has been issued since.
          if (requestId !== requestIdRef.current) return;
          setOrders(result);
        })
        .catch((err) => {
          if (requestId !== requestIdRef.current) return;
          setError(err instanceof Error ? err.message : "Failed to load orders.");
        });
    }, 250);
    return () => clearTimeout(timeout);
  }, [search, status, paymentMethod, from, to]);

  async function updateStatus(id: string, newStatus: string) {
    const order = orders?.find((o) => o._id === id);
    setUpdating(id);
    setError(null);
    try {
      const updated = await apiFetch<Order>(`/api/orders/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus, updatedAt: order?.updatedAt }),
      });
      setOrders((prev) => prev?.map((o) => (o._id === id ? updated : o)) ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update order status.");
    } finally {
      setUpdating(null);
    }
  }

  async function handleSendConfirmation(order: Order) {
    setSendingId(order._id);
    setError(null);
    try {
      const result = await sendOrderConfirmation(order._id);
      setToastMessage(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send confirmation email.");
    } finally {
      setSendingId(null);
      setConfirmingId(null);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl italic">Orders</h1>

      <div className="mt-4 flex flex-wrap gap-2">
        <input
          type="search"
          placeholder="Search order #, name, or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border hairline bg-white px-3 py-2 text-sm"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border hairline bg-white px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          className="rounded-lg border hairline bg-white px-3 py-2 text-sm"
        >
          <option value="">All payment methods</option>
          {PAYMENT_METHODS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          aria-label="From date"
          className="rounded-lg border hairline bg-white px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          aria-label="To date"
          className="rounded-lg border hairline bg-white px-3 py-2 text-sm"
        />
      </div>

      {error && <p className="mt-4 text-sm text-sale">{error}</p>}

      {!orders ? (
        <p className="mt-6 text-sm text-ink/60">Loading…</p>
      ) : orders.length === 0 ? (
        <div className="mt-10 text-center">
          <p className="font-display text-xl">No orders match these filters</p>
          <p className="mt-2 text-sm text-ink/60">Try clearing a filter or widening the date range.</p>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b hairline text-ink/60">
                <th className="py-2 pr-4 font-medium">Order</th>
                <th className="py-2 pr-4 font-medium">Customer</th>
                <th className="py-2 pr-4 font-medium">Payment</th>
                <th className="py-2 pr-4 font-medium">Total</th>
                <th className="py-2 pr-4 font-medium">Date</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order._id} className="border-b hairline hover:bg-cream transition-colors">
                  <td className="py-3 pr-4 font-medium">
                    <Link href={`/ad-techplugke/orders/${order._id}`} className="underline">
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td className="py-3 pr-4">
                    <p>{order.contact.name}</p>
                    <p className="text-xs text-ink/60">{order.contact.email}</p>
                  </td>
                  <td className="py-3 pr-4 text-ink/70">{order.paymentMethod}</td>
                  <td className="py-3 pr-4">{formatKes(order.total)}</td>
                  <td className="py-3 pr-4 text-ink/70">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3">
                    <select
                      value={order.status}
                      disabled={updating === order._id}
                      onChange={(e) => updateStatus(order._id, e.target.value)}
                      className="rounded-lg border hairline bg-white px-2 py-1.5 text-sm"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3 pl-2">
                    {order.status === "placed" && (
                      <div className="relative">
                        <button
                          onClick={() => setConfirmingId(order._id)}
                          disabled={sendingId === order._id}
                          aria-label="Send order confirmation"
                          className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
                        >
                          <Mail size={13} />
                          {sendingId === order._id ? "Sending…" : "Send Order Confirmation"}
                        </button>
                        {confirmingId === order._id && (
                          <div className="absolute right-0 top-full z-20 mt-1 w-64 rounded-2xl border border-slate-100 bg-white p-4 text-xs shadow-lg">
                            <p className="text-slate-700">
                              Send payment confirmation email to <strong>{order.contact.email}</strong>?
                            </p>
                            <div className="mt-3 flex justify-end gap-2">
                              <button
                                onClick={() => setConfirmingId(null)}
                                className="rounded-full px-3 py-1.5 font-semibold text-slate-500 hover:bg-slate-100"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleSendConfirmation(order)}
                                className="rounded-full bg-[#D0F244] px-3 py-1.5 font-bold text-slate-950"
                              >
                                Send
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
    </div>
  );
}
