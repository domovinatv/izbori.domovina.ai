import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin", "latin-ext"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://izbori.domovina.ai"),
  title: {
    default: "Izbori — DOMOVINA.ai",
    template: "%s — Izbori · DOMOVINA.ai",
  },
  description:
    "Rezultati hrvatskih izbora iz službene arhive DIP-a: parlamentarni, predsjednički, europski i lokalni izbori — mandati, karte po županijama, preferencijalni glasovi.",
  openGraph: {
    title: "Izbori — DOMOVINA.ai",
    description:
      "Rezultati hrvatskih izbora iz službene arhive DIP-a — mandati, karte po županijama, preferencijalni glasovi.",
    url: "https://izbori.domovina.ai",
    siteName: "Izbori — DOMOVINA.ai",
    locale: "hr_HR",
    type: "website",
  },
  twitter: { card: "summary", title: "Izbori — DOMOVINA.ai" },
  icons: { icon: "/logo.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="hr" className={`${inter.variable} ${playfair.variable}`}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
