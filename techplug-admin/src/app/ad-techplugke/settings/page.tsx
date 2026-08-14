"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { CheckCircle2, Plus, Trash2, UserCog, Upload, Mail } from "lucide-react";
import { getSettings, updateSettings, type Settings } from "@/lib/settings";
import {
  getTeam,
  updateTeamMemberRole,
  removeTeamMember,
  resendTeamInvite,
  STAFF_ROLES,
  type TeamMember,
  type StaffRole,
} from "@/lib/team";
import { readLogoAsDataUrl } from "@/lib/uploadImage";
import { useAuth } from "@/context/AuthContext";
import AddTeamMemberModal from "@/components/admin/AddTeamMemberModal";
import Toast from "@/components/admin/Toast";

const inputClass =
  "w-full rounded-xl border-0 bg-[#F8F8F6] px-4 py-3 text-sm font-medium text-slate-900 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-[#D0F244]";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-700">{children}</label>;
}

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-sm"
    >
      <div>
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        <p className="mt-0.5 text-xs text-slate-500">{description}</p>
      </div>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-[#D0F244]" : "bg-slate-200"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  );
}

const ROLE_BADGES: Record<StaffRole, string> = {
  editor: "bg-blue-50 text-blue-700 border-blue-200",
  admin: "bg-violet-50 text-violet-700 border-violet-200",
  super_admin: "bg-amber-50 text-amber-700 border-amber-200",
};

