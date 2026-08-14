"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { X, Search, Tag, Eye } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { formatKes } from "@/lib/format";
import { previewDealOfMonth, sendDealOfMonth } from "@/lib/marketing";
import type { Product } from "@/lib/types";

type Paginated<T> = { items: T[]; total: number; page: number; pageSize: number };
type Customer = { _id: string; name?: string; email: string; totalSpend: number };
type Stats = { totalCustomers: number };

const inputClass =
  "w-full rounded-xl border-0 bg-[#F8F8F6] px-4 py-3 text-sm font-medium text-slate-900 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-[#D0F244]";

function spendTier(totalSpend: number): string {
  if (totalSpend > 20000) return "VIP";
  if (totalSpend > 5000) return "High value";
  if (totalSpend > 0) return "Buyer";
  return "No orders yet";
}

export default function DealOfMonthModal({
  open,
  onClose,
  onSent,
}: {
  open: boolean;
  onClose: () => void;
  onSent: (message: string) => void;
}) {
  const [productSearch, setProductSearch] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);

  const [recipientType, setRecipientType] = useState<"all" | "selected">("all");
  const [totalCustomers, setTotalCustomers] = useState<number | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<Customer[]>([]);

  const [note, setNote] = useState("");
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    apiFetch<Stats>("/api/users/stats")
      .then((s) => setTotalCustomers(s.totalCustomers))
      .catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const timeout = setTimeout(() => {
      const params = new URLSearchParams({ page: "1", pageSize: "12" });
      if (productSearch.trim()) params.set("search", productSearch.trim());
      apiFetch<Paginated<Product>>(`/api/products?${params.toString()}`)
        .then((r) => setProducts(r.items ?? []))
        .catch(() => {});
    }, 250);
    return () => clearTimeout(timeout);
  }, [open, productSearch]);

  useEffect(() => {
    if (!open || recipientType !== "selected") return;
    const timeout = setTimeout(() => {
      const params = new URLSearchParams({ page: "1", pageSize: "12" });
      if (customerSearch.trim()) params.set("search", customerSearch.trim());
      apiFetch<Paginated<Customer>>(`/api/users?${params.toString()}`)
        .then((r) => setCustomers(r.items ?? []))
        .catch(() => {});
    }, 250);
    return () => clearTimeout(timeout);
  }, [open, recipientType, customerSearch]);

  function toggleProduct(product: Product) {
    setSelectedProducts((prev) =>
      prev.some((p) => p.id === product.id) ? prev.filter((p) => p.id !== product.id) : [...prev, product]
    );
  }

  function toggleCustomer(customer: Customer) {
    setSelectedCustomers((prev) =>
      prev.some((c) => c._id === customer._id) ? prev.filter((c) => c._id !== customer._id) : [...prev, customer]
    );
  }

  async function handlePreview() {
    if (selectedProducts.length === 0) {
      setError("Select at least one product to preview.");
      return;
    }
    setPreviewLoading(true);
    setError(null);
    try {
      const { html } = await previewDealOfMonth(
        selectedProducts.map((p) => p.id),
        note
      );
      setPreviewHtml(html);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load preview.");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleSend() {
    if (selectedProducts.length === 0) {
      setError("Select at least one product.");
      return;
    }
    if (recipientType === "selected" && selectedCustomers.length === 0) {
      setError("Select at least one customer.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const result = await sendDealOfMonth({
        productIds: selectedProducts.map((p) => p.id),
        recipientType,
        customerIds: recipientType === "selected" ? selectedCustomers.map((c) => c._id) : undefined,
        note,
      });
      onSent(result.message);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send campaign.");
    } finally {
      setSending(false);
    }
  }

  function handleClose() {
    setProductSearch("");
    setSelectedProducts([]);
    setRecipientType("all");
    setCustomerSearch("");
    setSelectedCustomers([]);
    setNote("");
    setPreviewHtml(null);
    setError(null);
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={handleClose} />
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">Deal of the Month Campaign</h2>
          <button onClick={handleClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* Product selection */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-700">Select products</p>
            <div className="relative mt-2">
              <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search products"
                className={`${inputClass} pl-10`}
              />
            </div>

            {selectedProducts.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedProducts.map((p) => (
                  <span key={p.id} className="flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">
                    <Tag size={11} /> {p.name}
                    <button onClick={() => toggleProduct(p)} aria-label={`Remove ${p.name}`} className="text-white/60 hover:text-white">
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="mt-3 grid max-h-56 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
              {products.map((p) => {
                const selected = selectedProducts.some((sp) => sp.id === p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleProduct(p)}
                    className={`flex items-center gap-2 rounded-xl border p-2 text-left transition ${
                      selected ? "border-[#D0F244] bg-[#D0F244]/10" : "border-slate-100 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                      {p.images[0] && <Image src={p.images[0]} alt="" fill className="object-cover" />}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-slate-900">{p.name}</p>
                      <p className="text-[11px] text-slate-500">{formatKes(p.price)}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recipient selection */}
          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-700">Send to</p>
            <div className="mt-2 flex flex-col gap-2">
              <label className="flex items-center gap-2 rounded-xl border border-slate-100 bg-white p-3 text-sm">
                <input
                  type="radio"
                  checked={recipientType === "all"}
                  onChange={() => setRecipientType("all")}
                  className="accent-[#D0F244]"
                />
                Send to ALL Customers
                <span className="ml-auto text-xs text-slate-400">
                  {totalCustomers !== null ? `Sends to ${totalCustomers.toLocaleString()} customers` : ""}
                </span>
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-slate-100 bg-white p-3 text-sm">
                <input
                  type="radio"
                  checked={recipientType === "selected"}
                  onChange={() => setRecipientType("selected")}
                  className="accent-[#D0F244]"
                />
                Select Specific Customers
                {selectedCustomers.length > 0 && (
                  <span className="ml-auto text-xs text-slate-400">{selectedCustomers.length} selected</span>
                )}
              </label>
            </div>

            {recipientType === "selected" && (
              <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                <div className="relative">
                  <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Search customers by name or email"
                    className="w-full rounded-lg border-0 bg-white py-2 pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-[#D0F244]"
                  />
                </div>
                <div className="mt-2 flex max-h-40 flex-col gap-1 overflow-y-auto">
                  {customers.map((c) => {
                    const selected = selectedCustomers.some((sc) => sc._id === c._id);
                    return (
                      <label
                        key={c._id}
                        className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${selected ? "bg-[#D0F244]/20" : "hover:bg-white"}`}
                      >
                        <input type="checkbox" checked={selected} onChange={() => toggleCustomer(c)} className="accent-[#D0F244]" />
                        <span className="min-w-0 flex-1 truncate">
                          <span className="font-medium text-slate-800">{c.name || c.email}</span>
                          <span className="ml-1 text-xs text-slate-400">{c.email}</span>
                        </span>
                        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                          {spendTier(c.totalSpend)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Custom note */}
          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-700">Custom message</p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Enjoy exclusive discounts this month on our best-selling electronics!"
              className={`${inputClass} mt-2`}
            />
          </div>

          {error && <p className="mt-4 text-sm text-sale">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={handlePreview}
            disabled={previewLoading}
            className="flex items-center gap-2 rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            <Eye size={16} />
            {previewLoading ? "Loading…" : "Preview Email"}
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={sending}
            className="rounded-full bg-[#D0F244] px-6 py-3 text-sm font-bold text-slate-950 transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
          >
            {sending ? "Sending…" : "Send Campaign Now"}
          </button>
        </div>
      </div>

      {previewHtml && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4" onClick={() => setPreviewHtml(null)}>
          <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
              <p className="text-sm font-bold text-slate-900">Email preview</p>
              <button onClick={() => setPreviewHtml(null)} aria-label="Close preview" className="text-slate-400 hover:text-slate-700">
                <X size={16} />
              </button>
            </div>
            <iframe title="Email preview" srcDoc={previewHtml} className="h-[70vh] w-full" />
          </div>
        </div>
      )}
    </div>
  );
}
