"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import DealOfMonthModal from "@/components/admin/DealOfMonthModal";
import Toast from "@/components/admin/Toast";

export default function AdminMarketingPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Marketing</h1>
      <p className="mt-1 text-sm text-slate-500">Send campaigns and one-off customer emails.</p>

      <div className="mt-6 flex items-center justify-between rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <div>
          <p className="text-sm font-semibold text-slate-900">Deal of the Month</p>
          <p className="mt-1 text-sm text-slate-500">Pick featured products and email your customers about them.</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 rounded-full bg-[#D0F244] px-6 py-2.5 text-sm font-bold text-slate-950 transition-transform hover:scale-105"
        >
          <Sparkles size={16} />
          New Campaign
        </button>
      </div>

      <DealOfMonthModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSent={(message) => setToastMessage(message)}
      />
      <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
    </div>
  );
}
