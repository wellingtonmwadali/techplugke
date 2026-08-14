import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import { WishlistProvider } from "@/context/WishlistContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import { SITE_URL } from "@/lib/siteUrl";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
});

const SITE_TITLE = "TechPlug Kenya — Genuine electronics, delivered fast";
const SITE_DESCRIPTION =
  "Phones, laptops, TVs, audio and accessories at honest prices. Shop genuine electronics with countrywide delivery.";

// Site-wide defaults — routes with their own generateMetadata (product/category pages) override
// title/description/openGraph/twitter per-page; metadataBase lets those pages use relative URLs
// (e.g. a relative OG image) and still resolve to absolute ones.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_TITLE, template: `%s | TechPlug Kenya` },
  description: SITE_DESCRIPTION,
  // Favicon comes from src/app/icon.png (Next's file-based icon convention — auto-generates the
  // <link rel="icon"> tags and favicon route), not this metadata field.
  openGraph: {
    type: "website",
    siteName: "TechPlug Kenya",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    images: ["/logo.png"],
  },
  twitter: {
    card: "summary",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${jakarta.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans bg-cream text-ink">
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              <Header />
              <main className="flex-1">{children}</main>
              <Footer />
              <WhatsAppButton />
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
