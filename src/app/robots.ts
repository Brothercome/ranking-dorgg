import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_URL ?? "https://ranking-dorgg.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/share/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
