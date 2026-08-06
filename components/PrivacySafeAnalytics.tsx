"use client";

import { Analytics } from "@vercel/analytics/next";

const SENSITIVE_QUERY_PARAMS = new Set([
  "a",
  "b",
  "destino",
  "ia",
  "ib",
  "tas",
  "tax",
  "tbx",
  "tbe",
]);

export default function PrivacySafeAnalytics() {
  return (
    <Analytics
      beforeSend={(event) => {
        const url = new URL(event.url);
        for (const key of SENSITIVE_QUERY_PARAMS) {
          url.searchParams.delete(key);
        }
        return { ...event, url: url.toString() };
      }}
    />
  );
}
