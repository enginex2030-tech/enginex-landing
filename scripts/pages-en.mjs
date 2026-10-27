// English copy for every page that is not the landing page.
//
// The Arabic HTML is the source of truth: each translatable text node carries a
// data-i key, and the build writes the English twin under /en/ from this table.
// A missing key fails the build instead of shipping a half-translated page.
//
// Keys shared with the landing page (navigation, footer, calls to action) come
// from marketing.js T.en, so the two pages can never drift apart.

export const shared = {
  navLabel: "Site links",
  waLabel: "Contact us on WhatsApp",
  login: "Log in",
  langLabel: "Switch to Arabic",
  themeLabel: "Toggle the interface theme",
  menuLabel: "Navigation menu",
  updated: "Last updated: 27 October 2026",
};

export const pages = {
  "about.html": {
    title: "About ENGINEX ERP | A cloud system for contracting and tax compliance",
    description:
      "ENGINEX ERP is a cloud platform for contracting: project, contract, certificate, inventory, and invoice in one database, with separate tax paths for ZATCA in Saudi Arabia and ETA in Egypt.",
    jsonLd:
      '{"@context":"https://schema.org","@type":"AboutPage","name":"About ENGINEX ERP","url":"https://enginex2030.com/en/about.html","inLanguage":"en","publisher":{"@type":"Organization","name":"ENGINEX ERP","url":"https://enginex2030.com/","logo":"https://enginex2030.com/logo/enginex-logo-640.png"}}',
    items: {
      abK: "About us",
      abH: "One system that tells the truth about every project.",
      abP:
        "ENGINEX ERP is a cloud platform for contracting, construction, material suppliers, and survey firms. It brings the project, contract, certificate, inventory, and tax invoice into one database, and runs in Arabic and English on Windows, the web, and mobile.",
      abCta: "Explore the modules",
      abPanelK: "The platform in five lines",
      abF1K: "Company",
      abF1V: "An Egyptian software company building management systems for contractors",
      abF2K: "Product",
      abF2V: "A multi-module cloud ERP platform",
      abF3K: "Language",
      abF3V: "Arabic and English in one interface",
      abF4K: "Compliance",
      abF4V: "A ZATCA path for Saudi Arabia and an ETA path for Egypt",
      abF5K: "Platforms",
      abF5V: "Windows, web, and mobile on one service",
      abFactsP: "What you get from day one",
      abFact1: "An isolated database per branch when needed",
      abFact2: "A tax invoice through both ZATCA and ETA",
      abFact3: "An audit trail for every change",
      abFact4: "A free plan with no expiry",
      abWhyK: "Why ENGINEX exists",
      abWhyH: "The problem is not missing data. It is too many copies of it.",
      abWhyP:
        "When the office works in a spreadsheet, the site in a notebook, and finance in a third file, the numbers always arrive late. We built ENGINEX so every number has one source and every step leaves a financial trail you can follow.",
      abPain1H: "Scattered data",
      abPain1P: "Spreadsheets, messages, and folders that stop matching when a decision is due.",
      abPain2H: "Late certificates",
      abPain2P: "Payments slip because quantities and approvals live apart.",
      abPain3H: "Unknown actual cost",
      abPain3P: "Variance becomes visible only after it has grown.",
      abPain4H: "Manual compliance",
      abPain4P: "The tax invoice is prepared by hand, and the error appears at review.",
      abBridge:
        "ENGINEX makes every step the data source for the next: the tender feeds the contract, the contract feeds the certificate, and the certificate feeds the journal entry.",
      abCapK: "The full capability set",
      abCapH: "Four groups, twelve modules, one cycle.",
      abCapP: "Every module below ships in the product today. None of it is promised for a later release.",
      abG1: "Projects and delivery",
      abM1: "Projects",
      abM1D:
        "One workspace per project combining phase, team, progress, and budget, so the project manager and the finance manager read the same number.",
      abM2: "Contracts and certificates",
      abM2D:
        "Contract value, items, quantities, certificates, and their approvals stay attached to the project, so you see what is due before it is late.",
      abG2: "Finance and decisions",
      abM3: "Budgets and cost",
      abM3D:
        "Budget lines and cost centers against actual spend, with variance shown early enough to correct.",
      abM4: "Branch accounting",
      abM4D:
        "An isolated database per branch when needed, with a head-office dashboard that consolidates sales, cost, and net profit for comparison.",
      abM5: "Accounting and payroll",
      abM5D:
        "Journal entries linked to their sources in invoices, purchases, and certificates, with payroll paid and posted in the same cycle.",
      abM6: "Reports and dashboards",
      abM6D:
        "Operational and financial signals at company, branch, and project level, drawn from the data the operations themselves produced.",
      abG3: "Resources and procurement",
      abM7: "Materials and inventory",
      abM7D:
        "Stock balances and movements plus each project’s demand, with issues tied to the certificate and the cost.",
      abM8: "Procurement and suppliers",
      abM8D:
        "The purchase cycle from request to delivery, with AI reading purchase invoices and entering their data in one click.",
      abM9: "Equipment and maintenance",
      abM9D:
        "Asset and machine records, running hours, and maintenance orders, so you know what a machine costs inside the project.",
      abG4: "Compliance and governance",
      abM10: "Tax invoicing",
      abM10D:
        "A structured tax invoice carrying customer, line, tax, and operating reference data, with a QR code on invoices only.",
      abM11: "Roles and approvals",
      abM11D:
        "Every role sees and approves its own work, and approval is a recorded step in the cycle, not a message on the side.",
      abM12: "Audit trail",
      abM12D:
        "Who changed what, when, and against which reference, so every decision can be reviewed.",
      abFlowK: "One cycle",
      abFlowH: "From tender to journal entry, without re-entering anything.",
      abFlowP:
        "Every stage inherits the reference, quantities, status, and owner from the stage before it, and the operating and financial trail stays connected.",
      abStep1: "Tender and pricing",
      abStep1P: "Scope and pricing.",
      abStep1I: "Passes approved items",
      abStep2: "Contract and budget",
      abStep2P: "Value, plan, and cost centers.",
      abStep2I: "Passes the cost baseline",
      abStep3: "Execution and certificate",
      abStep3P: "Materials, equipment, progress, and amounts due.",
      abStep3I: "Passes the financial impact",
      abStep4: "Journal and margin",
      abStep4P: "Cost, entries, and profit per project.",
      abStep4I: "Makes the real decision visible",
      abTaxK: "Tax compliance by country",
      abTaxH: "Every country has its own tax regime, and every regime has its own path in the code.",
      abTaxP:
        "E-invoicing is not one template translated for every country. Saudi Arabia and Egypt have separate paths, each with its own payload, signature, and submission channel. Any other country is added when its regime is complete, not before.",
      abSaH: "Saudi Arabia — ZATCA",
      abSaP:
        "A path built on the requirements of Phase 2 of Saudi e-invoicing, running in both the simulation and production environments.",
      abSaL1: "A UBL 2.1 XML invoice carrying its lines and tax rates.",
      abSaL2: "A TLV-encoded QR code on the tax invoice.",
      abSaL3: "A UUID, a cryptographic stamp, and a hash chain linking each invoice to the one before it.",
      abSaL4: "A compliance check before submission, then clearance or reporting.",
      abSaL5: "Certificate onboarding (CSR/CSID) from inside the platform.",
      abEgH: "Egypt — ETA",
      abEgP: "A separate path for the Egyptian Tax Authority, available only to a workspace registered in Egypt.",
      abEgL1: "An electronic document following the ETA schema, with invoice types I, C, and D.",
      abEgL2: "A UUID, a long ID, and a QR code on the document.",
      abEgL3: "A mandatory digital signature; an unsigned document is never sent.",
      abEgL4: "The seller’s tax registration number is verified before submission.",
      abEgL5: "A submission queue for pending documents, with retries.",
      abTableCap: "Integration status with each tax authority",
      abTh1: "Country",
      abTh2: "Authority",
      abTh3: "What ENGINEX does",
      abTh4: "Status",
      abRow1C: "Saudi Arabia",
      abRow1D: "UBL invoice, QR code, UUID, signature, hash chain, and submission",
      abRow2C: "Egypt",
      abRow2D: "JSON document, QR code, UUID, digital signature, and submission",
      abRow3C: "Other Arab countries",
      abRow3T: "Local VAT",
      abRow3D: "Tax rate, currency, and invoice fields per country",
      abDone: "Implemented",
      abPartial: "Local fields",
      abTaxNote:
        "We do not claim a direct integration that is not complete. What is implemented is listed above, and what is not implemented is stated plainly as local fields only.",
      abGovK: "Governance",
      abGovH: "Governance is not an extra layer. It is part of the cycle.",
      abGovP: "Permission, isolation, and the record work with every operation, not after it.",
      abGov1H: "Clear roles",
      abGov1P: "Permissions by role, branch, and job, so a user sees only their own work.",
      abGov2H: "Tenant isolation",
      abGov2P: "Logical separation for every organization, and an isolated database per branch when needed.",
      abGov3H: "Full audit trail",
      abGov3P: "Who changed what, when, and against which reference, in every module rather than in reports alone.",
      abGov4H: "Secure data transport",
      abGov4P: "Protected communication with the cloud service, and payment secrets are never stored in the interface.",
      abPlatK: "Platforms",
      abPlatH: "The decision in the office, the execution on site, and the same data everywhere.",
      abPlatP: "Windows, the web, and mobile connect to the same ENGINEX cloud service, according to each user’s role and permission.",
      abPlat1H: "Windows",
      abPlat1P: "A cloud desktop app for printing and daily work, with automatic updates after installation.",
      abPlat2H: "Mobile",
      abPlat2P: "Responsive access for site teams and follow-up, installed from the browser with no installer file.",
      abPlat3H: "Browser",
      abPlat3P: "Direct, secure access from any modern device, with nothing to install.",
      abFreeK: "Start without commitment",
      abFreeH: "A permanent free plan for one user.",
      abFreeP:
        "Invoices, quotations, customers, and expenses, with no payment card and no expiry date. Advanced accounting and branch management are part of the paid plans.",
      abFreeCta: "Compare plans",
      abFreeL1: "One user",
      abFreeL2: "Invoices and quotations",
      abFreeL3: "Customers and expenses",
      abFreeL4: "No payment card",
      abFreeL5: "No expiry date",
      abFreeL6: "Upgrade anytime",
      abCoK: "The company and support",
      abCoH: "A team that builds the system and supports it directly.",
      abCoP:
        "ENGINEX is an Egyptian platform serving organizations in Egypt, Saudi Arabia, and other Arab countries. Support reaches the team that writes the code, not an intermediary call center.",
      abCo1H: "Support",
      abCo1P: "A support channel inside the platform, and direct email for every technical or accounting question.",
      abCo2H: "Sales contact",
      abCo2P: "For commercial questions and branch or module arrangements, reach us on WhatsApp during working days.",
      abCo2A: "Message on WhatsApp",
      abCo3H: "Coverage",
      abCo3P: "Egypt and Saudi Arabia today, and expansion follows the completion of each country’s tax regime, not demand alone.",
      abCloseK: "Start with one project",
      abCloseH: "See the financial impact before the month ends.",
      abCloseP: "Create an ENGINEX workspace, invite your team, and run a 30-day trial with no payment card.",
    },
  },

  "privacy.html": {
    title: "Privacy policy — ENGINEX ERP",
    description:
      "The privacy policy of ENGINEX ERP: the data we process, why we process it, advertising and cookies, and the rights of the account owner.",
    jsonLd:
      '{"@context":"https://schema.org","@type":"WebPage","name":"Privacy policy — ENGINEX ERP","url":"https://enginex2030.com/en/privacy.html","inLanguage":"en","isPartOf":{"@type":"WebSite","name":"ENGINEX ERP","url":"https://enginex2030.com/"}}',
    items: {
      prK: "Privacy",
      prH: "Privacy policy",
      prP:
        "This page explains the principles ENGINEX ERP follows when collecting the account and usage data needed to provide, protect, and improve the service.",
      prH1: "Data and use",
      prP1:
        "We process registration, organization, operational, and support records to run the account, verify security, and deliver the service. We do not sell customer data.",
      prH2: "Advertising and cookies",
      prP2:
        "Advertising placements are disabled by default. If Google AdSense is enabled, Google may use cookies or identifiers subject to consent settings and Google’s policies.",
      prH3: "Your rights",
      prP3:
        "Account owners may request correction of account data or ask about retention through the support channel shown inside the platform.",
      prP4: "For any privacy question, write to support@enginex2030.com.",
    },
  },

  "terms.html": {
    title: "Terms of use — ENGINEX ERP",
    description:
      "The terms of use of the ENGINEX ERP cloud platform: subscription and payment, data responsibility, and lawful use of the service.",
    jsonLd:
      '{"@context":"https://schema.org","@type":"WebPage","name":"Terms of use — ENGINEX ERP","url":"https://enginex2030.com/en/terms.html","inLanguage":"en","isPartOf":{"@type":"WebSite","name":"ENGINEX ERP","url":"https://enginex2030.com/"}}',
    items: {
      teK: "Terms",
      teH: "Terms of use",
      teP:
        "By using ENGINEX ERP, the account owner agrees to provide accurate information, protect login credentials, and use the service for lawful purposes within the active plan.",
      teH1: "Subscription and payment",
      teP1:
        "Current prices, terms, and offers are shown before payment starts. A paid subscription is activated only after the payment provider verifies it. Operational access may stop after the renewal grace period ends.",
      teH2: "Data responsibility",
      teP2:
        "Account owners are responsible for the accuracy of the data their users enter, and for reviewing permissions, documents, and outputs before approving them.",
      teH3: "Limits of the service",
      teP3:
        "The service is provided as it stands within the active plan. The provider is not responsible for commercial or tax decisions taken outside the platform or without professional review.",
    },
  },

  "install.html": {
    title: "Install the app — ENGINEX2030",
    description:
      "The ENGINEX2030 Windows app: download it from the official server, verify the file fingerprint, and install it in a few steps. Mobile apps install from the browser.",
    ogTitle: "Install the app on your device — ENGINEX2030",
    ogDescription: "The Windows app downloads directly from our official server, and mobile apps install from the browser.",
    items: {
      inHome: "Home",
      inInstall: "Install the app",
      inLogin: "Log in",
      inRegister: "Create an account",
      inHeroK: "Install guide",
      inHeroH: "Install the app on your device in minutes",
      inHeroP:
        "Choose your system below. The Windows app downloads directly from our official server, and mobile apps install from the browser with no installer file.",
      inHeroL1: "An encrypted download from the official app.enginex2030.com domain only",
      inHeroL2: "A SHA-512 fingerprint shown in front of you to verify the file",
      inHeroL3: "Automatic updates after installation, with no manual reinstall",
      inFrame1: "Cloud desktop edition",
      inReady: "Ready",
      inFrame2T: "Your data on the server",
      inFrame2S: "Always connected to your account",
      inSync: "In sync",
      inDlLabel: "Download the Windows app",
      inSecWin: "Windows app",
      inSecWinP: "A standalone app that runs on your machine and stays connected to your data on the cloud server.",
      inDlH: "Download the official installer",
      inDlSub:
        "The download button points to the latest release published on the update channel, automatically, with no manual edit for each release.",
      inDlBadge: "Official site",
      inDlBtn: "Download the Windows app ←",
      inDlNote: "Reading the release details…",
      inDtVersion: "Version",
      inDtSize: "File size",
      inDtHash: "File fingerprint (SHA-512)",
      inCopy: "Copy fingerprint",
      inVerifyQ: "How do I verify the file is genuine?",
      inVerifyP1:
        "After the download completes, compare the fingerprint shown above with the one your file system reports. Matching fingerprints mean the file reached you exactly as published, with no change on the way.",
      inVerifyP2A: "The download runs over",
      inVerifyP2B: "only. Never run an installer that arrived from another link or from an email message.",
      inMobLabel: "Mobile apps",
      inSecMob: "Mobile",
      inSecMobP: "Neither Android nor iPhone needs an installer file — both install straight from the browser.",
      inAndSub: "Install from the browser",
      inAnd1A: "Open",
      inAnd1B: "in Chrome on your Android device.",
      inAnd2: "From the browser menu, choose “Install app” or “Add to Home screen”.",
      inAnd3: "Open the new icon and sign in.",
      inIosTitle: "iPhone and iPad",
      inIosSub: "Install from Safari",
      inIos1A: "Open",
      inIos1B: "in Safari.",
      inIos2: "Tap the share button, then “Add to Home Screen”.",
      inIos3: "Confirm the addition and open the app from the icon.",
      inNote:
        "Installing does not move your organization’s database to the phone; an internet connection is required to keep working, and everything stays stored on the server.",
      inFootP: "A complete cloud accounting system for contracting, construction, and related sectors.",
      inFootApp: "The app",
      inFootMore: "More",
    },
  },

  "404.html": {
    title: "Page not found — ENGINEX ERP",
    description: "The page you requested does not exist or has moved.",
    items: {
      nfH: "Page not found",
      nfP: "The link you opened does not exist or has moved.",
      nfHome: "Home page",
      nfInstall: "Download the app",
    },
  },

  "offline.html": {
    title: "Connection to the cloud — ENGINEX2030",
    description: "An internet connection is required to reach your organization’s data.",
    items: {
      ofH: "We need an internet connection",
      ofP: "Your organization’s data is stored on the server. Reconnect and return to the app to continue your work.",
      ofA: "Back to the app",
    },
  },
};