function TeamSection() {
  const [members, setMembers] = useState<TeamMember[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  function load() {
    getTeam()
      .then(setMembers)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load team."));
  }

  useEffect(load, []);

  async function changeRole(member: TeamMember, role: StaffRole) {
    setBusyId(member._id);
    setError(null);
    try {
      const updated = await updateTeamMemberRole(member._id, role);
      setMembers((prev) => (prev ? prev.map((m) => (m._id === member._id ? updated : m)) : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role.");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(member: TeamMember) {
    if (!confirm(`Remove ${member.name || member.email} from the team? They'll lose admin panel access.`)) return;
    setBusyId(member._id);
    setError(null);
    try {
      await removeTeamMember(member._id);
      setMembers((prev) => (prev ? prev.filter((m) => m._id !== member._id) : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove team member.");
    } finally {
      setBusyId(null);
    }
  }

  async function resendInvite(member: TeamMember) {
    setBusyId(member._id);
    setError(null);
    try {
      await resendTeamInvite(member._id);
      setToastMessage(`Invite link resent to ${member.email}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend invite.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto mt-6 max-w-2xl rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Team</h2>
          <p className="mt-1 text-sm text-slate-500">
            Staff with access to this admin panel. Editors &amp; admins can manage everything except Settings &amp; Team.
          </p>
        </div>
        <button
          onClick={() => setAddModalOpen(true)}
          className="flex items-center gap-2 rounded-full bg-[#D0F244] px-5 py-2.5 text-sm font-bold text-slate-950 transition-transform hover:scale-105"
        >
          <Plus size={16} />
          Add
        </button>
      </div>

      {error && <p className="mt-4 text-sm text-sale">{error}</p>}

      <div className="mt-6 flex flex-col gap-2">
        {!members ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : members.length === 0 ? (
          <p className="text-sm text-slate-500">No team members yet.</p>
        ) : (
          members.map((member) => (
            <div
              key={member._id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 p-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-400">
                  <UserCog size={16} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{member.name || "Unnamed"}</p>
                  <span className="block text-xs text-slate-400">{member.email}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={member.role}
                  disabled={busyId === member._id}
                  onChange={(e) => changeRole(member, e.target.value as StaffRole)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold outline-none ${ROLE_BADGES[member.role]}`}
                >
                  {STAFF_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => resendInvite(member)}
                  disabled={busyId === member._id}
                  aria-label="Resend invite link"
                  title="Resend invite link"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                >
                  <Mail size={15} />
                </button>
                <button
                  onClick={() => remove(member)}
                  disabled={busyId === member._id}
                  aria-label="Remove from team"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-rose-50 hover:text-sale disabled:opacity-50"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <AddTeamMemberModal open={addModalOpen} onClose={() => setAddModalOpen(false)} onCreated={load} />
      <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
    </div>
  );
}

export default function AdminSettingsPage() {
  const router = useRouter();
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !isSuperAdmin) {
      router.push("/ad-techplugke");
    }
  }, [authLoading, isSuperAdmin, router]);

  useEffect(() => {
    getSettings()
      .then(setSettings)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load settings."));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await updateSettings({
        shopName: settings.shopName,
        ownerName: settings.ownerName,
        notificationEmail: settings.notificationEmail,
        emailOnNewOrder: settings.emailOnNewOrder,
        emailOnLowStock: settings.emailOnLowStock,
        logoUrl: settings.logoUrl ?? null,
      });
      setSettings(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || !isSuperAdmin) {
    return <p className="text-sm text-slate-500">Loading…</p>;
  }

  if (!settings) {
    return <p className="text-sm text-slate-500">{error || "Loading…"}</p>;
  }

  return (
    <>
    <div className="mx-auto max-w-2xl rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-bold text-slate-900">Shop Settings</h1>
      <p className="mt-1 text-sm text-slate-500">
        Store identity and where order/stock alerts get sent.
      </p>

      <form onSubmit={handleSave} className="mt-8 flex flex-col gap-6">
        <div>
          <FieldLabel>Shop Name</FieldLabel>
          <input
            value={settings.shopName}
            onChange={(e) => setSettings({ ...settings, shopName: e.target.value })}
            className={inputClass}
          />
        </div>

        <div>
          <FieldLabel>Logo</FieldLabel>
          <p className="mb-3 text-[11px] text-slate-400">
            Shown in the storefront header and footer. PNG with a transparent background works best.
          </p>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-[#F8F8F6]">
              {settings.logoUrl ? (
                <Image src={settings.logoUrl} alt="Logo preview" width={64} height={64} unoptimized className="h-full w-full object-contain p-2" />
              ) : (
                <Image src="/logo.png" alt="Default logo" width={64} height={64} className="h-full w-full object-contain p-2" />
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  setLogoUploading(true);
                  setError(null);
                  try {
                    const dataUrl = await readLogoAsDataUrl(file);
                    setSettings((prev) => (prev ? { ...prev, logoUrl: dataUrl } : prev));
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Failed to read logo image.");
                  } finally {
                    setLogoUploading(false);
                  }
                }}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={logoUploading}
                  onClick={() => logoInputRef.current?.click()}
                  className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  <Upload size={13} />
                  {logoUploading ? "Reading…" : settings.logoUrl ? "Replace logo" : "Upload logo"}
                </button>
                {settings.logoUrl && (
                  <button
                    type="button"
                    onClick={() => setSettings((prev) => (prev ? { ...prev, logoUrl: undefined } : prev))}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-500 transition hover:bg-rose-50 hover:text-sale"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div>
          <FieldLabel>Owner Name</FieldLabel>
          <input
            value={settings.ownerName}
            onChange={(e) => setSettings({ ...settings, ownerName: e.target.value })}
            className={inputClass}
          />
        </div>

        <div>
          <FieldLabel>Owner Notification Email</FieldLabel>
          <input
            type="email"
            placeholder="you@example.com"
            value={settings.notificationEmail}
            onChange={(e) => setSettings({ ...settings, notificationEmail: e.target.value })}
            className={inputClass}
          />
          <p className="mt-1 text-[11px] text-slate-400">Where order and stock alerts are sent.</p>
        </div>

        <div className="flex flex-col gap-3">
          <Toggle
            checked={settings.emailOnNewOrder}
            onChange={(v) => setSettings({ ...settings, emailOnNewOrder: v })}
            label="Email me when a new order is placed"
            description="Get notified the moment a customer checks out."
          />
          <Toggle
            checked={settings.emailOnLowStock}
            onChange={(v) => setSettings({ ...settings, emailOnLowStock: v })}
            label="Email me on low stock"
            description={`Alerts when a product drops to 3 units or fewer.`}
          />
        </div>

        {error && <p className="text-sm text-sale">{error}</p>}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-[#D0F244] px-6 py-2.5 text-sm font-bold text-slate-950 transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
          >
            {saving ? "Saving…" : "Save settings"}
          </button>
          {saved && (
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
              <CheckCircle2 size={14} /> Saved
            </span>
          )}
        </div>
      </form>
    </div>
    <TeamSection />
    </>
  );
}
