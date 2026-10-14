/**
 * Identification details of the publisher and the host, read from the environment (never from the repository).
 * Each missing field is simply omitted from the "Legal notice" page.
 */
export const legal = {
  publisher: process.env.LEGAL_PUBLISHER_NAME?.trim() || null, // publisher name (natural person or legal entity)
  contactEmail: process.env.LEGAL_CONTACT_EMAIL?.trim() || null,
  host: process.env.LEGAL_HOST?.trim() || null, // host's "Name, address, phone"
};

export const REPO_URL = "https://github.com/troturier/ai-news";
