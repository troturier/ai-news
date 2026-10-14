import type { Locale } from "@/i18n/config";
import { REPO_URL, legal } from "@/lib/legal";

const contactFr = legal.contactEmail ? "par e-mail (adresse affichée dans la section « Éditeur du site »)" : `en ouvrant un ticket sur [${REPO_URL}/issues](${REPO_URL}/issues)`;
const contactEn = legal.contactEmail ? "by e-mail (address shown in the \"Publisher\" section)" : `by opening an issue at [${REPO_URL}/issues](${REPO_URL}/issues)`;

// building, server, copyright, user-shield, database, scale, share, cookie, clock, shield-check
const ICONS = ["building", "server", "copyright", "user-shield", "database", "scale", "share", "cookie", "clock", "shield-check"];

/** « Legal notice and privacy » page content (Markdown; same section/icon convention as the about page). */
export const legalPage: Record<Locale, { title: string; intro: string; body: string; icons: string[]; contact: { label: string; reveal: string; error: string } }> = {
  fr: {
    icons: ICONS,
    contact: { label: "Contact", reveal: "Afficher l'adresse e-mail", error: "Vérification impossible, réessayez." },
    title: "Mentions légales et confidentialité",
    intro: "Informations légales sur l'éditeur du site et sur le traitement de vos données personnelles (RGPD).",
    body: `
## Éditeur du site

- **Site** : AI News
- **Éditeur et directeur de la publication** : ${legal.publisher ?? "particulier, dont l'identité est communiquée à l'hébergeur"}
- **Code source** : [${REPO_URL}](${REPO_URL})

## Hébergement

${legal.host ?? "**OVH SAS**, 2 rue Kellermann, 59100 Roubaix, France ([ovhcloud.com](https://www.ovhcloud.com))."}

Le site est hébergé sur un serveur privé virtuel (VPS) OVHcloud situé à Gravelines (France). Le nom de domaine et sa zone DNS sont également gérés par OVH.

## Contenus et propriété intellectuelle

Les articles sont des **synthèses rédigées par une intelligence artificielle** à partir de sources publiques, qui sont citées en bas de chaque article. Ils peuvent contenir des erreurs : voir la page « À propos ». Les marques, logos, noms de projets et contenus originaux cités appartiennent à leurs titulaires. Les illustrations sont affichées depuis le site source, avec un lien de crédit ; si vous êtes titulaire de droits sur un contenu et souhaitez son retrait, écrivez-nous (${contactFr}) : il sera retiré rapidement.

Les commentaires publiés par les utilisateurs sont sous la responsabilité de leurs auteurs. Chacun peut les signaler ; l'administrateur peut masquer tout contenu illicite ou inapproprié.

## Responsable du traitement

Le responsable du traitement des données personnelles est l'éditeur du site (voir ci-dessus). Pour toute question ou pour exercer vos droits : ${contactFr}.

## Données collectées

- **Compte** : nom, adresse e-mail, mot de passe (conservé uniquement sous forme chiffrée, jamais en clair) ou, si vous utilisez Google, l'identifiant de votre compte Google. Langue et rôle.
- **Usage du service** : thèmes suivis, articles lus, avis « intéressant / pas intéressant », listes de lecture et leur contenu, commentaires, signalements, préférence « masquer les articles lus » et préférence d'envoi du résumé hebdomadaire.
- **Données techniques** : adresse IP et navigateur, associés à votre session de connexion, et journaux techniques du serveur à des fins de sécurité.

La lecture du site sans compte ne nécessite aucune donnée personnelle de votre part.

## Finalités et bases légales

- fournir le service (création et gestion du compte, personnalisation, listes, commentaires) : **exécution du contrat** ;
- sécuriser le service (captcha, limitation d'abus, modération, journaux) : **intérêt légitime** ;
- envoyer les e-mails de service (vérification d'adresse, réinitialisation du mot de passe) : **exécution du contrat** ;
- envoyer le résumé hebdomadaire : **consentement** ; la case est décochée par défaut, vous choisissez de le recevoir à votre première connexion ou depuis votre profil, et vous pouvez retirer votre consentement en un clic depuis chaque e-mail ou depuis votre profil.

Aucune donnée n'est vendue, ni utilisée à des fins publicitaires ou de profilage commercial.

## Destinataires et sous-traitants

Vos données ne sont accessibles qu'à l'administrateur du site et aux prestataires techniques strictement nécessaires :

- **OVH** (hébergeur et gestionnaire DNS) : stockage de la base de données, en France ;
- **Cloudflare** : uniquement le captcha Turnstile lors de l'inscription, de la connexion et de la demande de réinitialisation du mot de passe ;
- **Resend** : envoi des e-mails (adresse e-mail et contenu du message) ;
- **Google** : uniquement si vous choisissez « Continuer avec Google ».

Certains de ces prestataires (Cloudflare, Resend, Google) peuvent traiter des données hors de l'Union européenne ; ces transferts sont encadrés par les mécanismes prévus par le RGPD (clauses contractuelles types, cadre de protection des données UE-États-Unis). Le fournisseur de modèles d'IA (Anthropic) ne reçoit **aucune donnée d'utilisateur** : il n'intervient que dans la production des articles à partir de pages web publiques.

Les sites dont une illustration est affichée peuvent voir l'adresse IP de votre navigateur lorsqu'il charge l'image (l'adresse de la page consultée ne leur est pas transmise).

## Cookies et stockage local

AI News n'utilise **aucun cookie publicitaire ni de mesure d'audience tierce**. Seuls sont déposés des éléments strictement nécessaires ou de confort, qui ne requièrent pas de consentement :

- un **cookie de session** après connexion (d'une durée d'environ sept jours) ;
- un cookie **« hide_read »** (un an) mémorisant l'option « masquer les articles lus » ;
- le **choix du thème** clair ou sombre, stocké dans le navigateur (stockage local) ;
- les éléments techniques du service **Cloudflare Turnstile** sur les pages de connexion et d'inscription.

## Durée de conservation

Vos données de compte et d'usage sont conservées tant que votre compte existe, et **supprimées avec lui**, y compris vos listes, avis et commentaires. Les sessions expirent automatiquement. Les journaux techniques sont conservés pour une durée limitée.

## Vos droits

Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation, d'opposition et de portabilité. Depuis votre **profil**, vous pouvez : modifier vos informations, **exporter toutes vos données** (fichier JSON) et **supprimer votre compte** de façon définitive. Vous pouvez aussi exercer vos droits ${contactFr}. En cas de difficulté, vous pouvez saisir la **CNIL** ([cnil.fr](https://www.cnil.fr)).
`,
  },
  en: {
    icons: ICONS,
    contact: { label: "Contact", reveal: "Show e-mail address", error: "Verification failed, please try again." },
    title: "Legal notice and privacy",
    intro: "Legal information about the site's publisher and about how your personal data is processed (GDPR).",
    body: `
## Publisher

- **Site**: AI News
- **Publisher and publication director**: ${legal.publisher ?? "an individual, whose identity is disclosed to the host"}
- **Source code**: [${REPO_URL}](${REPO_URL})

## Hosting

${legal.host ?? "**OVH SAS**, 2 rue Kellermann, 59100 Roubaix, France ([ovhcloud.com](https://www.ovhcloud.com))."}

The site is hosted on an OVHcloud virtual private server (VPS) located in Gravelines (France). The domain name and its DNS zone are also managed by OVH.

## Content and intellectual property

Articles are **summaries written by artificial intelligence** from public sources, which are cited at the bottom of each article. They may contain errors: see the "About" page. Trademarks, logos, project names and original content mentioned belong to their owners. Illustrations are displayed from the source site, with a credit link; if you own rights in some content and want it removed, write to us (${contactEn}): it will be removed promptly.

Comments posted by users are their authors' responsibility. Anyone can report them; the administrator may hide any unlawful or inappropriate content.

## Data controller

The controller of personal data is the site's publisher (see above). For any question or to exercise your rights: ${contactEn}.

## Data collected

- **Account**: name, e-mail address, password (stored only in hashed form, never in clear) or, if you use Google, your Google account identifier. Language and role.
- **Use of the service**: followed topics, articles read, "interesting / not interesting" ratings, reading lists and their contents, comments, reports, the "hide read articles" preference and the weekly digest preference.
- **Technical data**: IP address and browser, tied to your sign-in session, and server technical logs for security purposes.

Reading the site without an account requires no personal data from you.

## Purposes and legal bases

- providing the service (account creation and management, personalisation, lists, comments): **performance of a contract**;
- securing the service (captcha, abuse limits, moderation, logs): **legitimate interest**;
- sending service e-mails (address verification, password reset): **performance of a contract**;
- sending the weekly digest: **consent**; the box is unticked by default, you choose to receive it at your first sign-in or from your profile, and you can withdraw your consent in one click from every e-mail or from your profile.

No data is sold or used for advertising or commercial profiling.

## Recipients and processors

Your data is accessible only to the site administrator and to the technical providers strictly necessary:

- **OVH** (host and DNS manager): database storage, in France;
- **Cloudflare**: only the Turnstile captcha at sign-up, sign-in and password-reset requests;
- **Resend**: e-mail delivery (e-mail address and message content);
- **Google**: only if you choose "Continue with Google".

Some of these providers (Cloudflare, Resend, Google) may process data outside the European Union; such transfers are covered by the mechanisms provided by the GDPR (standard contractual clauses, EU-US Data Privacy Framework). The AI model provider (Anthropic) receives **no user data**: it is only involved in producing articles from public web pages.

Sites whose illustration is displayed may see your browser's IP address when it loads the image (the address of the page you are viewing is not sent to them).

## Cookies and local storage

AI News uses **no advertising cookies and no third-party analytics**. Only strictly necessary or convenience items are stored, which do not require consent:

- a **session cookie** after sign-in (lasting about seven days);
- a **"hide_read" cookie** (one year) remembering the "hide read articles" option;
- your **light or dark theme choice**, stored in the browser (local storage);
- the technical items of the **Cloudflare Turnstile** service on the sign-in and sign-up pages.

## Retention

Your account and usage data are kept as long as your account exists, and are **deleted with it**, including your lists, ratings and comments. Sessions expire automatically. Technical logs are kept for a limited time.

## Your rights

Under the GDPR you have the rights of access, rectification, erasure, restriction, objection and portability. From your **profile** you can: edit your information, **export all your data** (JSON file) and **permanently delete your account**. You can also exercise your rights ${contactEn}. If you have a problem, you may lodge a complaint with the **CNIL** ([cnil.fr](https://www.cnil.fr)).
`,
  },
};
