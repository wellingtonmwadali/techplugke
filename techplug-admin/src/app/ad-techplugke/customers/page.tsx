"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Download, Eye, Mail, MoreVertical, Plus, User as UserIcon, Crown, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { formatKes } from "@/lib/format";
import CustomerDetailsDrawer from "@/components/admin/CustomerDetailsDrawer";
import AddCustomerModal from "@/components/admin/AddCustomerModal";

type Segment = "new" | "active" | "at-risk" | "churned";

type Customer = {
  _id: string;
  name?: string;
  email: string;
  tags: string[];
  orderCount: number;
  totalSpend: number;
  segment: Segment;
};

type Stats = {
  totalCustomers: number;
  newThisMonth: number;
  growthPercent: number | null;
  aov: number;
  repeatRate: number;
};

type Paginated<T> = { items: T[]; total: number; page: number; pageSize: number };

const PAGE_SIZE = 25;

const FILTER_PILLS: { value: string; label: string }[] = [
  { value: "", label: "All" },
  { value: "VIP", label: "VIP" },
  { value: "repeat", label: "Repeat" },
  { value: "new", label: "New" },
  { value: "inactive", label: "Inactive" },
];

const SEGMENT_BADGES: Record<Segment, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  "at-risk": { label: "At Risk", className: "bg-amber-50 text-amber-700 border-amber-200" },
  churned: { label: "Churned", className: "bg-rose-50 text-sale border-rose-200" },
  new: { label: "New", className: "bg-slate-100 text-slate-600 border-slate-200" },
};

function initials(name: string | undefined, email: string): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
  }
  return email[0]?.toUpperCase() ?? "?";
}

function tagClassName(tag: string): string {
  const lower = tag.toLowerCase();
  if (lower.includes("vip")) return "bg-amber-50 text-amber-700 border border-amber-200";
  if (lower.includes("repeat")) return "bg-blue-50 text-blue-700 border border-blue-200";
  if (lower.includes("new")) return "bg-emerald-50 text-emerald-700 border border-emerald-200";
  return "bg-slate-100 text-slate-600 border border-slate-200";
}

