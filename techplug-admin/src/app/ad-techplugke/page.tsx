"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Package, ClipboardList, Users } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { formatKes } from "@/lib/format";

type Order = {
  _id: string;
  orderNumber: string;
  contact: { name: string };
  total: number;
  status: string;
  createdAt: string;
};

export default function AdminDashboard() {
  const [recentOrders, setRecentOrders] = useState<Order[] | null>(null);

  useEffect(() => {
    apiFetch<Order[]>("/api/orders?limit=5")
      .then(setRecentOrders)
      .catch(() => setRecentOrders([]));
  }, []);

  return (
    <div>
      <div className="grid gap-6 sm:grid-cols-3">
        <Link
          href="/ad-techplugke/products"
          className="flex flex-col gap-2 rounded-2xl border hairline bg-white p-6 hover:border-ink transition-colors"
        >
          <Package size={28} />
          <p className="font-display text-xl">Products</p>
          <p className="text-sm text-ink/60">Add, edit, and remove products from the catalog.</p>
        </Link>
        <Link
          href="/ad-techplugke/orders"
          className="flex flex-col gap-2 rounded-2xl border hairline bg-white p-6 hover:border-ink transition-colors"
        >
          <ClipboardList size={28} />
          <p className="font-display text-xl">Orders</p>
          <p className="text-sm text-ink/60">View incoming orders and update their status.</p>
        </Link>
        <Link
          href="/ad-techplugke/customers"
          className="flex flex-col gap-2 rounded-2xl border hairline bg-white p-6 hover:border-ink transition-colors"
        >
          <Users size={28} />
          <p className="font-display text-xl">Customers</p>
          <p className="text-sm text-ink/60">Search customers, tag segments, manage accounts.</p>
        </Link>
      </div>

      <div className="mt-8">
        <h2 className="font-display text-xl">Recent activity</h2>
        {!recentOrders ? (
          <p className="mt-3 text-sm text-ink/60">Loading…</p>
        ) : recentOrders.length === 0 ? (
          <p className="mt-3 text-sm text-ink/60">No orders yet.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {recentOrders.map((order) => (
              <li
                key={order._id}
                className="flex items-center justify-between rounded-lg border hairline bg-white px-4 py-3 text-sm"
              >
                <Link href={`/ad-techplugke/orders/${order._id}`} className="font-medium underline">
                  #{order.orderNumber}
                </Link>
                <span className="text-ink/70">{order.contact.name}</span>
                <span className="font-medium">{formatKes(order.total)}</span>
                <span className="text-xs capitalize text-ink/60">{order.status}</span>
                <span className="text-xs text-ink/50">
                  {new Date(order.createdAt).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
