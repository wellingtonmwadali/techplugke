"use client";

import { useEffect, useRef, useState } from "react";
import { Smartphone, X, CheckCircle2, ShieldCheck } from "lucide-react";
import { formatKes } from "@/lib/format";
import { initiateStkPush, getOrderPaymentStatus } from "@/lib/payments";

const TILL_NUMBER = "8744842";
const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 90_000;

type Stage = "trigger" | "waiting" | "timeout" | "success";

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7) return phone;
  return `${digits.slice(0, 4)}***${digits.slice(-3)}`;
}

export default function MpesaCheckoutModal({
  open,
  onClose,
  onViewOrder,
  orderId,
  total,
  defaultPhone = "",
}: {
  open: boolean;
  onClose: () => void;
  onViewOrder: () => void;
  orderId: string;
  total: number;
  defaultPhone?: string;
}) {
  const [stage, setStage] = useState<Stage>("trigger");
  const [phone, setPhone] = useState(defaultPhone);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receiptNumber, setReceiptNumber] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Resets on close (a real event handler) rather than on open via an effect — leaves the modal
  // in a fresh "trigger" state the next time it's opened, without a setState-in-effect cascade.
  function handleClose() {
    if (pollRef.current) clearInterval(pollRef.current);
    setStage("trigger");
    setPhone(defaultPhone);
    setError(null);
    setReceiptNumber(null);
    onClose();
  }

  function handleViewOrder() {
    handleClose();
    onViewOrder();
  }

  useEffect(() => {
    if (stage !== "waiting") return;

    const startedAt = Date.now();
    pollRef.current = setInterval(async () => {
      if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        if (pollRef.current) clearInterval(pollRef.current);
        setStage("timeout");
        return;
      }
      try {
        const result = await getOrderPaymentStatus(orderId);
        if (result.paymentStatus === "paid") {
          if (pollRef.current) clearInterval(pollRef.current);
          setReceiptNumber(result.mpesaReceiptNumber ?? null);
          setStage("success");
        } else if (result.paymentStatus === "failed") {
          if (pollRef.current) clearInterval(pollRef.current);
          setError("Payment failed or was cancelled. You can try again.");
          setStage("trigger");
        }
      } catch {
        // Transient network hiccup — keep polling, the interval will retry.
      }
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [stage, orderId]);

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await initiateStkPush(orderId, phone);
      setStage("waiting");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send payment prompt.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={stage === "waiting" ? undefined : handleClose} />
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-xl">
        {stage !== "waiting" && (
          <button
            onClick={handleClose}
            aria-label="Close"
            className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-slate-500 hover:bg-white hover:text-slate-800"
          >
            <X size={18} />
          </button>
        )}

        {stage === "trigger" && (
          <>
            <div className="bg-[#00A859] px-6 py-8 text-white">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wide">
                M-Pesa
              </span>
              <p className="mt-3 text-sm font-medium text-white/80">Buy Goods Till: {TILL_NUMBER}</p>
              <p className="mt-1 text-3xl font-extrabold">{formatKes(total)}</p>
            </div>

            <form onSubmit={handlePay} className="flex flex-col gap-4 p-6">
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-slate-700">Phone number</span>
                <div className="relative">
                  <Smartphone size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="07XX XXX XXX or 01XX XXX XXX"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none focus:ring-2 focus:ring-[#00A859]"
                  />
                </div>
              </label>

              {error && <p className="text-sm text-rose-600">{error}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#00A859] py-3.5 text-sm font-bold text-white transition hover:bg-[#008f4c] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Smartphone size={16} />
                {submitting ? "Sending prompt…" : `Pay ${formatKes(total)} via M-Pesa`}
              </button>
              <p className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
                <ShieldCheck size={12} /> Secured by Safaricom M-Pesa
              </p>
            </form>
          </>
        )}

        {(stage === "waiting" || stage === "timeout") && (
          <div className="flex flex-col items-center gap-4 px-6 py-10 text-center">
            <div className="relative flex h-20 w-20 items-center justify-center">
              {stage === "waiting" && (
                <span className="absolute inset-0 animate-ping rounded-full bg-[#00A859]/30" />
              )}
              <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[#00A859]/10 text-[#00A859]">
                <Smartphone size={28} />
              </span>
            </div>

            {stage === "waiting" ? (
              <>
                <p className="text-base font-semibold text-slate-900">
                  Check your phone! A prompt has been sent to <strong>{maskPhone(phone)}</strong>.
                </p>
                <ol className="w-full space-y-2 rounded-2xl bg-slate-50 p-4 text-left text-sm text-slate-600">
                  <li>1. Enter your M-Pesa PIN.</li>
                  <li>
                    2. Confirm amount <strong>{formatKes(total)}</strong> to <strong>TechPlug Kenya (Till {TILL_NUMBER})</strong>.
                  </li>
                  <li>3. Keep this screen open; it will auto-update upon receipt.</li>
                </ol>
              </>
            ) : (
              <>
                <p className="text-base font-semibold text-slate-900">Still waiting on confirmation…</p>
                <p className="text-sm text-slate-500">
                  This is taking longer than usual. You can keep waiting, or pay manually via Till Number{" "}
                  <strong>{TILL_NUMBER}</strong> and we&apos;ll confirm it shortly after.
                </p>
                <button
                  onClick={() => setStage("waiting")}
                  className="mt-2 rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Keep waiting
                </button>
              </>
            )}
          </div>
        )}

        {stage === "success" && (
          <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
            <CheckCircle2 size={56} className="text-emerald-500" />
            <h2 className="text-xl font-bold text-slate-900">Payment Successful! 🎉</h2>
            {receiptNumber && (
              <span className="rounded-full bg-emerald-50 px-4 py-1.5 text-sm font-bold text-emerald-700">
                Receipt: {receiptNumber}
              </span>
            )}
            <p className="text-sm text-slate-500">A confirmation email has been sent to your inbox.</p>
            <button
              onClick={handleViewOrder}
              className="mt-3 w-full rounded-full bg-[#D0F244] py-3 text-sm font-bold text-slate-950 transition-transform hover:scale-105"
            >
              View Order Summary
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
