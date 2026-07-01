import type { LegalDocument } from "./types";

export const PRIVACY_EN: LegalDocument = {
  title: "Privacy Policy",
  updated: "June 4, 2026",
  version: "1.0",
  intro:
    "This policy explains how AFRICHESS collects, uses, retains, and protects your personal data when you use our online chess platform. We are committed to transparent, secure processing in compliance with the General Data Protection Regulation (GDPR). Certain features, including rated games and the Fair Play program, require separate explicit consent that you may withdraw at any time.",
  sections: [
    {
      id: "introduction",
      title: "Introduction",
      blocks: [
        {
          type: "p",
          text: 'This privacy policy ("Policy") explains how AFRICHESS ("we", "our", "the Platform") collects, uses, retains, shares, and protects your personal data when you use:',
        },
        {
          type: "ul",
          items: [
            "the AFRICHESS website (Next.js interface);",
            "the AFRICHESS mobile application;",
            "the API and associated services (online games, matchmaking, learning, tournaments, Premium subscriptions, etc.).",
          ],
        },
        {
          type: "p",
          text: "AFRICHESS is an online chess platform. We are committed to processing your data in a transparent, secure manner that complies with the General Data Protection Regulation (GDPR — EU 2016/679) and, where applicable, national data protection laws.",
        },
        {
          type: "p",
          text: "By creating an account or using the Platform, you acknowledge that you have read this Policy. Certain features (notably rated games and the Fair Play program) require separate explicit consent, which you may withdraw at any time.",
        },
      ],
    },
    {
      id: "controller",
      title: "Data controller",
      blocks: [
        {
          type: "table",
          headers: ["Field", "Value"],
          rows: [
            ["Controller", "Maxime Dzidula KELI — AFRICHESS"],
            ["General contact", "WhatsApp +33 7 54 83 00 39"],
            ["Personal data contact", "privacy@africhess.com"],
          ],
        },
        {
          type: "p",
          text: "For any questions regarding your personal data, the exercise of your rights, or this Policy, you may contact us using the details above.",
        },
      ],
    },
    {
      id: "data-collected",
      title: "Data we collect",
      blocks: [
        {
          type: "p",
          text: "We collect only the data necessary to operate the Platform, improve our services, and, where applicable, comply with our legal obligations.",
        },
        {
          type: "h3",
          text: "3.1 Identification and account data",
        },
        {
          type: "p",
          text: "During registration or profile management, we may process:",
        },
        {
          type: "table",
          headers: ["Data", "Example / detail"],
          rows: [
            ["Identifier", "Username (display name)"],
            ["Contact details", "Email address"],
            ["Authentication", "Password (stored hashed, never in plain text)"],
            ["Public profile", "Avatar (image or preset), biography, FIDE title, flair, banner"],
            ["Location", "Country (ISO code), city (optional)"],
            ["Preferences", "Preferred language, declared chess level, low-bandwidth mode"],
            ["Demographics (optional)", "Year of birth, gender, discovery source"],
            ["Security", "Two-factor authentication (2FA / TOTP) if enabled"],
          ],
        },
        {
          type: "p",
          text: "Legal basis: performance of contract (Art. 6.1.b GDPR) and, for certain optional data, your consent (Art. 6.1.a).",
        },
        {
          type: "h3",
          text: "3.2 Game and performance data",
        },
        {
          type: "p",
          text: "To enable games, rankings, and statistics:",
        },
        {
          type: "table",
          headers: ["Data", "Detail"],
          rows: [
            ["Game history", "Moves (PGN), positions (FEN), results, durations, modes (blitz, rapid, daily, etc.)"],
            ["ELO rating", "Per game mode, evolution, rated or casual games"],
            ["Statistics", "Wins/losses/draws, streaks, puzzles, completed lessons, XP"],
            ["Matchmaking", "Mode sought, ELO at search time, variant, time control"],
            ["Online presence", "WebSocket connection status, disconnect timestamp (game rooms)"],
            ["Post-game analysis", "Engine evaluations, move accuracy, coach comments"],
          ],
        },
        {
          type: "p",
          text: "Legal basis: performance of contract (Art. 6.1.b) and legitimate interest in ensuring game integrity (Art. 6.1.f).",
        },
        {
          type: "h3",
          text: "3.3 Fair Play and anti-cheat data",
        },
        {
          type: "p",
          text: "For rated human-vs-human games, and only after explicit consent:",
        },
        {
          type: "table",
          headers: ["Data", "Detail"],
          rows: [
            ["Behavioral telemetry", "Tab switches, focus loss, copy-paste, mouse entropy, pre-moves"],
            ["Fair Play reports", "Engine analysis scores, suspicion signals, verdicts"],
            ["Consent", "Consent version, date, IP address, user-agent at time of consent"],
            ["Sanctions and appeals", "Moderation decisions, appeals, internal notes"],
          ],
        },
        {
          type: "p",
          text: "Fair Play collection is optional for unrated games. Without consent, you cannot participate in rated games or rated matchmaking.",
        },
        {
          type: "p",
          text: "Legal basis: consent (Art. 6.1.a) for telemetry; legitimate interest / legal obligation for anti-cheat (Art. 6.1.f / 6.1.c).",
        },
        {
          type: "p",
          text: "Fair Play retention period: 90 days for raw telemetry data, unless a legal obligation or ongoing dispute applies. Sanction decisions may be retained longer to prevent repeat offenses.",
        },
        {
          type: "h3",
          text: "3.4 Social and community data",
        },
        {
          type: "table",
          headers: ["Data", "Detail"],
          rows: [
            ["Relationships", "Friend requests, friend lists, player follow subscriptions"],
            ["Messaging", "Direct messages, in-game chat, forum messages"],
            ["Forum", "Titles, content, categories, likes"],
            ["Reports", "Player reports, events, inappropriate content"],
            ["Coach / streamer profiles", "Public information associated with the profile"],
          ],
        },
        {
          type: "p",
          text: "Legal basis: performance of contract (Art. 6.1.b); legitimate interest in moderating the community (Art. 6.1.f).",
        },
        {
          type: "h3",
          text: "3.5 Payment and subscription data",
        },
        {
          type: "p",
          text: "Gold and Diamond subscriptions are processed via Stripe:",
        },
        {
          type: "table",
          headers: ["Data", "Detail"],
          rows: [
            ["Stripe customer ID", "stripe_customer_id (linked to your account)"],
            ["Subscription status", "Tier (free/gold/diamond), Premium end date"],
            ["Transactions", "Managed by Stripe; we do not store your card numbers"],
          ],
        },
        {
          type: "p",
          text: "Stripe acts as an independent processor. See Stripe's privacy policy (stripe.com/privacy).",
        },
        {
          type: "p",
          text: "Legal basis: performance of contract (Art. 6.1.b) and legal accounting obligation (Art. 6.1.c).",
        },
        {
          type: "h3",
          text: "3.6 OAuth sign-in (Google, GitHub)",
        },
        {
          type: "p",
          text: "If you sign in via a third-party provider:",
        },
        {
          type: "table",
          headers: ["Data", "Detail"],
          rows: [
            ["OAuth identifier", "Unique ID at the provider"],
            ["Basic profile", "Email, name (per granted permissions)"],
            ["Tokens", "Managed by django-allauth; not exposed to the frontend"],
          ],
        },
        {
          type: "p",
          text: "Legal basis: performance of contract (Art. 6.1.b) and implicit consent via the provider's OAuth flow.",
        },
        {
          type: "h3",
          text: "3.7 Technical and logging data",
        },
        {
          type: "table",
          headers: ["Data", "Detail"],
          rows: [
            ["IP address", "Connection, security, rate limiting"],
            ["User-agent", "Browser / device type"],
            ["Hashed IP", "Analytics (pseudonymized form)"],
            ["Server logs", "Errors, API requests, security events"],
            ["Cookies / tokens", "See section 8"],
            ["Analytics events", "Page views, clicks, actions (login, game start/end, etc.)"],
          ],
        },
        {
          type: "p",
          text: "Legal basis: legitimate interest (security, performance, service improvement — Art. 6.1.f).",
        },
        {
          type: "h3",
          text: "3.8 Data we do not intentionally collect",
        },
        {
          type: "ul",
          items: [
            "Card numbers (processed exclusively by Stripe)",
            "Health data",
            "Biometric data",
            "Continuous precise GPS location",
            "Content from your devices outside the Platform",
          ],
        },
      ],
    },
    {
      id: "purposes",
      title: "Processing purposes",
      blocks: [
        {
          type: "p",
          text: "We use your data to:",
        },
        {
          type: "ul",
          items: [
            "Create and manage your account (registration, authentication, 2FA, password recovery)",
            "Enable online play (human games, vs AI, matchmaking, real-time WebSocket)",
            "Calculate and display rankings (ELO, leagues, tournaments)",
            "Provide learning features (courses, lessons, quizzes, progress)",
            "Manage social features (friends, chat, forum, clubs)",
            "Process Premium subscriptions (Stripe, billing, customer portal)",
            "Ensure game integrity (Fair Play, anti-cheat, sanctions, appeals)",
            "Send notifications (game invitations, messages, tournament reminders)",
            "Analyze usage (aggregated statistics, UX improvement, bug fixes)",
            "Ensure security (fraud prevention, rate limiting, audits)",
            "Comply with legal obligations (accounting, responses to authorities)",
          ],
        },
        {
          type: "p",
          text: "We do not sell your personal data to third parties.",
        },
      ],
    },
    {
      id: "recipients",
      title: "Recipients and processors",
      blocks: [
        {
          type: "p",
          text: "Your data may be accessible to the following categories:",
        },
        {
          type: "table",
          headers: ["Recipient", "Role", "Location"],
          rows: [
            ["Hosting provider (application servers, database)", "Hosting", "EU / per contract"],
            ["Stripe", "Payments", "EU / US (standard contractual clauses)"],
            ["Google", "OAuth (sign-in)", "US / EU"],
            ["GitHub", "OAuth (sign-in)", "US"],
            ["Authorized AFRICHESS staff", "Support, Fair Play moderation", "—"],
          ],
        },
        {
          type: "p",
          text: "All our processors are selected for GDPR compliance and are subject to data processing agreements (DPAs) where required.",
        },
      ],
    },
    {
      id: "transfers",
      title: "Transfers outside the European Union",
      blocks: [
        {
          type: "p",
          text: "Certain providers (notably Stripe, Google, GitHub) may process data in the United States or other countries.",
        },
        {
          type: "p",
          text: "In such cases, we rely on:",
        },
        {
          type: "ul",
          items: [
            "the European Commission's Standard Contractual Clauses (SCCs);",
            "the Data Privacy Framework (where applicable);",
            "or other appropriate safeguards within the meaning of Art. 46 GDPR.",
          ],
        },
        {
          type: "p",
          text: "You may contact us to obtain a copy of the applicable safeguards.",
        },
      ],
    },
    {
      id: "retention",
      title: "Retention periods",
      blocks: [
        {
          type: "table",
          headers: ["Category", "Duration"],
          rows: [
            ["Active account", "As long as the account exists"],
            ["Deleted account", "Deletion or anonymization within 30 days, except legal obligations"],
            ["Game history", "Retained for statistics and replay; anonymizable on request"],
            ["Fair Play telemetry", "90 days (raw data)"],
            ["Fair Play sanctions", "Duration of sanction + 3 years (repeat offense prevention)"],
            ["Security logs", "12 months"],
            ["Analytics (events)", "24 months (then aggregation or deletion)"],
            ["Accounting data (Stripe)", "10 years (legal obligation)"],
            ["Consents", "Duration of consent + proof (5 years recommended)"],
          ],
        },
        {
          type: "p",
          text: "Upon expiry, data is deleted or irreversibly anonymized.",
        },
      ],
    },
    {
      id: "cookies",
      title: "Cookies and similar technologies",
      blocks: [
        {
          type: "h3",
          text: "8.1 Strictly necessary cookies",
        },
        {
          type: "table",
          headers: ["Cookie / storage", "Purpose", "Duration"],
          rows: [
            ["refresh_token (HttpOnly, optional)", "JWT session maintenance", "Until refresh expiry (e.g. 30 days)"],
            ["Access token (localStorage / memory)", "API authentication", "Short duration (e.g. 15 min)"],
            ["UI preferences", "Language, theme, chess settings", "Persistent local"],
          ],
        },
        {
          type: "p",
          text: "These cookies are necessary for operation and do not require consent under the ePrivacy Directive.",
        },
        {
          type: "h3",
          text: "8.2 Local storage (games, preferences)",
        },
        {
          type: "p",
          text: "We may use localStorage or sessionStorage to:",
        },
        {
          type: "ul",
          items: [
            "resume an ongoing game;",
            "remember your interface preferences;",
            "improve performance in low-bandwidth mode.",
          ],
        },
        {
          type: "h3",
          text: "8.3 Analytics cookies (if applicable)",
        },
        {
          type: "p",
          text: "If third-party analytics tools are enabled in production, a consent banner will be presented before any non-essential storage.",
        },
      ],
    },
    {
      id: "security",
      title: "Data security",
      blocks: [
        {
          type: "p",
          text: "We implement appropriate technical and organizational measures:",
        },
        {
          type: "ul",
          items: [
            "HTTPS encryption for all communications",
            "Hashed passwords (robust algorithm, never stored in plain text)",
            "JWT with rotation and revocation list (blacklist)",
            "HttpOnly cookies for the refresh token (optional setting)",
            "Rate limiting on login and sensitive endpoints",
            "Network isolation (Redis, PostgreSQL not publicly exposed)",
            "Input validation (XSS, payload size limits)",
            "Signed and verified Stripe webhooks",
            "Restricted access to production data (principle of least privilege)",
            "Encrypted database backups",
          ],
        },
        {
          type: "p",
          text: "No transmission over the Internet is completely secure; we cannot guarantee absolute security, but we continuously improve our practices.",
        },
      ],
    },
    {
      id: "automated-decisions",
      title: "Automated decisions and profiling",
      blocks: [
        {
          type: "h3",
          text: "10.1 Fair Play",
        },
        {
          type: "p",
          text: "The Fair Play system may:",
        },
        {
          type: "ul",
          items: [
            "automatically analyze your rated games (correlation with the chess engine);",
            "generate suspicion scores;",
            "trigger human review before any sanction.",
          ],
        },
        {
          type: "p",
          text: "No final sanction is applied solely on automated decision without human intervention for contested cases. You have a right of appeal via the /api/games/fairplay/appeal/ API.",
        },
        {
          type: "p",
          text: "Legal basis: legitimate interest (competitive integrity) + consent for telemetry.",
        },
        {
          type: "h3",
          text: "10.2 Matchmaking",
        },
        {
          type: "p",
          text: "ELO-based pairing is a matching algorithm (not profiling with legal effect).",
        },
      ],
    },
    {
      id: "rights",
      title: "Your rights (GDPR)",
      blocks: [
        {
          type: "p",
          text: "Under Articles 15 to 22 of the GDPR, you have the following rights:",
        },
        {
          type: "table",
          headers: ["Right", "Description"],
          rows: [
            ["Access", "Obtain a copy of your data"],
            ["Rectification", "Correct inaccurate data (profile, email)"],
            ["Erasure", "Request deletion of your account and associated data"],
            ["Restriction", "Restrict processing in certain cases"],
            ["Portability", "Receive your data in a structured format (JSON)"],
            ["Objection", "Object to processing based on legitimate interest"],
            ["Withdrawal of consent", "Withdraw Fair Play consent (without retroactive effect)"],
            ["Post-mortem directives", "Instructions regarding your data after death (France)"],
          ],
        },
        {
          type: "h3",
          text: "How to exercise your rights",
        },
        {
          type: "ul",
          items: [
            "Via your account: profile settings, game export (PGN), account deletion",
            "By email: privacy@africhess.com",
            "Fair Play: consent withdrawal and appeals via dedicated screens",
          ],
        },
        {
          type: "p",
          text: "We respond within one month (extendable by 2 months if complex, with prior notice).",
        },
        {
          type: "h3",
          text: "Complaint to a supervisory authority",
        },
        {
          type: "p",
          text: "If you believe your rights are not being respected, you may lodge a complaint with:",
        },
        {
          type: "p",
          text: "CNIL (France) — www.cnil.fr — 3 Place de Fontenoy, TSA 80715, 75334 Paris Cedex 07. (Or the authority in your country of residence within the EEA.)",
        },
      ],
    },
    {
      id: "minors",
      title: "Minors",
      blocks: [
        {
          type: "p",
          text: "AFRICHESS is intended for persons aged at least 13 (or the minimum age required in your country).",
        },
        {
          type: "ul",
          items: [
            "Registration of a minor under 16 in the EU requires consent from a parent or legal guardian.",
            "We do not knowingly collect children's data without parental authorization.",
            "If you believe a minor created an account without authorization, contact us for deletion.",
          ],
        },
      ],
    },
    {
      id: "public-data",
      title: "Public data and visibility",
      blocks: [
        {
          type: "p",
          text: "Certain information is publicly visible by default:",
        },
        {
          type: "ul",
          items: [
            "Username, avatar, country, title, ELO rating",
            "Game history (replay)",
            "Public forum messages",
            "Coach / streamer profile (if enabled)",
          ],
        },
        {
          type: "p",
          text: "You can limit certain information via profile settings. Private messages and payment data are never public.",
        },
      ],
    },
    {
      id: "communications",
      title: "Communications",
      blocks: [
        {
          type: "p",
          text: "We may send you:",
        },
        {
          type: "ul",
          items: [
            "Transactional emails (account confirmation, password reset, Stripe receipts) — necessary for the service",
            "In-app notifications (invitations, messages, tournaments)",
            "Marketing emails (if applicable) — only with your consent, unsubscribe available at any time",
          ],
        },
      ],
    },
    {
      id: "changes",
      title: "Policy changes",
      blocks: [
        {
          type: "p",
          text: "We may update this Policy to reflect:",
        },
        {
          type: "ul",
          items: [
            "new features;",
            "legal developments;",
            "changes to processors.",
          ],
        },
        {
          type: "p",
          text: "In case of a material change, we will notify you by:",
        },
        {
          type: "ul",
          items: [
            "a notification on the Platform;",
            "an email (if the address is available);",
            "an update to the date at the top of this document.",
          ],
        },
        {
          type: "p",
          text: "Continued use after notification constitutes acceptance, except where explicit consent is required by law.",
        },
      ],
    },
    {
      id: "third-party-links",
      title: "Links to other sites",
      blocks: [
        {
          type: "p",
          text: "The Platform may contain links to third-party sites (FIDE, social networks, partners). We are not responsible for their privacy practices. Please consult their respective policies.",
        },
      ],
    },
    {
      id: "summary",
      title: "Summary by purpose",
      blocks: [
        {
          type: "table",
          headers: ["Purpose", "Data", "Legal basis", "Duration"],
          rows: [
            ["User account", "Identity, email, profile", "Contract", "Account lifetime + 30 days"],
            ["Online play", "Moves, ELO, stats", "Contract / Legitimate interest", "Account lifetime"],
            ["Rated Fair Play", "Telemetry, analyses", "Consent / Legitimate interest", "90 days – 3 years"],
            ["Premium payment", "Stripe ID, tier", "Contract / Legal obligation", "10 years (accounting)"],
            ["OAuth", "Third-party ID, email", "Contract", "Account lifetime"],
            ["Security", "IP, logs, rate limit", "Legitimate interest", "12 months"],
            ["Analytics", "Pseudonymized events", "Legitimate interest", "24 months"],
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
          text: "Personal data: privacy@africhess.com",
        },
        {
          type: "p",
          text: "Support: WhatsApp +33 7 54 83 00 39",
        },
        {
          type: "p",
          text: "Document prepared for the AFRICHESS platform. It constitutes an operational baseline aligned with current product features. For large-scale commercial production, review by specialized data protection counsel is recommended.",
        },
      ],
    },
  ],
};
