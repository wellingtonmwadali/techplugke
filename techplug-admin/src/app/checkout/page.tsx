"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Smartphone, CheckCircle2, Lock, ArrowUpRight } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { formatKes } from "@/lib/format";
import { apiFetch } from "@/lib/api";
import MpesaCheckoutModal from "@/components/MpesaCheckoutModal";
import { describeVariantOptions, resolvePrice } from "@/lib/variants";

const TILL_NUMBER = "8744842";

type Contact = {
  name: string;
  phone: string;
  email: string;
  address: string;
  town: string;
  notes: string;
};

const SHIPPING_FEE = 300;
const EMAIL_PATTERN = /\S+@\S+\.\S+/;

export default function CheckoutPage() {
  const { user, loading: authLoading } = useAuth();
  const { lines, subtotal, clearCart, getProduct } = useCart();
  const [contact, setContact] = useState<Contact>({
    name: "",
    phone: "",
    email: "",
    address: "",
    town: "",
    notes: "",
  });
  const [emailTouched, setEmailTouched] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mpesaOpen, setMpesaOpen] = useState(false);
  const [paidTotal, setPaidTotal] = useState(0);

  const emailHint =
    emailTouched && contact.email && !EMAIL_PATTERN.test(contact.email)
      ? "Enter a valid email address."
      : null;

  function updateContact(key: keyof Contact, value: string) {
    setContact((c) => ({ ...c, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const items = lines
      .map((line) => {
        const product = getProduct(line.productId);
        if (!product) return null;
        return {
          productId: product.id,
          name: product.name,
          // Optimistic — the server always re-resolves this authoritatively from the product's
          // variants (routes/orders.ts), so a stale/tampered price here can't affect the order.
          price: resolvePrice(product, line.variantOptions),
          color: line.color,
          variantOptions: line.variantOptions,
          quantity: line.quantity,
          image: product.images[0],
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    try {
      const order = await apiFetch<{ id: string; orderNumber: string }>("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          items,
          contact,
          paymentMethod: "till",
        }),
      });
      setOrderId(order.id);
      setOrderNumber(order.orderNumber);
      setPaidTotal(subtotal + SHIPPING_FEE);
      clearCart();
      setPlaced(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-24 text-center">
        <p className="text-sm text-ink/60">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-24 text-center">
        <h1 className="font-bold tracking-tight text-2xl">Sign in to check out</h1>
        <p className="text-sm text-ink/70">
          You&apos;ll need an account so you can track your order and cancel it if needed.
        </p>
        <Link
          href="/account"
          className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-signal px-6 py-2.5 text-sm font-semibold text-ink shadow-soft transition hover:brightness-95"
        >
          Sign in / Create account <ArrowUpRight size={16} />
        </Link>
      </div>
    );
  }

  if (placed) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-24 text-center">
        <CheckCircle2 size={48} className="text-signal" />
        <h1 className="font-bold tracking-tight text-3xl">Order confirmed</h1>
        <p className="text-sm text-ink/70">
          {orderNumber && <>Order #{orderNumber} — </>}
          pay via M-Pesa Till Number <strong>{TILL_NUMBER}</strong> to complete your order.
          Estimated delivery in 2–4 business days, countrywide.
        </p>

        {orderId && (
          <button
            onClick={() => setMpesaOpen(true)}
            className="mt-2 flex items-center gap-2 rounded-full bg-[#00A859] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#008f4c]"
          >
            <Smartphone size={16} />
            Pay now via M-Pesa
          </button>
        )}

        <Link
          href="/"
          className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-signal px-6 py-2.5 text-sm font-semibold text-ink shadow-soft transition hover:brightness-95"
        >
          Continue shopping <ArrowUpRight size={16} />
        </Link>

        {orderId && (
          <MpesaCheckoutModal
            open={mpesaOpen}
            onClose={() => setMpesaOpen(false)}
            onViewOrder={() => setMpesaOpen(false)}
            orderId={orderId}
            total={paidTotal}
            defaultPhone={contact.phone}
          />
        )}
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-24 text-center">
        <h1 className="font-bold tracking-tight text-2xl">Your bag is empty</h1>
        <p className="text-sm text-ink/70">Add something to your bag before checking out.</p>
        <Link
          href="/"
          className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-signal px-6 py-2.5 text-sm font-semibold text-ink shadow-soft transition hover:brightness-95"
        >
          Start shopping <ArrowUpRight size={16} />
        </Link>
      </div>
    );
  }

  const total = subtotal + SHIPPING_FEE;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 pb-28 sm:px-6 lg:px-8 lg:pb-10">
      <h1 className="font-bold tracking-tight text-3xl">Checkout</h1>

      <form className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-6">
          <section className="rounded-3xl bg-white p-6 shadow-soft">
            <h2 className="font-semibold text-xl">Contact & delivery</h2>
            <p className="mt-1 text-sm text-ink/60">We deliver countrywide.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field
                label="Full name"
                required
                autoComplete="name"
                value={contact.name}
                onChange={(v) => updateContact("name", v)}
              />
              <Field
                label="Phone number"
                type="tel"
                required
                autoComplete="tel"
                value={contact.phone}
                onChange={(v) => updateContact("phone", v)}
              />
              <Field
                label="Email"
                type="email"
                required
                autoComplete="email"
                className="sm:col-span-2"
                value={contact.email}
                onChange={(v) => updateContact("email", v)}
                onBlur={() => setEmailTouched(true)}
                hint={emailHint}
              />
              <Field
                label="Delivery address"
                required
                autoComplete="street-address"
                className="sm:col-span-2"
                value={contact.address}
                onChange={(v) => updateContact("address", v)}
              />
              <Field
                label="Town / Area"
                required
                autoComplete="address-level2"
                value={contact.town}
                onChange={(v) => updateContact("town", v)}
              />
              <Field
                label="Delivery notes (optional)"
                required={false}
                value={contact.notes}
                onChange={(v) => updateContact("notes", v)}
              />
            </div>
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-soft">
            <h2 className="font-semibold text-xl">Payment method</h2>
            <div className="mt-4 flex items-start gap-4 rounded-2xl bg-ink p-4 text-white">
              <Smartphone size={20} className="mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">M-Pesa Till Number</p>
                <p className="mt-1 text-sm text-white/70">
                  Go to M-Pesa &gt; Lipa na M-Pesa &gt; Buy Goods and Services, enter Till
                  Number <strong>{TILL_NUMBER}</strong>, then the amount shown at checkout.
                </p>
                <p className="mt-2 text-xs text-white/50">This is currently our only payment method.</p>
              </div>
            </div>
          </section>
        </div>

        <aside className="h-fit rounded-3xl bg-white p-6 shadow-soft">
          <h2 className="font-semibold text-lg">Order summary</h2>
          <ul className="mt-4 flex flex-col gap-4">
            {lines.map((line) => {
              const product = getProduct(line.productId);
              if (!product) return null;
              return (
                <li
                  key={`${line.productId}-${line.color}-${describeVariantOptions(line.variantOptions)}`}
                  className="flex gap-3"
                >
                  <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-xl bg-cream">
                    <Image src={product.images[0]} alt={product.name} fill className="object-cover" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium leading-tight">{product.name}</p>
                    <p className="text-xs text-ink/60">
                      {[line.color, describeVariantOptions(line.variantOptions)].filter(Boolean).join(" · ")}
                      {line.color || line.variantOptions ? " · " : ""}Qty {line.quantity}
                    </p>
                  </div>
                  <p className="text-sm font-medium">
                    {formatKes(resolvePrice(product, line.variantOptions) * line.quantity)}
                  </p>
                </li>
              );
            })}
          </ul>

          <div className="mt-6 flex flex-col gap-2 border-t hairline pt-4 text-sm">
            <div className="flex justify-between text-ink/70">
              <span>Subtotal</span>
              <span>{formatKes(subtotal)}</span>
            </div>
            <div className="flex justify-between text-ink/70">
              <span>Shipping</span>
              <span>{formatKes(SHIPPING_FEE)}</span>
            </div>
            <div className="flex justify-between font-semibold text-lg pt-2">
              <span>Total</span>
              <span>{formatKes(total)}</span>
            </div>
          </div>

          {error && <p className="mt-4 text-sm text-sale">{error}</p>}

          <button
            type="submit"
            disabled={submitting || Boolean(emailHint)}
            className="mt-6 hidden w-full rounded-full bg-signal py-3.5 text-sm font-semibold text-ink hover:brightness-95 transition disabled:opacity-60 lg:block"
          >
            {submitting ? "Placing order…" : "Place order"}
          </button>

          <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-ink/50">
            <Lock size={12} />
            Secure checkout · SSL encrypted
          </p>
        </aside>

        <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-4 rounded-t-3xl bg-white px-4 py-3 shadow-soft lg:hidden">
          <div>
            <p className="text-xs text-ink/60">Total</p>
            <p className="font-semibold text-lg">{formatKes(total)}</p>
          </div>
          <button
            type="submit"
            disabled={submitting || Boolean(emailHint)}
            className="rounded-full bg-signal px-8 py-3 text-sm font-semibold text-ink hover:brightness-95 transition disabled:opacity-60"
          >
            {submitting ? "Placing order…" : "Place order"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  type = "text",
  required,
  className = "",
  value,
  onChange,
  onBlur,
  autoComplete,
  hint,
}: {
  label: string;
  type?: string;
  required?: boolean;
  className?: string;
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  autoComplete?: string;
  hint?: string | null;
}) {
  return (
    <label className={`flex flex-col gap-1.5 text-sm ${className}`}>
      <span className="font-medium">
        {label}
        {required && <span className="text-sale"> *</span>}
      </span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        onBlur={onBlur}
        autoComplete={autoComplete}
        className="rounded-2xl border hairline bg-cream/60 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-signal"
      />
      {hint && <span className="text-xs text-sale">{hint}</span>}
    </label>
  );
}
