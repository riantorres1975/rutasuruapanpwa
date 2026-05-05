const DEFAULT_SITE_URL = "https://www.urugo.app";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || DEFAULT_SITE_URL).replace(
  /\/+$/,
  ""
);
