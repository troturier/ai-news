import { siteUrl } from "./site";
import { unsubscribeToken } from "./digest-token";

export type DigestArticle = { slug: string; title: string; summary: string; theme: string; color: string };

const TEXTS = {
  fr: {
    subject: (n: number) => `AI News : ${n} nouveauté${n > 1 ? "s" : ""} cette semaine`,
    intro: "Voici les articles publiés depuis votre dernier digest, dans les thèmes que vous suivez.",
    read: "Lire l'article",
    manage: "Gérer mes thèmes et mes préférences",
    unsub: "Se désinscrire du digest",
    why: "Vous recevez cet e-mail parce que vous avez un compte sur AI News et suivez des thèmes.",
  },
  en: {
    subject: (n: number) => `AI News: ${n} new article${n > 1 ? "s" : ""} this week`,
    intro: "Here are the articles published since your last digest, in the themes you follow.",
    read: "Read the article",
    manage: "Manage my themes and preferences",
    unsub: "Unsubscribe from the digest",
    why: "You receive this email because you have an AI News account and follow themes.",
  },
} as const;

const esc = (s: string) =>
  s.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Digest e-mail (HTML + text). All content coming from articles is escaped. */
export function buildDigest(opts: { userId: string; lang: "fr" | "en"; articles: DigestArticle[] }) {
  const t = TEXTS[opts.lang];
  const base = `${siteUrl}/${opts.lang}`;
  const unsubscribeUrl = `${base}/unsubscribe?u=${encodeURIComponent(opts.userId)}&t=${unsubscribeToken(opts.userId)}`;
  const oneClickUrl = `${siteUrl}/api/digest/unsubscribe?u=${encodeURIComponent(opts.userId)}&t=${unsubscribeToken(opts.userId)}`;
  const profileUrl = `${base}/profile`;

  const items = opts.articles
    .map((a) => {
      const url = `${base}/articles/${a.slug}`;
      return `<tr><td style="padding:16px 0;border-bottom:1px solid #e5e7eb">
  <div style="font-size:12px;color:${/^#[0-9a-fA-F]{6}$/.test(a.color) ? a.color : "#475569"};font-weight:600">${esc(a.theme)}</div>
  <a href="${esc(url)}" style="font-size:18px;font-weight:600;color:#111827;text-decoration:none">${esc(a.title)}</a>
  <p style="margin:6px 0 8px;font-size:14px;line-height:1.5;color:#374151">${esc(a.summary)}</p>
  <a href="${esc(url)}" style="font-size:14px;color:#2563eb">${t.read} →</a>
</td></tr>`;
    })
    .join("\n");

  const html = `<!doctype html><html lang="${opts.lang}"><body style="margin:0;background:#f9fafb;font-family:-apple-system,Segoe UI,Roboto,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" style="max-width:600px;background:#ffffff;padding:24px;border-radius:8px" cellpadding="0" cellspacing="0">
<tr><td><h1 style="margin:0 0 4px;font-size:22px;color:#111827">AI News</h1><p style="margin:0 0 8px;font-size:14px;color:#6b7280">${t.intro}</p></td></tr>
${items}
<tr><td style="padding-top:20px;font-size:12px;color:#6b7280;line-height:1.6">
${t.why}<br><a href="${esc(profileUrl)}" style="color:#6b7280">${t.manage}</a> · <a href="${esc(unsubscribeUrl)}" style="color:#6b7280">${t.unsub}</a>
</td></tr></table></td></tr></table></body></html>`;

  const text = [
    t.intro,
    "",
    ...opts.articles.map((a) => `${a.theme}\n${a.title}\n${a.summary}\n${base}/articles/${a.slug}\n`),
    `${t.manage}: ${profileUrl}`,
    `${t.unsub}: ${unsubscribeUrl}`,
  ].join("\n");

  return {
    subject: t.subject(opts.articles.length),
    html,
    text,
    // RFC 8058 headers: one-click unsubscribe from the mail client.
    headers: {
      "List-Unsubscribe": `<${oneClickUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  };
}
