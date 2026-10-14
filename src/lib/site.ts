/** Public URL of the site, without trailing "/" (SITE_URL in production, otherwise the auth URL). */
export const siteUrl = (process.env.SITE_URL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
