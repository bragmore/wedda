import { createContext, useContext, useState, type ReactNode } from "react";

type Lang = "sv" | "en";

const translations = {
  // Navigation
  "nav.home": { sv: "Hem", en: "Home" },
  "nav.categories": { sv: "Tjänster", en: "Services" },
  "nav.products": { sv: "Produkter", en: "Products" },
  "nav.builder": { sv: "Bröllopsguide", en: "Wedding Guide" },
  "nav.dashboard": { sv: "Min portal", en: "My Portal" },

  // Hero
  "hero.title": { sv: "Skräddarsy ert", en: "Tailor your" },
  "hero.titleAccent": { sv: "drömbröllop", en: "dream wedding" },
  "hero.subtitle": { sv: "Jämför, välj och boka – allt du behöver för drömbröllopet i hela Sverige", en: "Compare, choose and book — everything you need for the dream wedding across all of Sweden" },
  "hero.cta": { sv: "Börja planera", en: "Start planning" },
  "hero.ctaSecondary": { sv: "Se alla tjänster", en: "View all services" },

  // How it works
  "how.title": { sv: "Så fungerar det", en: "How it works" },
  "how.step1.title": { sv: "Berätta om er", en: "Tell us about you" },
  "how.step1.desc": { sv: "Ange era uppgifter, budget, antal gäster och var i Sverige ni gifter er.", en: "Enter your details, budget, guest count, and where in Sweden you're getting married." },
  "how.step2.title": { sv: "Välj & anpassa", en: "Choose & customize" },
  "how.step2.desc": { sv: "Få färdiga paket eller handplocka varje produkt och tjänst.", en: "Get ready-made packages or hand-pick every product and service." },
  "how.step3.title": { sv: "Beställ direkt", en: "Order directly" },
  "how.step3.desc": { sv: "Med ett klick skickas beställningen direkt till varje leverantör via e-post.", en: "With one click, your order is sent directly to each vendor via email." },

  // Categories
  "categories.title": { sv: "Alla tjänster", en: "All services" },
  "categories.subtitle": { sv: "Allt ni behöver för bröllopet i hela Sverige", en: "Everything you need for the wedding across all of Sweden" },
  "categories.explore": { sv: "Utforska", en: "Explore" },

  // Products
  "products.title": { sv: "Produkter & Tjänster", en: "Products & Services" },
  "products.search": { sv: "Sök produkt...", en: "Search product..." },
  "products.all": { sv: "Alla", en: "All" },
  "products.addToPackage": { sv: "Lägg till", en: "Add" },
  "products.added": { sv: "Vald ✓", en: "Selected ✓" },
  "products.from": { sv: "från", en: "from" },
  "products.priceOnDemand": { sv: "Pris på förfrågan", en: "Price on request" },

  // Home
  "home.featured": { sv: "Populära val", en: "Popular picks" },
  "home.viewAll": { sv: "Visa alla produkter", en: "View all products" },

  // Wizard steps
  "wizard.title": { sv: "Bröllopsguiden", en: "Wedding Guide" },
  "wizard.subtitle": { sv: "Steg för steg till ert drömbröllop", en: "Step by step to your dream wedding" },
  "wizard.step1": { sv: "Era uppgifter", en: "Your details" },
  "wizard.step1.label": { sv: "Konto", en: "Account" },
  "wizard.step2": { sv: "Budget & Detaljer", en: "Budget & Details" },
  "wizard.step3": { sv: "Kategorier", en: "Categories" },
  "wizard.step4": { sv: "Välj paket", en: "Choose package" },
  "wizard.step5": { sv: "Granska & Skicka", en: "Review & Send" },

  "wizard.contact.title": { sv: "Era uppgifter som skickas med beställningen", en: "Your details sent with the order" },
  "wizard.contact.subtitle": { sv: "Dessa uppgifter skickas automatiskt till leverantörerna", en: "These details are sent automatically to vendors" },
  "wizard.contact.name": { sv: "Fullständigt namn", en: "Full name" },
  "wizard.contact.namePlaceholder": { sv: "Anna & Erik Svensson", en: "Anna & Erik Svensson" },
  "wizard.contact.email": { sv: "E-postadress", en: "Email address" },
  "wizard.contact.phone": { sv: "Telefonnummer", en: "Phone number" },
  "wizard.contact.phonePlaceholder": { sv: "070-123 45 67", en: "070-123 45 67" },
  "wizard.contact.date": { sv: "Planerat bröllopsdatum (valfritt)", en: "Planned wedding date (optional)" },

  "wizard.budget.title": { sv: "Budget & plats", en: "Budget & location" },
  "wizard.budget.subtitle": { sv: "Vi anpassar rekommendationerna efter er budget och plats", en: "We'll tailor recommendations to your budget and location" },
  "wizard.budget.custom": { sv: "Ange belopp i SEK", en: "Enter amount in SEK" },
  "wizard.budget.label": { sv: "Vad är er totala budget?", en: "What is your total budget?" },

  "wizard.size.title": { sv: "Hur stort bröllop planerar ni?", en: "How big is the wedding?" },
  "wizard.size.subtitle": { sv: "Antal gäster påverkar priser och val", en: "Guest count affects pricing and options" },
  "wizard.size.guests": { sv: "Antal gäster", en: "Number of guests" },

  "wizard.location.title": { sv: "Var i Sverige gifter ni er?", en: "Where in Sweden are you getting married?" },
  "wizard.location.subtitle": { sv: "Vi visar leverantörer i ert område", en: "We'll show vendors in your area" },

  "wizard.categories.title": { sv: "Vilka tjänster behöver ni?", en: "What services do you need?" },
  "wizard.categories.subtitle": { sv: "Välj de kategorier ni vill ha med i ert paket", en: "Select the categories you want in your package" },

  "wizard.packages.title": { sv: "Välj ett paket", en: "Choose a package" },
  "wizard.packages.subtitle": { sv: "Vi har plockat ihop färdiga paket baserat på era val", en: "We've assembled ready-made packages based on your selections" },
  "wizard.packages.custom": { sv: "Välj produkter manuellt", en: "Choose products manually" },
  "wizard.packages.manual": { sv: "Handplocka produkter", en: "Hand-pick products" },
  "wizard.packages.allProducts": { sv: "Visa alla produkter", en: "Show all products" },
  "wizard.packages.selectPackage": { sv: "Välj detta paket", en: "Choose this package" },
  "wizard.packages.selected": { sv: "Valt paket", en: "Selected package" },
  "wizard.packages.premium": { sv: "Premium", en: "Premium" },
  "wizard.packages.standard": { sv: "Standard", en: "Standard" },
  "wizard.packages.budget": { sv: "Budget", en: "Budget" },
  "wizard.packages.includes": { sv: "Inkluderar", en: "Includes" },
  "wizard.packages.productsIncluded": { sv: "produkter", en: "products" },

  "wizard.products.title": { sv: "Välj produkter & tjänster", en: "Choose products & services" },
  "wizard.products.subtitle": { sv: "Handplocka det ni vill ha", en: "Hand-pick what you want" },
  "wizard.products.recommended": { sv: "Rekommenderat paket", en: "Recommended package" },
  "wizard.products.useRecommended": { sv: "Använd rekommenderat", en: "Use recommended" },
  "wizard.products.pickManually": { sv: "Välj manuellt", en: "Pick manually" },

  "wizard.review.title": { sv: "Granska ert bröllopspaket", en: "Review your wedding package" },
  "wizard.review.subtitle": { sv: "Kontrollera era val innan beställningen skickas", en: "Check your selections before the order is sent" },
  "wizard.review.total": { sv: "Uppskattat totalpris", en: "Estimated total" },
  "wizard.review.podNote": { sv: "Pris på förfrågan – leverantören meddelar pris efter beställning", en: "Price on request — vendor will provide pricing after order" },

  // Builder (keep old keys for backward compat)
  "builder.title": { sv: "Bygg ert bröllopspaket", en: "Build your wedding package" },
  "builder.subtitle": { sv: "Välj leverantörer i varje kategori", en: "Select vendors in each category" },
  "builder.selected": { sv: "Vald", en: "Selected" },
  "builder.select": { sv: "Välj", en: "Select" },
  "builder.remove": { sv: "Ta bort", en: "Remove" },
  "builder.next": { sv: "Nästa", en: "Next" },
  "builder.prev": { sv: "Tillbaka", en: "Back" },
  "builder.skip": { sv: "Hoppa över", en: "Skip" },
  "builder.review": { sv: "Granska paket", en: "Review package" },
  "builder.empty": { sv: "Inga leverantörer valda ännu", en: "No vendors selected yet" },

  // Summary / Checkout
  "summary.title": { sv: "Ert bröllopspaket", en: "Your wedding package" },
  "summary.vendor": { sv: "Leverantör", en: "Vendor" },
  "summary.category": { sv: "Kategori", en: "Category" },
  "summary.notes": { sv: "Meddelande till leverantör", en: "Message to vendor" },
  "summary.notesPlaceholder": { sv: "T.ex. datum, antal gäster, önskemål...", en: "E.g. date, number of guests, wishes..." },
  "summary.send": { sv: "Skicka beställning", en: "Send order" },
  "summary.sending": { sv: "Skickar...", en: "Sending..." },
  "summary.success": { sv: "Beställning skickad!", en: "Order sent!" },
  "summary.successMsg": { sv: "Era beställningar har skickats till alla valda leverantörer via e-post. Ni kan följa svaren i er portal.", en: "Your orders have been sent to all selected vendors via email. You can track responses in your portal." },
  "summary.goPortal": { sv: "Gå till min portal", en: "Go to my portal" },
  "summary.stickyTotal": { sv: "Totalt", en: "Total" },
  "summary.stickyProducts": { sv: "produkter valda", en: "products selected" },
  "summary.stickyPod": { sv: "inkl. pris på förfrågan", en: "incl. price on request" },

  // Registration
  "register.title": { sv: "Skapa konto", en: "Create account" },
  "register.name": { sv: "Ert namn", en: "Your name" },
  "register.email": { sv: "E-post", en: "Email" },
  "register.date": { sv: "Bröllopsdatum", en: "Wedding date" },
  "register.submit": { sv: "Fortsätt", en: "Continue" },

  // Dashboard
  "dash.title": { sv: "Min portal", en: "My Portal" },
  "dash.orders": { sv: "Mina beställningar", en: "My orders" },
  "dash.noOrders": { sv: "Inga beställningar ännu. Börja med bröllopsguiden!", en: "No orders yet. Start with the wedding guide!" },
  "dash.status.pending": { sv: "Väntar", en: "Pending" },
  "dash.status.sent": { sv: "Skickad", en: "Sent" },
  "dash.status.quoted": { sv: "Offert mottagen", en: "Quote received" },
  "dash.status.accepted": { sv: "Accepterad", en: "Accepted" },
  "dash.status.declined": { sv: "Avböjd", en: "Declined" },
  "dash.total": { sv: "Totalbelopp", en: "Total amount" },
  "dash.perService": { sv: "Per tjänst", en: "Per service" },
  "dash.simulateQuote": { sv: "Simulera offert", en: "Simulate quote" },

  // General
  "general.location": { sv: "Plats", en: "Location" },
  "general.price": { sv: "Pris", en: "Price" },
  "general.rating": { sv: "Betyg", en: "Rating" },
  "general.viewAll": { sv: "Visa alla", en: "View all" },
  "general.featured": { sv: "Utvald", en: "Featured" },
  "general.sek": { sv: "kr", en: "SEK" },
  "general.loading": { sv: "Laddar...", en: "Loading..." },

  // Footer
  "footer.tagline": { sv: "Sveriges smartaste bröllopsguide – hela Sverige", en: "Sweden's smartest wedding guide — all of Sweden" },
  "footer.about": { sv: "Om Wedda", en: "About Wedda" },
  "footer.contact": { sv: "Kontakt", en: "Contact" },
  "footer.privacy": { sv: "Integritet", en: "Privacy" },
} as const;

type TranslationKey = keyof typeof translations;

interface I18nContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextType>({
  lang: "sv",
  setLang: () => {},
  t: (key) => key,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("sv");

  const t = (key: TranslationKey): string => {
    const entry = translations[key];
    if (!entry) return key;
    return entry[lang] || key;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
