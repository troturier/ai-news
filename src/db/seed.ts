import { loadEnvFile } from "node:process";
import { sql } from "drizzle-orm";

try {
  loadEnvFile(".env");
} catch {}

const THEMES = [
  { slug: "legislation", icon: "scale", color: "#dc2626",
    names: { fr: "Législation & régulation", en: "Law & regulation" },
    descriptions: { fr: "AI Act, lois nationales, décisions de justice, conformité.", en: "AI Act, national laws, court rulings, compliance." } },
  { slug: "machine-learning", icon: "chart-dots-3", color: "#2563eb",
    names: { fr: "Machine learning", en: "Machine learning" },
    descriptions: { fr: "Méthodes, entraînement, évaluation et nouveautés techniques.", en: "Methods, training, evaluation and technical advances." } },
  { slug: "llm-agents", icon: "robot", color: "#7c3aed",
    names: { fr: "LLM & agents", en: "LLMs & agents" },
    descriptions: { fr: "Modèles de langage, agents, outils et protocoles (MCP…).", en: "Language models, agents, tooling and protocols (MCP…)." } },
  { slug: "open-source", icon: "brand-open-source", color: "#16a34a",
    names: { fr: "Open source", en: "Open source" },
    descriptions: { fr: "Modèles et projets ouverts à forte traction.", en: "Open models and projects with real traction." } },
  { slug: "outils-produits", icon: "tools", color: "#ea580c",
    names: { fr: "Outils & produits", en: "Tools & products" },
    descriptions: { fr: "Lancements et mises à jour de produits d'IA.", en: "AI product launches and updates." } },
  { slug: "ethique-securite", icon: "shield-lock", color: "#0891b2",
    names: { fr: "Éthique & sécurité", en: "Ethics & safety" },
    descriptions: { fr: "Alignement, biais, sécurité, usages malveillants.", en: "Alignment, bias, security, misuse." } },
  { slug: "recherche", icon: "flask", color: "#db2777",
    names: { fr: "Recherche", en: "Research" },
    descriptions: { fr: "Publications et résultats scientifiques marquants.", en: "Notable papers and scientific results." } },
  { slug: "entreprise", icon: "building-skyscraper", color: "#ca8a04",
    names: { fr: "IA & entreprise", en: "AI & business" },
    descriptions: { fr: "Adoption, investissements, marché et métiers.", en: "Adoption, funding, market and jobs." } },
];

async function main() {
  const { db } = await import("./index");
  const { themes } = await import("./schema");
  for (const [position, t] of THEMES.entries()) {
    await db
      .insert(themes)
      .values({ ...t, position })
      .onConflictDoUpdate({
        target: themes.slug,
        set: {
          names: sql`excluded.names`,
          descriptions: sql`excluded.descriptions`,
          icon: sql`excluded.icon`,
          color: sql`excluded.color`,
          position: sql`excluded.position`,
        },
      });
  }
  console.log(`${THEMES.length} themes in the database.`);
  process.exit(0);
}
main();
