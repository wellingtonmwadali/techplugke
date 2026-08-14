"use client";

import { useEffect } from "react";
import { CheckCircle2, X } from "lucide-react";

export default function Toast({ message, onDismiss }: { message: string | null; onDismiss: () => void }) {
  useEffect(() => {
    if (!message) return;
    const timeout = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timeout);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-lg">
      <CheckCircle2 size={18} className="shrink-0 text-emerald-500" />
      <p className="text-sm font-medium text-slate-800">{message}</p>
      <button onClick={onDismiss} aria-label="Dismiss" className="text-slate-300 hover:text-slate-600">
        <X size={14} />
      </button>
    </div>
  );
}
