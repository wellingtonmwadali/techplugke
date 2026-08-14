import Link from "next/link";
import { AtSign, Camera, MessageCircle, Send, PlaySquare, ShieldCheck, Truck, Wallet } from "lucide-react";
import SiteLogo from "./SiteLogo";

const resourceLinks = [
  "Privacy Policy",
  "Shipping Policy",
  "About Us",
  "Shop Locations",
  "FAQs",
  "Contact Us",
];

// Mirrors the trust-badge row in Header's top bar, so the same "why shop with us" signals
// bookend every page instead of only appearing above the fold.
const trustBadges = [
  { icon: ShieldCheck, label: "Quality Products" },
  { icon: Truck, label: "Countrywide Delivery" },
  { icon: Wallet, label: "Pay via Till: 8744842" },
];

function FooterCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl bg-white/5 p-6 shadow-soft">
      <h3 className="font-display text-lg font-semibold border-b border-white/15 pb-3">{title}</h3>
      <div className="mt-3 text-sm text-white/70">{children}</div>
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="bg-ink text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 border-b border-white/10 py-6 text-xs font-semibold text-white/70 sm:justify-between">
          {trustBadges.map(({ icon: Icon, label }) => (
            <span key={label} className="flex items-center gap-1.5">
              <Icon size={16} className="text-signal" /> {label}
            </span>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-4">
          <div className="rounded-3xl bg-white/5 p-6 shadow-soft">
            <SiteLogo invert />
            <p className="mt-4 text-sm text-white/70 leading-relaxed">
              Genuine phones, laptops, TVs, audio and accessories — sourced for quality,
              backed by warranty, and delivered countrywide.
            </p>
            <a
              href="https://wa.me/254750032818"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-signal px-4 py-2 text-xs font-bold text-ink shadow-soft transition hover:brightness-95"
            >
              <MessageCircle size={15} />
              Chat on WhatsApp
            </a>
          </div>

          <FooterCard title="Resources">
            <ul className="flex flex-col gap-2">
              {resourceLinks.map((link) => (
                <li key={link}>
                  <Link href="#" className="hover:text-signal transition-colors">
                    {link}
                  </Link>
                </li>
              ))}
            </ul>
          </FooterCard>

          <FooterCard title="Contact">
            <div className="flex flex-col gap-1">
              <a href="tel:+254750032818" className="hover:text-signal transition-colors">
                0750 032 818
              </a>
              <a
                href="https://wa.me/254750032818"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-signal transition-colors"
              >
                WhatsApp: 0750 032 818
              </a>
              <a
                href="https://wa.me/254705126180"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-signal transition-colors"
              >
                WhatsApp: 0705 126 180
              </a>
              <a href="mailto:admin@techplugke.co.ke" className="hover:text-signal transition-colors">
                admin@techplugke.co.ke
              </a>
              <p className="mt-2 text-white/50">Payments via M-Pesa Till Number only</p>
              <p className="font-medium text-white/80">Till: 8744842</p>
            </div>
          </FooterCard>

          <FooterCard title="Visit">
            <p className="leading-relaxed">
              TechPlug Kenya Ltd
              <br />
              Nairobi, Kenya
              <br />
              <br />
              Mon–Fri 9:00am–7:30pm
              <br />
              Sunday: Closed
              <br />
              Delivery countrywide
            </p>
          </FooterCard>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row">
          <p className="text-xs text-white/50">© {new Date().getFullYear()} TechPlug Kenya. All rights reserved.</p>
          <div className="flex gap-4 text-white/70">
            <a href="#" aria-label="Facebook" className="hover:text-signal transition-colors"><AtSign size={18} /></a>
            <a href="#" aria-label="Instagram" className="hover:text-signal transition-colors"><Camera size={18} /></a>
            <a href="#" aria-label="X (Twitter)" className="hover:text-signal transition-colors"><Send size={18} /></a>
            <a href="#" aria-label="YouTube" className="hover:text-signal transition-colors"><PlaySquare size={18} /></a>
          </div>
        </div>
      </div>
    </footer>
  );
}
