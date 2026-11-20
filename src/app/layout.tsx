import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import "@/components/loading.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PencatatKunjungan from "@/components/PencatatKunjungan";
import DaftarServiceWorker from "@/components/DaftarServiceWorker";
import { SITE_NAME } from "@/lib/constants";
import { SITE_URL } from "@/lib/topik";

// Skrip anti-kedip: pasang pilihan tema sebelum cat pertama. Dirender inline
// di <head> supaya tidak menunggu hidrasi.
const SKRIP_TEMA = `try{var t=localStorage.getItem("sate-tema");if(t==="gelap"||t==="terang")document.documentElement.setAttribute("data-tema",t);}catch(e){}`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s · ${SITE_NAME}`,
  },
  description:
    "Saat Teduh harian Abbalove Palem — berjalan bersama Tuhan, setiap hari.",
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    siteName: SITE_NAME,
    locale: "id_ID",
    type: "website",
    url: SITE_URL,
    title: SITE_NAME,
    description:
      "Saat Teduh harian Abbalove Palem — berjalan bersama Tuhan, setiap hari.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description:
      "Saat Teduh harian Abbalove Palem — berjalan bersama Tuhan, setiap hari.",
    images: ["/opengraph-image"],
  },
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
      <head>
        <script dangerouslySetInnerHTML={{ __html: SKRIP_TEMA }} />
      </head>
      <body className="flex min-h-full flex-col bg-cream text-tinta">
        {/* Splash pembuka — HTML murni + CSS, hilang sendiri walau JS gagal */}
        <div className="splash" aria-hidden="true">
          <div className="splash-inner">
            <div className="splash-tanda">
              <span className="splash-halo" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-palem.png"
                alt=""
                width={320}
                height={320}
                className="splash-logo"
                fetchPriority="high"
              />
              <span className="splash-cincin" />
            </div>
          </div>
        </div>

        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <PencatatKunjungan />
        <DaftarServiceWorker />
      </body>
    </html>
  );
}
