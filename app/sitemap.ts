import type { MetadataRoute } from "next";
import { BLOG_ARTICLES } from "@/lib/blog-content";
import { getRouteSeoItems } from "@/lib/route-seo";
import { SITE_URL } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const ROUTES_LAST_MODIFIED = now;
  const STATIC_LAST_MODIFIED = new Date("2026-01-01");

  const staticUrls: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1
    },
    {
      url: `${SITE_URL}/mapa`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9
    },
    {
      url: `${SITE_URL}/privacidad`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: "yearly",
      priority: 0.3
    },
    {
      url: `${SITE_URL}/teleferico-uruapan-horario`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.95
    },
    {
      url: `${SITE_URL}/rutas`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.85
    },
    {
      url: `${SITE_URL}/blog`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8
    },
    {
      url: `${SITE_URL}/reportar-error`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5
    }
  ];

  const routeUrls: MetadataRoute.Sitemap = getRouteSeoItems().map((route) => ({
    url: `${SITE_URL}/ruta/${route.slug}`,
    lastModified: ROUTES_LAST_MODIFIED,
    changeFrequency: "monthly",
    priority: 0.7
  }));

  const blogUrls: MetadataRoute.Sitemap = BLOG_ARTICLES.map((article) => ({
    url: `${SITE_URL}/blog/${article.slug}`,
    lastModified: new Date(article.updatedAt),
    changeFrequency: "monthly",
    priority: 0.75
  }));

  return [...staticUrls, ...routeUrls, ...blogUrls];
}
