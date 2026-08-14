"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { formatKes } from "@/lib/format";

const ERROR_MESSAGES: Record<string, string> = {
  "auth/wrong-password": "Incorrect email or password.",
  "auth/invalid-credential": "Incorrect email or password.",
  "auth/user-not-found": "No account found with that email.",
  "auth/email-already-in-use": "An account with this email already exists.",
  "auth/weak-password": "Password should be at least 6 characters.",
  "auth/invalid-email": "Enter a valid email address.",
  "auth/too-many-requests": "Too many attempts. Try again later.",
  "auth/popup-blocked": "Please allow pop-ups for this site and try again.",
};

const SILENT_ERROR_CODES = new Set(["auth/popup-closed-by-user", "auth/cancelled-popup-request"]);

function friendlyError(err: unknown): string | null {
  const code = err instanceof Error ? (err as { code?: string }).code : undefined;
  if (code && SILENT_ERROR_CODES.has(code)) return null;
  if (code && ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
  return "Something went wrong. Please try again.";
}

const EMAIL_PATTERN = /\S+@\S+\.\S+/;
const CANCEL_WINDOW_MS = 10 * 60 * 60 * 1000; // 10 hours, mirrors the server-side window

type Order = {
  _id: string;
  orderNumber: string;
  total: number;
  status: string;
  createdAt: string;
};

function canCancel(order: Order): boolean {
  return order.status === "placed" && Date.now() - new Date(order.createdAt).getTime() < CANCEL_WINDOW_MS;
}

export default function AccountPage() {
  const router = useRouter();
  const { user, loading, signUp, signIn, signInWithGoogle, signOutUser, sendPasswordReset } = useAuth();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [ordersError, setOrdersError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    apiFetch<Order[]>("/api/orders/mine")
      .then(setOrders)
      .catch(() => setOrders([]));
  }, [user]);

  async function cancelOrder(id: string) {
    setCancellingId(id);
    setOrdersError(null);
    try {
      const updated = await apiFetch<Order>(`/api/orders/${id}/cancel`, { method: "PATCH" });
      setOrders((prev) => prev?.map((o) => (o._id === id ? updated : o)) ?? null);
    } catch (err) {
      setOrdersError(err instanceof Error ? err.message : "Failed to cancel order.");
    } finally {
      setCancellingId(null);
    }
  }
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [resetSubmitting, setResetSubmitting] = useState(false);

  const emailHint =
    touched.email && email && !EMAIL_PATTERN.test(email) ? "Enter a valid email address." : null;
  const passwordHint =
    touched.password && password && password.length < 6
      ? "Password should be at least 6 characters."
      : null;
  const confirmHint =
    mode === "signup" && touched.confirmPassword && confirmPassword && confirmPassword !== password
      ? "Passwords don't match."
      : null;

  const isValid =
    email.length > 0 &&
    EMAIL_PATTERN.test(email) &&
    password.length >= 6 &&
    (mode === "signin" ||
      (firstName.trim().length > 0 && lastName.trim().length > 0 && confirmPassword === password));

  function markTouched(field: string) {
    setTouched((t) => ({ ...t, [field]: true }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "signup") {
        await signUp(email, password, `${firstName.trim()} ${lastName.trim()}`.trim());
      } else {
        await signIn(email, password);
      }
      router.push("/");
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleForgotPassword() {
    setError(null);
    setResetMessage(null);
    if (!EMAIL_PATTERN.test(email)) {
      markTouched("email");
      setError("Enter your email above first, then tap “Forgot password” again.");
      return;
    }
    setResetSubmitting(true);
    try {
      await sendPasswordReset(email);
      // Deliberately the same message whether or not the address has an account — avoids
      // leaking which emails are registered.
      setResetMessage("If an account exists for that email, a reset link is on its way.");
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setResetSubmitting(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setSubmitting(true);
    try {
      await signInWithGoogle();
      router.push("/");
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
        <p className="text-sm text-ink/60">Loading…</p>
      </div>
    );
  }

  if (user) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-4 py-24 text-center">
        {user.photoURL && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.photoURL} alt="" className="h-16 w-16 rounded-full" />
        )}
        <h1 className="font-bold tracking-tight text-3xl">{user.displayName || "My Account"}</h1>
        <p className="text-sm text-ink/70">{user.email}</p>
        <button
          onClick={() => signOutUser()}
          className="mt-4 rounded-full bg-ink px-6 py-2.5 text-sm font-semibold text-white"
        >
          Sign out
        </button>

        <div className="mt-10 w-full text-left">
          <h2 className="font-semibold text-xl">Order history</h2>
          {ordersError && <p className="mt-2 text-sm text-sale">{ordersError}</p>}
          {!orders ? (
            <p className="mt-3 text-sm text-ink/60">Loading…</p>
          ) : orders.length === 0 ? (
            <p className="mt-3 text-sm text-ink/60">No orders yet.</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {orders.map((order) => (
                <li
                  key={order._id}
                  className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-soft"
                >
                  <div>
                    <p className="text-sm font-medium">#{order.orderNumber}</p>
                    <p className="text-xs text-ink/60">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatKes(order.total)}</p>
                      <p className="text-xs capitalize text-ink/60">{order.status}</p>
                    </div>
                    {canCancel(order) && (
                      <button
                        onClick={() => cancelOrder(order._id)}
                        disabled={cancellingId === order._id}
                        className="text-xs font-medium text-sale underline disabled:opacity-60"
                      >
                        {cancellingId === order._id ? "Cancelling…" : "Cancel"}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
      <h1 className="font-bold tracking-tight text-3xl">
        {mode === "signin" ? "Sign In" : "Create Account"}
      </h1>
      <p className="text-sm text-ink/70">
        Sign in to track orders, save addresses, and check out faster next time.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 flex w-full flex-col gap-3">
        {mode === "signup" && (
          <div className="flex gap-3">
            <input
              type="text"
              required
              placeholder="First name"
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-1/2 rounded-2xl border hairline bg-cream/60 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-signal"
            />
            <input
              type="text"
              required
              placeholder="Last name"
              autoComplete="family-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-1/2 rounded-2xl border hairline bg-cream/60 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-signal"
            />
          </div>
        )}

        <div className="text-left">
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => markTouched("email")}
            className="w-full rounded-2xl border hairline bg-cream/60 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-signal"
          />
          {emailHint && <p className="mt-1 text-xs text-sale">{emailHint}</p>}
        </div>

        <div className="text-left">
          <input
            type="password"
            required
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => markTouched("password")}
            className="w-full rounded-2xl border hairline bg-cream/60 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-signal"
          />
          {passwordHint && <p className="mt-1 text-xs text-sale">{passwordHint}</p>}
          {mode === "signin" && (
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={resetSubmitting}
              className="mt-1.5 text-xs text-ink/60 underline disabled:opacity-60"
            >
              {resetSubmitting ? "Sending…" : "Forgot password?"}
            </button>
          )}
        </div>

        {mode === "signup" && (
          <div className="text-left">
            <input
              type="password"
              required
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onBlur={() => markTouched("confirmPassword")}
              className="w-full rounded-2xl border hairline bg-cream/60 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-signal"
            />
            {confirmHint && <p className="mt-1 text-xs text-sale">{confirmHint}</p>}
          </div>
        )}

        {resetMessage && <p className="text-sm text-emerald-600">{resetMessage}</p>}
        {error && <p className="text-sm text-sale">{error}</p>}

        <button
          type="submit"
          disabled={submitting || !isValid}
          className="rounded-full bg-signal py-2.5 text-sm font-semibold text-ink disabled:opacity-60"
        >
          {submitting
            ? mode === "signin"
              ? "Signing in…"
              : "Creating account…"
            : mode === "signin"
              ? "Sign In"
              : "Create Account"}
        </button>
      </form>

      <button
        onClick={handleGoogle}
        disabled={submitting}
        className="w-full rounded-full border hairline py-2.5 text-sm font-semibold disabled:opacity-60"
      >
        Continue with Google
      </button>

      <button
        onClick={() => {
          setMode(mode === "signin" ? "signup" : "signin");
          setError(null);
          setResetMessage(null);
        }}
        className="text-sm text-ink/60 underline"
      >
        {mode === "signin" ? "Need an account? Create one" : "Already have an account? Sign in"}
      </button>
    </div>
  );
}
