import type { MetadataRoute } from "next";
import { BLOG_ARTICLES } from "@/lib/blog-content";
import { getRouteSeoItems } from "@/lib/route-seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://rutasuruapanpwa.vercel.app";
  const now = new Date();

  const staticUrls: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1
    },
    {
      url: `${baseUrl}/mapa`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9
    },
    {
      url: `${baseUrl}/privacidad`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3
    },
    {
      url: `${baseUrl}/teleferico-uruapan-horario`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.95
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8
    }
  ];

  const routeUrls: MetadataRoute.Sitemap = getRouteSeoItems().map((route) => ({
    url: `${baseUrl}/ruta/${route.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.7
  }));

  const blogUrls: MetadataRoute.Sitemap = BLOG_ARTICLES.map((article) => ({
    url: `${baseUrl}/blog/${article.slug}`,
    lastModified: new Date(article.updatedAt),
    changeFrequency: "monthly",
    priority: 0.75
  }));

  return [...staticUrls, ...routeUrls, ...blogUrls];
}
