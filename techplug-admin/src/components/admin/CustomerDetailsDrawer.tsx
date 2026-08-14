"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { X, MapPin, StickyNote, ExternalLink } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { formatKes } from "@/lib/format";

type OrderContact = {
  name: string;
  phone: string;
  email: string;
  address: string;
  town: string;
  notes?: string;
};

type Order = {
  _id: string;
  orderNumber: string;
  total: number;
  status: string;
  createdAt: string;
  contact: OrderContact;
};

type CustomerDetail = {
  _id: string;
  name?: string;
  email: string;
  tags: string[];
  orders: Order[];
};

function initials(name: string | undefined, email: string): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
  }
  return email[0]?.toUpperCase() ?? "?";
}

export default function CustomerDetailsDrawer({
  customerId,
  onClose,
}: {
  customerId: string | null;
  onClose: () => void;
}) {
  const [result, setResult] = useState<{ id: string; customer: CustomerDetail | null; error: string | null } | null>(
    null
  );
  const isOpen = Boolean(customerId);

  useEffect(() => {
    if (!customerId) return;
    apiFetch<CustomerDetail>(`/api/users/${customerId}`)
      .then((c) => setResult({ id: customerId, customer: c, error: null }))
      .catch((err) =>
        setResult({ id: customerId, customer: null, error: err instanceof Error ? err.message : "Failed to load customer." })
      );
  }, [customerId]);

  // Only trust `result` once it matches the currently-open customer — avoids flashing the
  // previous customer's data (or a stale error) while the new one is still loading.
  const customer = result?.id === customerId ? result.customer : null;
  const error = result?.id === customerId ? result.error : null;
  const latestOrder = customer?.orders[0];

  return (
    <div
      className={`fixed inset-0 z-50 transition-opacity ${
        isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      }`}
      aria-hidden={!isOpen}
    >
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-xl transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">Customer details</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        {error && <p className="px-6 py-4 text-sm text-sale">{error}</p>}

        {!customer ? (
          !error && <p className="px-6 py-6 text-sm text-slate-400">Loading…</p>
        ) : (
          <div className="flex flex-col gap-6 px-6 py-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-sm font-bold text-slate-700">
                {initials(customer.name, customer.email)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-slate-900">
                  {customer.name || "Guest User"}
                </p>
                <p className="truncate text-sm text-slate-400">{customer.email}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {customer.tags.length > 0 ? (
                customer.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {tag}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-300">No tags</span>
              )}
            </div>

            {latestOrder && (
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <MapPin size={12} /> Last known shipping address
                </p>
                <p className="mt-2 text-sm font-medium text-slate-800">{latestOrder.contact.name}</p>
                <p className="text-sm text-slate-600">{latestOrder.contact.phone}</p>
                <p className="text-sm text-slate-600">
                  {latestOrder.contact.address}, {latestOrder.contact.town}
                </p>
                {latestOrder.contact.notes && (
                  <p className="mt-2 flex items-start gap-1.5 text-xs text-slate-500">
                    <StickyNote size={12} className="mt-0.5 shrink-0" />
                    {latestOrder.contact.notes}
                  </p>
                )}
              </div>
            )}

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Recent orders</p>
              {customer.orders.length === 0 ? (
                <p className="mt-2 text-sm text-slate-400">No orders yet.</p>
              ) : (
                <ul className="mt-3 flex flex-col gap-2">
                  {customer.orders.slice(0, 8).map((order) => (
                    <li
                      key={order._id}
                      className="flex items-center justify-between rounded-xl border border-slate-100 bg-white px-4 py-3"
                    >
                      <div>
                        <Link
                          href={`/ad-techplugke/orders/${order._id}`}
                          className="text-sm font-semibold text-slate-900 hover:text-blue-600"
                        >
                          #{order.orderNumber}
                        </Link>
                        <p className="text-xs text-slate-400">{new Date(order.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-900">{formatKes(order.total)}</p>
                        <p className="text-xs capitalize text-slate-400">{order.status}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <Link
              href={`/ad-techplugke/customers/${customer._id}`}
              className="flex items-center justify-center gap-1.5 rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              View full profile <ExternalLink size={14} />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
