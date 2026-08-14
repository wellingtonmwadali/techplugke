import Link from "next/link";
import { MessageCircle, Sparkles, Percent } from "lucide-react";

export default function PromoTiles() {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-line bg-white p-4">
        <a
          href="https://wa.me/254750032818"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 py-2 hover:text-signal transition-colors"
        >
          <MessageCircle size={22} className="text-[#25D366]" />
          <div>
            <p className="text-sm font-semibold">WhatsApp</p>
            <p className="text-xs text-ink/60">Text to order</p>
          </div>
        </a>
        <Link
          href="/category/new"
          className="flex items-center gap-3 border-t border-line py-2 pt-3 hover:text-signal transition-colors"
        >
          <Sparkles size={22} className="text-ink/70" />
          <div>
            <p className="text-sm font-semibold">New Arrivals</p>
            <p className="text-xs text-ink/60">Fresh drops weekly</p>
          </div>
        </Link>
        <Link
          href="/category/sale"
          className="flex items-center gap-3 border-t border-line py-2 pt-3 hover:text-signal transition-colors"
        >
          <Percent size={22} className="text-sale" />
          <div>
            <p className="text-sm font-semibold">Sale</p>
            <p className="text-xs text-ink/60">Up to 30% off</p>
          </div>
        </Link>
      </div>

      <Link
        href="/checkout"
        className="flex flex-1 flex-col justify-end rounded-lg bg-signal p-6 text-ink"
      >
        <p className="font-display text-2xl leading-tight">
          Pay via
          <br />
          Till Number
        </p>
        <p className="mt-2 text-sm font-medium">Till: 8744842 · Delivery countrywide</p>
      </Link>
    </div>
  );
}
