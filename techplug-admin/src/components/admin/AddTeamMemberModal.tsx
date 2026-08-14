"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { addTeamMember, STAFF_ROLES, type StaffRole } from "@/lib/team";

const inputClass =
  "w-full rounded-xl border-0 bg-[#F8F8F6] px-4 py-3 text-sm font-medium text-slate-900 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-[#D0F244]";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-700">{children}</label>;
}

const ROLE_DESCRIPTIONS: Record<StaffRole, string> = {
  editor: "Full access to Products, Orders, Customers & Marketing.",
  admin: "Full access to Products, Orders, Customers & Marketing.",
  super_admin: "Everything, including Settings & Team.",
};

export default function AddTeamMemberModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<StaffRole>("editor");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName("");
    setEmail("");
    setRole("editor");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await addTeamMember({ name, email, role });
      reset();
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add team member.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40"
        onClick={() => {
          reset();
          onClose();
        }}
      />
      <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Add Team Member</h2>
          <button
            onClick={() => {
              reset();
              onClose();
            }}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <FieldLabel>Full Name</FieldLabel>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <FieldLabel>Email Address</FieldLabel>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <FieldLabel>Role</FieldLabel>
            <select value={role} onChange={(e) => setRole(e.target.value as StaffRole)} className={inputClass}>
              {STAFF_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-400">{ROLE_DESCRIPTIONS[role]}</p>
          </div>

          <p className="text-xs text-slate-500">
            They&apos;ll get an email with a link to set their password and sign in.
          </p>

          {error && <p className="text-sm text-sale">{error}</p>}

          <div className="mt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                reset();
                onClose();
              }}
              className="rounded-full px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-[#D0F244] px-6 py-2.5 text-sm font-bold text-slate-950 transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
            >
              {submitting ? "Saving…" : "Save & Send Invite"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
