import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/topik";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Halaman sesi dan panel staf tidak perlu diindeks.
        disallow: ["/admin", "/api/", "/profil", "/masuk", "/daftar", "/auth/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
