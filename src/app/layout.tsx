import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import "@/components/loading.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SITE_NAME } from "@/lib/constants";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: SITE_NAME,
    template: `%s · ${SITE_NAME}`,
  },
  description:
    "Saat Teduh harian Abbalove Palem — berjalan bersama Tuhan, setiap hari.",
  applicationName: SITE_NAME,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Saat Teduh",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#9a4b9e",
};


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-cream text-slate-800">
        {/* Splash pembuka — HTML murni + CSS, hilang sendiri walau JS gagal */}
        <div className="splash" aria-hidden="true">
          <div className="splash-inner">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-palem.png"
              alt=""
              width={140}
              height={140}
              className="splash-logo"
              fetchPriority="high"
            />
            <p className="splash-nama">Abbalove Palem</p>
            <div className="splash-bar">
              <span />
            </div>
            <p className="splash-text">Saat Teduh</p>
          </div>
        </div>

        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
