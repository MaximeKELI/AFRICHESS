import type { LegalDocument } from "./types";

export const PRIVACY_FR: LegalDocument = {
  title: "Politique de confidentialité",
  updated: "4 juin 2026",
  version: "1.0",
  intro:
    "La présente politique explique comment AFRICHESS collecte, utilise, conserve et protège vos données personnelles lorsque vous utilisez notre plateforme d'échecs en ligne. Nous nous engageons à un traitement transparent, sécurisé et conforme au Règlement général sur la protection des données (RGPD). Certaines fonctionnalités, notamment les parties classées et le programme Fair Play, requièrent un consentement explicite distinct que vous pouvez retirer à tout moment.",
  sections: [
    {
      id: "introduction",
      title: "Introduction",
      blocks: [
        {
          type: "p",
          text: "La présente politique de confidentialité (« Politique ») explique comment AFRICHESS (« nous », « notre », « la Plateforme ») collecte, utilise, conserve, partage et protège vos données personnelles lorsque vous utilisez :",
        },
        {
          type: "ul",
          items: [
            "le site web AFRICHESS (interface Next.js) ;",
            "l'application mobile AFRICHESS ;",
            "l'API et les services associés (parties en ligne, matchmaking, apprentissage, tournois, abonnements Premium, etc.).",
          ],
        },
        {
          type: "p",
          text: "AFRICHESS est une plateforme d'échecs en ligne. Nous nous engageons à traiter vos données de manière transparente, sécurisée et conforme au Règlement général sur la protection des données (RGPD — UE 2016/679) et, le cas échéant, aux lois nationales applicables en matière de protection des données.",
        },
        {
          type: "p",
          text: "En créant un compte ou en utilisant la Plateforme, vous reconnaissez avoir pris connaissance de la présente Politique. Certaines fonctionnalités (notamment les parties classées et le programme Fair Play) nécessitent un consentement explicite distinct, que vous pouvez retirer à tout moment.",
        },
      ],
    },
    {
      id: "responsable",
      title: "Responsable du traitement",
      blocks: [
        {
          type: "table",
          headers: ["Champ", "Valeur"],
          rows: [
            ["Responsable", "Maxime Dzidula KELI — AFRICHESS"],
            ["Contact général", "WhatsApp +33 7 54 83 00 39"],
            ["Contact données personnelles", "privacy@africhess.com"],
          ],
        },
        {
          type: "p",
          text: "Pour toute question relative à vos données personnelles, à l'exercice de vos droits ou à la présente Politique, vous pouvez nous contacter via les coordonnées ci-dessus.",
        },
      ],
    },
    {
      id: "donnees-collectees",
      title: "Données que nous collectons",
      blocks: [
        {
          type: "p",
          text: "Nous collectons uniquement les données nécessaires au fonctionnement de la Plateforme, à l'amélioration de nos services et, le cas échéant, au respect de nos obligations légales.",
        },
        {
          type: "h3",
          text: "3.1 Données d'identification et de compte",
        },
        {
          type: "p",
          text: "Lors de l'inscription ou de la gestion du profil, nous pouvons traiter :",
        },
        {
          type: "table",
          headers: ["Donnée", "Exemple / détail"],
          rows: [
            ["Identifiant", "Nom d'utilisateur (pseudo)"],
            ["Coordonnées", "Adresse e-mail"],
            ["Authentification", "Mot de passe (stocké sous forme hachée, jamais en clair)"],
            ["Profil public", "Avatar (image ou preset), biographie, titre FIDE, flair, bannière"],
            ["Localisation", "Pays (code ISO), ville (optionnelle)"],
            ["Préférences", "Langue préférée, niveau d'échecs déclaré, mode bas débit"],
            ["Démographie (optionnel)", "Année de naissance, genre, source de découverte"],
            ["Sécurité", "Authentification à deux facteurs (2FA / TOTP) si activée"],
          ],
        },
        {
          type: "p",
          text: "Base légale : exécution du contrat (art. 6.1.b RGPD) et, pour certaines données optionnelles, votre consentement (art. 6.1.a).",
        },
        {
          type: "h3",
          text: "3.2 Données de jeu et de performance",
        },
        {
          type: "p",
          text: "Pour permettre les parties, le classement et les statistiques :",
        },
        {
          type: "table",
          headers: ["Donnée", "Détail"],
          rows: [
            ["Historique de parties", "Coups (PGN), positions (FEN), résultats, durées, modes (blitz, rapid, daily, etc.)"],
            ["Classement ELO", "Par mode de jeu, évolution, parties classées ou amicales"],
            ["Statistiques", "Victoires/défaites/nulles, séries, puzzles, leçons complétées, XP"],
            ["Matchmaking", "Mode recherché, ELO au moment de la recherche, variante, cadence"],
            ["Présence en ligne", "État de connexion WebSocket, horodatage de déconnexion (salles de jeu)"],
            ["Analyse post-partie", "Évaluations moteur, précision des coups, commentaires coach"],
          ],
        },
        {
          type: "p",
          text: "Base légale : exécution du contrat (art. 6.1.b) et intérêt légitime à assurer l'intégrité du jeu (art. 6.1.f).",
        },
        {
          type: "h3",
          text: "3.3 Données Fair Play et anti-triche",
        },
        {
          type: "p",
          text: "Pour les parties classées entre humains, et uniquement après consentement explicite :",
        },
        {
          type: "table",
          headers: ["Donnée", "Détail"],
          rows: [
            ["Télémétrie comportementale", "Changements d'onglet, perte de focus, copier-coller, entropie souris, pré-coups"],
            ["Rapports Fair Play", "Scores d'analyse moteur, signaux de suspicion, verdicts"],
            ["Consentement", "Version du consentement, date, adresse IP, user-agent au moment du consentement"],
            ["Sanctions et recours", "Décisions de modération, appels, notes internes"],
          ],
        },
        {
          type: "p",
          text: "La collecte Fair Play est optionnelle pour les parties non classées. Sans consentement, vous ne pouvez pas participer aux parties classées ni au matchmaking classé.",
        },
        {
          type: "p",
          text: "Base légale : consentement (art. 6.1.a) pour la télémétrie ; intérêt légitime / obligation légale pour la lutte contre la triche (art. 6.1.f / 6.1.c).",
        },
        {
          type: "p",
          text: "Durée de conservation Fair Play : 90 jours pour les données de télémétrie brutes, sauf obligation légale ou litige en cours. Les décisions de sanction peuvent être conservées plus longtemps pour prévenir les récidives.",
        },
        {
          type: "h3",
          text: "3.4 Données sociales et communautaires",
        },
        {
          type: "table",
          headers: ["Donnée", "Détail"],
          rows: [
            ["Relations", "Demandes d'amis, liste d'amis, abonnements entre joueurs"],
            ["Messagerie", "Messages directs, chat en partie, messages forum"],
            ["Forum", "Titres, contenus, catégories, likes"],
            ["Signalements", "Rapports de joueurs, événements, contenus inappropriés"],
            ["Profils coach / streamer", "Informations publiques associées au profil"],
          ],
        },
        {
          type: "p",
          text: "Base légale : exécution du contrat (art. 6.1.b) ; intérêt légitime à modérer la communauté (art. 6.1.f).",
        },
        {
          type: "h3",
          text: "3.5 Données de paiement et d'abonnement",
        },
        {
          type: "p",
          text: "Les abonnements Gold et Diamond sont traités via Stripe :",
        },
        {
          type: "table",
          headers: ["Donnée", "Détail"],
          rows: [
            ["Identifiant client Stripe", "stripe_customer_id (lien avec votre compte)"],
            ["Statut d'abonnement", "Tier (free/gold/diamond), date de fin Premium"],
            ["Transactions", "Gérées par Stripe ; nous ne stockons pas vos numéros de carte bancaire"],
          ],
        },
        {
          type: "p",
          text: "Stripe agit en tant que sous-traitant indépendant. Consultez la politique de confidentialité de Stripe (stripe.com/fr/privacy).",
        },
        {
          type: "p",
          text: "Base légale : exécution du contrat (art. 6.1.b) et obligation légale comptable (art. 6.1.c).",
        },
        {
          type: "h3",
          text: "3.6 Connexion via OAuth (Google, GitHub)",
        },
        {
          type: "p",
          text: "Si vous vous connectez via un fournisseur tiers :",
        },
        {
          type: "table",
          headers: ["Donnée", "Détail"],
          rows: [
            ["Identifiant OAuth", "ID unique chez le fournisseur"],
            ["Profil de base", "E-mail, nom (selon les autorisations accordées)"],
            ["Jetons", "Gérés par django-allauth ; non exposés au frontend"],
          ],
        },
        {
          type: "p",
          text: "Base légale : exécution du contrat (art. 6.1.b) et consentement implicite via le flux OAuth du fournisseur.",
        },
        {
          type: "h3",
          text: "3.7 Données techniques et de journalisation",
        },
        {
          type: "table",
          headers: ["Donnée", "Détail"],
          rows: [
            ["Adresse IP", "Connexion, sécurité, limitation de débit (rate limiting)"],
            ["User-agent", "Type de navigateur / appareil"],
            ["IP hachée", "Analytics (forme pseudonymisée)"],
            ["Journaux serveur", "Erreurs, requêtes API, événements de sécurité"],
            ["Cookies / jetons", "Voir section 8"],
            ["Événements analytics", "Pages vues, clics, actions (login, début/fin de partie, etc.)"],
          ],
        },
        {
          type: "p",
          text: "Base légale : intérêt légitime (sécurité, performance, amélioration du service — art. 6.1.f).",
        },
        {
          type: "h3",
          text: "3.8 Données que nous ne collectons pas volontairement",
        },
        {
          type: "ul",
          items: [
            "Numéros de carte bancaire (traités exclusivement par Stripe)",
            "Données de santé",
            "Données biométriques",
            "Localisation GPS précise en continu",
            "Contenu de vos appareils hors de la Plateforme",
          ],
        },
      ],
    },
    {
      id: "finalites",
      title: "Finalités du traitement",
      blocks: [
        {
          type: "p",
          text: "Nous utilisons vos données pour :",
        },
        {
          type: "ul",
          items: [
            "Créer et gérer votre compte (inscription, authentification, 2FA, récupération de mot de passe)",
            "Permettre le jeu en ligne (parties humaines, vs IA, matchmaking, WebSocket temps réel)",
            "Calculer et afficher les classements (ELO, ligues, tournois)",
            "Proposer l'apprentissage (cours, leçons, quiz, progression)",
            "Gérer les fonctionnalités sociales (amis, chat, forum, clubs)",
            "Traiter les abonnements Premium (Stripe, facturation, portail client)",
            "Assurer l'intégrité du jeu (Fair Play, anti-triche, sanctions, recours)",
            "Envoyer des notifications (invitations de partie, messages, rappels tournoi)",
            "Analyser l'usage (statistiques agrégées, amélioration UX, correction de bugs)",
            "Assurer la sécurité (prévention fraude, rate limiting, audit)",
            "Respecter nos obligations légales (comptabilité, réponses aux autorités)",
          ],
        },
        {
          type: "p",
          text: "Nous ne vendons pas vos données personnelles à des tiers.",
        },
      ],
    },
    {
      id: "destinataires",
      title: "Destinataires et sous-traitants",
      blocks: [
        {
          type: "p",
          text: "Vos données peuvent être accessibles aux catégories suivantes :",
        },
        {
          type: "table",
          headers: ["Destinataire", "Rôle", "Localisation"],
          rows: [
            ["Hébergeur (serveurs applicatifs, BDD)", "Hébergement", "UE / selon contrat"],
            ["Stripe", "Paiements", "UE / US (clauses contractuelles types)"],
            ["Google", "OAuth (connexion)", "US / UE"],
            ["GitHub", "OAuth (connexion)", "US"],
            ["Personnel autorisé AFRICHESS", "Support, modération Fair Play", "—"],
          ],
        },
        {
          type: "p",
          text: "Tous nos sous-traitants sont sélectionnés pour leur conformité RGPD et font l'objet d'accords de traitement de données (DPA) lorsque requis.",
        },
      ],
    },
    {
      id: "transferts",
      title: "Transferts hors Union européenne",
      blocks: [
        {
          type: "p",
          text: "Certains prestataires (notamment Stripe, Google, GitHub) peuvent traiter des données aux États-Unis ou dans d'autres pays.",
        },
        {
          type: "p",
          text: "Dans ce cas, nous nous appuyons sur :",
        },
        {
          type: "ul",
          items: [
            "les Clauses Contractuelles Types (CCT) de la Commission européenne ;",
            "le Data Privacy Framework (le cas échéant) ;",
            "ou d'autres garanties appropriées au sens de l'art. 46 RGPD.",
          ],
        },
        {
          type: "p",
          text: "Vous pouvez nous contacter pour obtenir une copie des garanties applicables.",
        },
      ],
    },
    {
      id: "conservation",
      title: "Durées de conservation",
      blocks: [
        {
          type: "table",
          headers: ["Catégorie", "Durée"],
          rows: [
            ["Compte actif", "Tant que le compte existe"],
            ["Compte supprimé", "Suppression ou anonymisation sous 30 jours, sauf obligations légales"],
            ["Historique de parties", "Conservé pour statistiques et replay ; anonymisable à la demande"],
            ["Télémétrie Fair Play", "90 jours (données brutes)"],
            ["Sanctions Fair Play", "Durée de la sanction + 3 ans (prévention récidive)"],
            ["Journaux de sécurité", "12 mois"],
            ["Analytics (événements)", "24 mois (puis agrégation ou suppression)"],
            ["Données comptables (Stripe)", "10 ans (obligation légale)"],
            ["Consentements", "Durée du consentement + preuve (5 ans recommandés)"],
          ],
        },
        {
          type: "p",
          text: "À l'expiration, les données sont supprimées ou anonymisées de manière irréversible.",
        },
      ],
    },
    {
      id: "cookies",
      title: "Cookies et technologies similaires",
      blocks: [
        {
          type: "h3",
          text: "8.1 Cookies strictement nécessaires",
        },
        {
          type: "table",
          headers: ["Cookie / stockage", "Finalité", "Durée"],
          rows: [
            ["refresh_token (HttpOnly, optionnel)", "Maintien de session JWT", "Jusqu'à expiration refresh (ex. 30 j)"],
            ["Jeton d'accès (localStorage / mémoire)", "Authentification API", "Courte durée (ex. 15 min)"],
            ["Préférences UI", "Langue, thème, paramètres échècs", "Persistant local"],
          ],
        },
        {
          type: "p",
          text: "Ces cookies sont nécessaires au fonctionnement et ne requièrent pas de consentement au sens de la directive ePrivacy.",
        },
        {
          type: "h3",
          text: "8.2 Stockage local (parties, préférences)",
        },
        {
          type: "p",
          text: "Nous pouvons utiliser localStorage ou sessionStorage pour :",
        },
        {
          type: "ul",
          items: [
            "reprendre une partie en cours ;",
            "mémoriser vos préférences d'interface ;",
            "améliorer les performances en mode bas débit.",
          ],
        },
        {
          type: "h3",
          text: "8.3 Cookies analytics (le cas échéant)",
        },
        {
          type: "p",
          text: "Si des outils analytics tiers sont activés en production, un bandeau de consentement vous sera présenté avant tout dépôt non essentiel.",
        },
      ],
    },
    {
      id: "securite",
      title: "Sécurité des données",
      blocks: [
        {
          type: "p",
          text: "Nous mettons en œuvre des mesures techniques et organisationnelles appropriées :",
        },
        {
          type: "ul",
          items: [
            "Chiffrement HTTPS pour toutes les communications",
            "Mots de passe hachés (algorithme robuste, jamais stockés en clair)",
            "JWT avec rotation et liste de révocation (blacklist)",
            "Cookies HttpOnly pour le refresh token (option activable)",
            "Rate limiting sur login et endpoints sensibles",
            "Isolation réseau (Redis, PostgreSQL non exposés publiquement)",
            "Validation des entrées (XSS, taille des payloads)",
            "Webhooks Stripe signés et vérifiés",
            "Accès restreint aux données de production (principe du moindre privilège)",
            "Sauvegardes chiffrées de la base de données",
          ],
        },
        {
          type: "p",
          text: "Aucune transmission sur Internet n'est totalement sécurisée ; nous ne pouvons garantir une sécurité absolue, mais nous améliorons continuellement nos pratiques.",
        },
      ],
    },
    {
      id: "decisions-automatisees",
      title: "Décisions automatisées et profilage",
      blocks: [
        {
          type: "h3",
          text: "10.1 Fair Play",
        },
        {
          type: "p",
          text: "Le système Fair Play peut :",
        },
        {
          type: "ul",
          items: [
            "analyser automatiquement vos parties classées (corrélation avec le moteur d'échecs) ;",
            "générer des scores de suspicion ;",
            "déclencher une revue humaine avant toute sanction.",
          ],
        },
        {
          type: "p",
          text: "Aucune sanction définitive n'est appliquée uniquement sur décision automatisée sans intervention humaine pour les cas contestés. Vous disposez d'un droit de recours via l'API /api/games/fairplay/appeals/.",
        },
        {
          type: "p",
          text: "Base légale : intérêt légitime (intégrité compétitive) + consentement pour la télémétrie.",
        },
        {
          type: "h3",
          text: "10.2 Matchmaking",
        },
        {
          type: "p",
          text: "L'appariement par ELO est un algorithme de matching (pas un profilage à effet juridique).",
        },
      ],
    },
    {
      id: "droits",
      title: "Vos droits (RGPD)",
      blocks: [
        {
          type: "p",
          text: "Conformément aux articles 15 à 22 du RGPD, vous disposez des droits suivants :",
        },
        {
          type: "table",
          headers: ["Droit", "Description"],
          rows: [
            ["Accès", "Obtenir une copie de vos données"],
            ["Rectification", "Corriger des données inexactes (profil, e-mail)"],
            ["Effacement", "Demander la suppression de votre compte et données associées"],
            ["Limitation", "Restreindre le traitement dans certains cas"],
            ["Portabilité", "Recevoir vos données dans un format structuré (JSON)"],
            ["Opposition", "Vous opposer au traitement fondé sur l'intérêt légitime"],
            ["Retrait du consentement", "Retirer le consentement Fair Play (sans effet rétroactif)"],
            ["Directives post-mortem", "Instructions relatives à vos données après décès (France)"],
          ],
        },
        {
          type: "h3",
          text: "Comment exercer vos droits",
        },
        {
          type: "ul",
          items: [
            "Via votre compte : paramètres profil, export de parties (PGN), suppression de compte",
            "Par e-mail : privacy@africhess.com",
            "Fair Play : retrait du consentement et recours via les écrans dédiés",
          ],
        },
        {
          type: "p",
          text: "Nous répondons sous un mois (prolongeable de 2 mois si complexe, avec information préalable).",
        },
        {
          type: "h3",
          text: "Réclamation auprès de l'autorité de contrôle",
        },
        {
          type: "p",
          text: "Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire une réclamation auprès de :",
        },
        {
          type: "p",
          text: "CNIL (France) — www.cnil.fr — 3 Place de Fontenoy, TSA 80715, 75334 Paris Cedex 07. (Ou l'autorité de votre pays de résidence dans l'EEE.)",
        },
      ],
    },
    {
      id: "mineurs",
      title: "Mineurs",
      blocks: [
        {
          type: "p",
          text: "AFRICHESS s'adresse aux personnes âgées d'au moins 13 ans (ou l'âge minimum requis dans votre pays).",
        },
        {
          type: "ul",
          items: [
            "L'inscription d'un mineur de moins de 16 ans dans l'UE requiert le consentement d'un parent ou tuteur légal.",
            "Nous ne collectons pas sciemment de données d'enfants sans autorisation parentale.",
            "Si vous pensez qu'un mineur a créé un compte sans autorisation, contactez-nous pour suppression.",
          ],
        },
      ],
    },
    {
      id: "donnees-publiques",
      title: "Données publiques et visibilité",
      blocks: [
        {
          type: "p",
          text: "Certaines informations sont visibles publiquement par défaut :",
        },
        {
          type: "ul",
          items: [
            "Pseudo, avatar, pays, titre, classement ELO",
            "Historique de parties (replay)",
            "Messages forum publics",
            "Profil coach / streamer (si activé)",
          ],
        },
        {
          type: "p",
          text: "Vous pouvez limiter certaines informations via les paramètres de profil. Les messages privés et données de paiement ne sont jamais publics.",
        },
      ],
    },
    {
      id: "communications",
      title: "Communications",
      blocks: [
        {
          type: "p",
          text: "Nous pouvons vous envoyer :",
        },
        {
          type: "ul",
          items: [
            "E-mails transactionnels (confirmation compte, réinitialisation mot de passe, reçus Stripe) — nécessaires au service",
            "Notifications in-app (invitations, messages, tournois)",
            "E-mails marketing (le cas échéant) — uniquement avec votre consentement, désinscription possible à tout moment",
          ],
        },
      ],
    },
    {
      id: "modifications",
      title: "Modifications de la Politique",
      blocks: [
        {
          type: "p",
          text: "Nous pouvons mettre à jour la présente Politique pour refléter :",
        },
        {
          type: "ul",
          items: [
            "de nouvelles fonctionnalités ;",
            "des évolutions légales ;",
            "des changements de sous-traitants.",
          ],
        },
        {
          type: "p",
          text: "En cas de modification substantielle, nous vous en informerons par :",
        },
        {
          type: "ul",
          items: [
            "une notification sur la Plateforme ;",
            "un e-mail (si l'adresse est disponible) ;",
            "une mise à jour de la date en tête de document.",
          ],
        },
        {
          type: "p",
          text: "La poursuite de l'utilisation après notification vaut acceptation, sauf lorsque votre consentement explicite est requis par la loi.",
        },
      ],
    },
    {
      id: "liens-tiers",
      title: "Liens vers d'autres sites",
      blocks: [
        {
          type: "p",
          text: "La Plateforme peut contenir des liens vers des sites tiers (FIDE, réseaux sociaux, partenaires). Nous ne sommes pas responsables de leurs pratiques de confidentialité. Consultez leurs politiques respectives.",
        },
      ],
    },
    {
      id: "resume",
      title: "Résumé par finalité (tableau synthétique)",
      blocks: [
        {
          type: "table",
          headers: ["Finalité", "Données", "Base légale", "Durée"],
          rows: [
            ["Compte utilisateur", "Identité, e-mail, profil", "Contrat", "Vie du compte + 30 j"],
            ["Jeu en ligne", "Coups, ELO, stats", "Contrat / Intérêt légitime", "Vie du compte"],
            ["Fair Play classé", "Télémétrie, analyses", "Consentement / Intérêt légitime", "90 j – 3 ans"],
            ["Paiement Premium", "ID Stripe, tier", "Contrat / Obligation légale", "10 ans (compta)"],
            ["OAuth", "ID tiers, e-mail", "Contrat", "Vie du compte"],
            ["Sécurité", "IP, logs, rate limit", "Intérêt légitime", "12 mois"],
            ["Analytics", "Événements pseudonymisés", "Intérêt légitime", "24 mois"],
          ],
        },
      ],
    },
    {
      id: "contact",
      title: "Contact",
      blocks: [
        {
          type: "p",
          text: "Maxime Dzidula KELI — AFRICHESS",
        },
        {
          type: "p",
          text: "Données personnelles : privacy@africhess.com",
        },
        {
          type: "p",
          text: "Support : WhatsApp +33 7 54 83 00 39",
        },
        {
          type: "p",
          text: "Document rédigé pour la plateforme AFRICHESS. Il constitue une base opérationnelle alignée sur les fonctionnalités actuelles du produit. Pour une mise en production commerciale à grande échelle, une relecture par un conseil juridique spécialisé en protection des données est recommandée.",
        },
      ],
    },
  ],
};