function toCsv(rows: Customer[]): string {
  const header = ["Name", "Email", "Orders", "Total Spend", "Tags", "Segment"];
  const lines = rows.map((c) =>
    [c.name ?? "", c.email, c.orderCount, c.totalSpend, c.tags.join("; "), c.segment]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",")
  );
  return [header.join(","), ...lines].join("\n");
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [tagPromptOpenFor, setTagPromptOpenFor] = useState<string | null>(null);
  const [tagDraft, setTagDraft] = useState("");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [drawerCustomerId, setDrawerCustomerId] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const requestIdRef = useRef(0);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1);
      setSearch(searchInput);
    }, 250);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  function loadCustomers() {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (filter) params.set("tag", filter);
    params.set("page", String(page));
    params.set("pageSize", String(PAGE_SIZE));

    const requestId = ++requestIdRef.current;
    apiFetch<Paginated<Customer>>(`/api/users?${params.toString()}`)
      .then((result) => {
        if (requestId !== requestIdRef.current) return;
        setCustomers(result.items);
        setTotal(result.total);
      })
      .catch((err) => {
        if (requestId !== requestIdRef.current) return;
        setError(err instanceof Error ? err.message : "Failed to load customers.");
      });
  }

  useEffect(() => {
    loadCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filter, page]);

  useEffect(() => {
    apiFetch<Stats>("/api/users/stats")
      .then(setStats)
      .catch(() => {});
  }, []);

  function selectFilter(value: string) {
    setPage(1);
    setFilter(value);
  }

  function toggleSelected(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleSelectAll() {
    if (!customers) return;
    setSelected(selected.length === customers.length ? [] : customers.map((c) => c._id));
  }

  async function saveTags(customer: Customer, tags: string[]) {
    try {
      await apiFetch(`/api/users/${customer._id}`, { method: "PATCH", body: JSON.stringify({ tags }) });
      setCustomers((prev) => (prev ? prev.map((c) => (c._id === customer._id ? { ...c, tags } : c)) : prev));
    } catch {
      setError("Failed to update tags.");
    }
  }

  function addTag(customer: Customer) {
    const value = tagDraft.trim();
    if (!value) return;
    saveTags(customer, [...customer.tags, value]);
    setTagDraft("");
    setTagPromptOpenFor(null);
  }

  async function deleteCustomer(customer: Customer) {
    setMenuOpenId(null);
    if (!confirm(`Delete ${customer.name || customer.email}? This permanently removes their account. Their past orders stay on record. This cannot be undone.`)) {
      return;
    }
    try {
      await apiFetch(`/api/users/${customer._id}`, { method: "DELETE" });
      setCustomers((prev) => (prev ? prev.filter((c) => c._id !== customer._id) : prev));
      setSelected((prev) => prev.filter((id) => id !== customer._id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete customer.");
    }
  }

  async function addTagToSelected() {
    const value = prompt("Add tag to selected customers:");
    if (!value?.trim() || !customers) return;
    const targets = customers.filter((c) => selected.includes(c._id));
    await Promise.all(
      targets.map((c) =>
        apiFetch(`/api/users/${c._id}`, {
          method: "PATCH",
          body: JSON.stringify({ tags: [...new Set([...c.tags, value.trim()])] }),
        }).catch(() => null)
      )
    );
    setSelected([]);
    loadCustomers();
  }

  function exportSelected() {
    if (!customers) return;
    const rows = customers.filter((c) => selected.includes(c._id));
    downloadCsv("customers-selected.csv", toCsv(rows));
  }

  function exportAllOnPage() {
    if (!customers) return;
    downloadCsv("customers.csv", toCsv(customers));
  }

  const growthLabel =
    stats?.growthPercent === null || stats?.growthPercent === undefined
      ? null
      : `${stats.growthPercent >= 0 ? "+" : ""}${stats.growthPercent}% this month`;

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Customers</h1>

      {/* KPI stats */}
      <div className="mb-6 mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Customers</p>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="text-2xl font-bold text-slate-900">{stats ? stats.totalCustomers.toLocaleString() : "—"}</p>
            {growthLabel && (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                {growthLabel}
              </span>
            )}
          </div>
        </div>
        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Average Order Value</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{stats ? formatKes(stats.aov) : "—"}</p>
        </div>
        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Repeat Rate</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{stats ? `${stats.repeatRate}%` : "—"}</p>
          <p className="mt-0.5 text-xs text-slate-400">Customers with 2+ orders</p>
        </div>
      </div>

      {/* Search & filter bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Search by customer name, phone, or email..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-80 rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-[#D0F244]"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {FILTER_PILLS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => selectFilter(opt.value)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  filter === opt.value
                    ? "border-[#D0F244] bg-[#D0F244] text-slate-950"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportAllOnPage}
            className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Download size={16} />
            Export CSV
          </button>
          <button
            onClick={() => setAddModalOpen(true)}
            className="flex items-center gap-2 rounded-full bg-[#D0F244] px-5 py-2.5 text-sm font-bold text-slate-950 transition-transform hover:scale-105"
          >
            <Plus size={16} />
            Add Customer
          </button>
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-sale">{error}</p>}

      {selected.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-700">{selected.length} selected</p>
          <button
            onClick={exportSelected}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Export selected
          </button>
          <button
            onClick={addTagToSelected}
            className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Plus size={14} /> Add tag to selected
          </button>
        </div>
      )}

      {!customers ? (
        <p className="mt-6 text-sm text-slate-500">Loading…</p>
      ) : customers.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-slate-100 bg-white py-16 text-center shadow-sm">
          <p className="text-xl font-bold text-slate-900">No customers match these filters</p>
          <p className="mt-2 text-sm text-slate-500">Try a different search term or clear the filter.</p>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400">
                  <th className="py-3 pl-5 pr-2">
                    <input
                      type="checkbox"
                      checked={selected.length === customers.length}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded accent-[#D0F244]"
                    />
                  </th>
                  <th className="py-3 pr-4 font-semibold">Customer</th>
                  <th className="py-3 pr-4 text-center font-semibold">Orders</th>
                  <th className="py-3 pr-4 text-right font-semibold">Spend</th>
                  <th className="py-3 pr-4 font-semibold">Tags</th>
                  <th className="py-3 pr-4 font-semibold">Status</th>
                  <th className="py-3 pr-5 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => {
                  const badge = SEGMENT_BADGES[customer.segment];
                  const highValue = customer.totalSpend > 5000;
                  return (
                    <tr
                      key={customer._id}
                      onClick={() => setDrawerCustomerId(customer._id)}
                      className="cursor-pointer border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50/80"
                    >
                      <td className="py-3 pl-5 pr-2" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selected.includes(customer._id)}
                          onChange={() => toggleSelected(customer._id)}
                          className="h-4 w-4 rounded accent-[#D0F244]"
                        />
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          {customer.name ? (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-xs font-bold text-slate-700">
                              {initials(customer.name, customer.email)}
                            </div>
                          ) : (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-400">
                              <UserIcon size={16} />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900 hover:text-blue-600">
                              {customer.name || "Guest User"}
                            </p>
                            <span className="block truncate text-xs text-slate-400">{customer.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-center font-medium text-slate-700">{customer.orderCount}</td>
                      <td className="py-3 pr-4 text-right">
                        <span className={`font-bold ${highValue ? "text-amber-600" : "text-slate-900"}`}>
                          {formatKes(customer.totalSpend)}
                        </span>
                        {highValue && <Crown size={12} className="ml-1 inline text-amber-500" />}
                      </td>
                      <td className="py-3 pr-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {customer.tags.map((tag) => (
                            <span key={tag} className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${tagClassName(tag)}`}>
                              {tag}
                            </span>
                          ))}
                          {tagPromptOpenFor === customer._id ? (
                            <input
                              autoFocus
                              value={tagDraft}
                              onChange={(e) => setTagDraft(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") addTag(customer);
                                if (e.key === "Escape") setTagPromptOpenFor(null);
                              }}
                              onBlur={() => setTagPromptOpenFor(null)}
                              placeholder="Tag name"
                              className="w-24 rounded-full border border-slate-200 px-2 py-0.5 text-[11px] outline-none focus:ring-2 focus:ring-[#D0F244]"
                            />
                          ) : (
                            <button
                              onClick={() => {
                                setTagPromptOpenFor(customer._id);
                                setTagDraft("");
                              }}
                              className="rounded-full border border-dashed border-slate-300 px-2.5 py-0.5 text-[11px] font-semibold text-slate-400 hover:border-slate-400 hover:text-slate-600"
                            >
                              + Tag
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-semibold ${badge.className}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3 pr-5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setDrawerCustomerId(customer._id)}
                            aria-label="View details"
                            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                          >
                            <Eye size={15} />
                          </button>
                          <a
                            href={`mailto:${customer.email}`}
                            aria-label="Send email"
                            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                          >
                            <Mail size={15} />
                          </a>
                          <div className="relative">
                            <button
                              onClick={() => setMenuOpenId(menuOpenId === customer._id ? null : customer._id)}
                              aria-label="More options"
                              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                            >
                              <MoreVertical size={15} />
                            </button>
                            {menuOpenId === customer._id && (
                              <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-2xl border border-slate-100 bg-white py-1 text-sm shadow-lg">
                                <a
                                  href={`/ad-techplugke/customers/${customer._id}`}
                                  className="block w-full px-4 py-2 text-left text-slate-600 hover:bg-slate-50"
                                >
                                  View full profile
                                </a>
                                <button
                                  onClick={() => deleteCustomer(customer)}
                                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sale hover:bg-rose-50"
                                >
                                  <Trash2 size={13} /> Delete customer
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4 text-sm">
            <p className="text-slate-500">
              Page {page} of {totalPages} · {total} customer{total === 1 ? "" : "s"}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-full border border-slate-200 px-4 py-1.5 font-medium text-slate-600 disabled:opacity-40"
              >
                Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-full border border-slate-200 px-4 py-1.5 font-medium text-slate-600 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      <CustomerDetailsDrawer customerId={drawerCustomerId} onClose={() => setDrawerCustomerId(null)} />
      <AddCustomerModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onCreated={() => {
          setPage(1);
          loadCustomers();
        }}
      />
    </div>
  );
}
