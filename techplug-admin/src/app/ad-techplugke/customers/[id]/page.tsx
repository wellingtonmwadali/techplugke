"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { Trash2, User as UserIcon } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { formatKes } from "@/lib/format";

type Order = {
  _id: string;
  orderNumber: string;
  total: number;
  status: string;
  createdAt: string;
};

type Customer = {
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

export default function AdminCustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [newTag, setNewTag] = useState("");
  const [email, setEmail] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    apiFetch<Customer>(`/api/users/${id}`)
      .then((c) => {
        setCustomer(c);
        setEmail(c.email);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load customer."));
  }, [id]);

  async function saveTags(tags: string[]) {
    try {
      const updated = await apiFetch<Customer>(`/api/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ tags }),
      });
      setCustomer((c) => (c ? { ...c, tags: updated.tags } : c));
    } catch {
      setError("Failed to update tags.");
    }
  }

  function addTag() {
    if (!newTag.trim() || !customer) return;
    saveTags([...customer.tags, newTag.trim()]);
    setNewTag("");
  }

  function removeTag(tag: string) {
    if (!customer) return;
    saveTags(customer.tags.filter((t) => t !== tag));
  }

  async function saveEmail(e: React.FormEvent) {
    e.preventDefault();
    setSavingEmail(true);
    setError(null);
    try {
      const updated = await apiFetch<Customer>(`/api/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ email }),
      });
      setCustomer((c) => (c ? { ...c, email: updated.email } : c));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update email.");
    } finally {
      setSavingEmail(false);
    }
  }

  async function deleteCustomer() {
    if (!customer) return;
    if (
      !confirm(
        `Delete ${customer.name || customer.email}? This permanently removes their account. Their past orders stay on record. This cannot be undone.`
      )
    ) {
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      await apiFetch(`/api/users/${id}`, { method: "DELETE" });
      router.push("/ad-techplugke/customers");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete customer.");
      setDeleting(false);
    }
  }

  if (error && !customer) return <p className="text-sm text-sale">{error}</p>;
  if (!customer) return <p className="text-sm text-ink/60">Loading…</p>;

  const totalSpend = customer.orders.reduce((sum, o) => sum + o.total, 0);

  return (
    <div>
      <Link href="/ad-techplugke/customers" className="text-sm text-ink/60 hover:text-ink">
        ← Back to customers
      </Link>

      {/* Profile summary — avatar, contact, and at-a-glance stats, so the top of the page
          carries real information instead of a bare heading over a mostly-empty layout. */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-6 rounded-3xl border hairline bg-white p-6 shadow-soft">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border hairline bg-cream text-lg font-bold text-ink/70">
            {customer.name ? initials(customer.name, customer.email) : <UserIcon size={22} />}
          </div>
          <div>
            <h1 className="font-display text-2xl italic">{customer.name || "Guest User"}</h1>
            <p className="text-sm text-ink/60">{customer.email}</p>
          </div>
        </div>
        <div className="flex gap-8">
          <div>
            <p className="text-xs uppercase tracking-wider text-ink/50">Orders</p>
            <p className="mt-1 font-display text-xl">{customer.orders.length}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-ink/50">Total spend</p>
            <p className="mt-1 font-display text-xl">{formatKes(totalSpend)}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]">
        <section className="rounded-3xl border hairline bg-white p-6 shadow-soft">
          <h2 className="font-display text-lg">Order history</h2>
          {customer.orders.length === 0 ? (
            <p className="mt-3 text-sm text-ink/60">No orders yet.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {customer.orders.map((order) => (
                <li
                  key={order._id}
                  className="flex items-center justify-between rounded-lg border hairline bg-white px-4 py-3"
                >
                  <Link href={`/ad-techplugke/orders/${order._id}`} className="text-sm font-medium underline">
                    #{order.orderNumber}
                  </Link>
                  <span className="text-xs text-ink/60">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </span>
                  <span className="text-sm font-medium">{formatKes(order.total)}</span>
                  <span className="text-xs capitalize text-ink/60">{order.status}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="flex flex-col gap-6">
          <div className="rounded-2xl border hairline bg-white p-4">
            <h2 className="font-display text-lg">Tags</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {customer.tags.length === 0 && <span className="text-xs text-ink/40">No tags yet</span>}
              {customer.tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1.5 rounded-full bg-cream px-3 py-1 text-xs font-medium"
                >
                  {tag}
                  <button onClick={() => removeTag(tag)} aria-label={`Remove ${tag}`} className="text-ink/50">
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                placeholder="VIP, Wholesale…"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                className="flex-1 rounded-lg border hairline bg-white px-3 py-2 text-sm"
              />
              <button
                onClick={addTag}
                className="rounded-full border hairline px-3 py-2 text-sm font-medium"
              >
                Add
              </button>
            </div>
          </div>

          <form onSubmit={saveEmail} className="rounded-2xl border hairline bg-white p-4">
            <h2 className="font-display text-lg">Email</h2>
            <p className="mt-1 text-xs text-ink/60">
              Updates their sign-in credential immediately, but if they&apos;re currently
              signed in elsewhere their session won&apos;t reflect it until they sign out and
              back in.
            </p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-lg border hairline bg-white px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={savingEmail || email === customer.email}
              className="mt-2 rounded-full bg-ink px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {savingEmail ? "Saving…" : "Save email"}
            </button>
          </form>

          <div className="rounded-2xl border border-rose-100 bg-white p-4">
            <h2 className="font-display text-lg text-sale">Danger zone</h2>
            <p className="mt-1 text-xs text-ink/60">
              Permanently deletes their account. Order history stays on record.
            </p>
            <button
              onClick={deleteCustomer}
              disabled={deleting}
              className="mt-2 flex items-center gap-1.5 rounded-full border border-rose-200 px-4 py-2 text-sm font-medium text-sale disabled:opacity-60"
            >
              <Trash2 size={14} />
              {deleting ? "Deleting…" : "Delete customer"}
            </button>
          </div>

          {error && <p className="text-sm text-sale">{error}</p>}
        </aside>
      </div>
    </div>
  );
}
