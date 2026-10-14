import type { Locale } from "@/i18n/config";
import { REPO_URL } from "@/lib/legal";

// target, robot, world, alert-triangle, user-check, brand-github
const ICONS = ["target", "robot", "world", "alert-triangle", "user-check", "brand-github"];

/** « About » page content (Markdown; each `##` heading starts a section, `icons` gives one Tabler icon per section). */
export const about: Record<Locale, { title: string; intro: string; body: string; icons: string[] }> = {
  fr: {
    icons: ICONS,
    title: "À propos",
    intro: "AI News est une veille sur l'intelligence artificielle, bilingue (français / anglais), rédigée automatiquement chaque semaine à partir de sources vérifiables.",
    body: `
## À quoi ça sert

Suivre l'actualité de l'IA demande de trier un flux énorme d'annonces, de publications et de dépôts de code. AI News fait ce tri : chaque semaine, quelques sujets réellement marquants par thème, résumés en quelques minutes de lecture, avec les liens vers les sources originales. La lecture est publique ; un compte permet de personnaliser le suivi (voir plus bas).

## Comment sont produits les articles

Une exécution automatique a lieu **chaque lundi**. Pour chacun des huit thèmes (législation et régulation, machine learning, LLM et agents, open source, outils et produits, éthique et sécurité, recherche, IA et entreprise) :

1. **Recherche.** Un modèle d'IA (Claude, d'Anthropic) parcourt le web à la recherche des actualités de la semaine. Il doit privilégier les **sources primaires** (blog ou communiqué officiel, dépôt de code, publication scientifique, texte de loi) ou, à défaut, un média sérieux. Les agrégateurs, newsletters et récapitulatifs « de la semaine » ne sont pas retenus comme source principale. Pour un sujet qui n'est pas un projet de code, au moins deux autres sites indépendants doivent en parler.
2. **Filtre de popularité.** Ce filtre n'est pas laissé au jugement du modèle : il est vérifié par du code. Un projet GitHub doit avoir au moins 1 000 étoiles, ne pas être archivé et avoir reçu une modification dans les 90 derniers jours (pour éviter de mettre en avant des projets abandonnés). Les autres sujets reçoivent un score fondé sur le poids des sources (officielle, grand média, autre), le nombre de sites indépendants qui les reprennent et leur audience sur Hacker News. Sous un seuil, le sujet est écarté.
3. **Rédaction et traduction.** Un modèle rédige l'article à partir des sources collectées, puis le traduit : chaque article existe en français et en anglais. Les sources utilisées figurent en bas de chaque article.
4. **Illustration.** L'image affichée est celle que la source publie pour son propre partage (image Open Graph) ou l'avatar du projet GitHub. Elle n'est jamais copiée : elle est affichée depuis la source, avec un lien de crédit.
5. **Publication.** Elle est **automatique** : il n'y a pas de relecture humaine avant la mise en ligne. Un même sujet n'est jamais publié deux fois (déduplication sur l'adresse de la source principale).

## Sources

Les articles s'appuient sur des pages web publiques consultées au moment de la rédaction. Les sources les plus pondérées sont les sites officiels des acteurs du secteur (laboratoires et entreprises d'IA, plateformes de code, revues et serveurs de prépublications, institutions et autorités comme l'Union européenne, la CNIL ou le NIST), puis les grands médias généralistes et spécialisés. Les sources de chaque article sont listées avec leur éditeur ; cliquez-les pour vérifier.

## Les limites à connaître

- Les articles sont **générés par une IA** : malgré le recours à des sources et à des filtres, une erreur, une approximation ou une omission est possible. Ne vous fiez pas à un résumé pour une décision importante : vérifiez la source.
- Il s'agit d'un résumé et non d'une reproduction : les contenus d'origine restent la propriété de leurs auteurs.
- Le bouton **Signaler** présent sur chaque article et chaque commentaire permet d'alerter l'administrateur, qui peut masquer un contenu.
- Le contenu suit le rythme hebdomadaire : AI News n'est pas un fil d'actualité en continu.

## Ce que vous pouvez faire avec un compte

- choisir les **thèmes** qui vous intéressent (à la première connexion, puis depuis le profil) ;
- suivre vos **lectures** (badge « Lu » / « Non lu », masquer les articles déjà lus) ;
- indiquer si un article est **intéressant** ou non, et le **commenter** ;
- ranger les articles dans des **listes de lecture** personnalisées (nom, couleur, icône, ordre), dont « À lire plus tard » ;
- exporter un article ou une liste en **Markdown** (par exemple pour Obsidian) ;
- recevoir un **résumé hebdomadaire par e-mail** (activé par défaut, désinscription en un clic) ;
- exporter ou supprimer vos données depuis le profil.

Sans compte, vous pouvez lire tous les articles, rechercher, suivre le **flux RSS** (\`/fr/feed.xml\`) et choisir le thème clair ou sombre.

## Un projet ouvert

AI News est un projet personnel dont le code est public : [${REPO_URL}](${REPO_URL}). Les suggestions et signalements de bugs y sont les bienvenus. Le coût de fonctionnement est volontairement maîtrisé (exécution hebdomadaire, modèles économiques, recherches limitées).
`,
  },
  en: {
    icons: ICONS,
    title: "About",
    intro: "AI News is a bilingual (French / English) AI watch, written automatically every week from verifiable sources.",
    body: `
## What it is for

Keeping up with AI means sorting through a huge flow of announcements, papers and code repositories. AI News does that sorting: each week, a few genuinely significant stories per topic, summarised in a few minutes of reading, with links to the original sources. Reading is public; an account lets you personalise your follow-up (see below).

## How articles are produced

An automated run takes place **every Monday**. For each of the eight topics (law and regulation, machine learning, LLMs and agents, open source, tools and products, ethics and safety, research, AI and business):

1. **Search.** An AI model (Claude, by Anthropic) browses the web for the week's news. It must favour **primary sources** (official blog or press release, code repository, scientific paper, legal text) or, failing that, a reputable outlet. Aggregators, newsletters and "weekly roundups" are not accepted as the main source. For a story that is not a code project, at least two other independent sites must cover it.
2. **Popularity filter.** This filter is not left to the model's judgement: it is checked by code. A GitHub project must have at least 1,000 stars, must not be archived and must have been updated within the last 90 days (to avoid promoting abandoned projects). Other stories get a score based on the weight of their sources (official, major outlet, other), the number of independent sites covering them and their traction on Hacker News. Below a threshold, the story is dropped.
3. **Writing and translation.** A model writes the article from the collected sources, then translates it: every article exists in French and in English. The sources used are listed at the bottom of each article.
4. **Illustration.** The image shown is the one the source publishes for its own sharing (Open Graph image) or the GitHub project's avatar. It is never copied: it is displayed from the source, with a credit link.
5. **Publication.** It is **automatic**: there is no human review before going live. The same story is never published twice (deduplication on the main source's address).

## Sources

Articles rely on public web pages read at writing time. The most heavily weighted sources are the official sites of the field's players (AI labs and companies, code platforms, journals and preprint servers, institutions and authorities such as the European Union, the CNIL or NIST), followed by major general and specialist media. Each article lists its sources with their publisher; click through to check them.

## Limits to keep in mind

- Articles are **AI-generated**: despite sourcing rules and filters, an error, approximation or omission is possible. Do not rely on a summary for an important decision: check the source.
- It is a summary, not a reproduction: the original content remains the property of its authors.
- The **Report** button on every article and comment lets you alert the administrator, who can hide a piece of content.
- Content follows the weekly rhythm: AI News is not a continuous news feed.

## What you can do with an account

- choose the **topics** you care about (on first sign-in, then from your profile);
- track your **reading** ("Read" / "Unread" badge, hide articles already read);
- mark an article as **interesting** or not, and **comment** on it;
- sort articles into custom **reading lists** (name, colour, icon, order), including "Read later";
- export an article or a list as **Markdown** (for Obsidian, for example);
- receive a **weekly e-mail digest** (on by default, one-click unsubscribe);
- export or delete your data from your profile.

Without an account you can read every article, search, follow the **RSS feed** (\`/en/feed.xml\`) and choose the light or dark theme.

## An open project

AI News is a personal project whose code is public: [${REPO_URL}](${REPO_URL}). Suggestions and bug reports are welcome there. Running costs are deliberately kept low (weekly run, economical models, limited searches).
`,
  },
};
