import { useI18n } from "@/lib/i18n";
import { Card } from "@/components/ui/card";

export default function Privacy() {
  const { lang } = useI18n();
  const sv = lang === "sv";

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 pt-28 pb-16">
        {/* Header */}
        <div className="text-center mb-14">
          <p className="text-xs font-medium uppercase tracking-[0.15em] text-primary mb-3">
            {sv ? "JURIDISKT" : "LEGAL"}
          </p>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight mb-4" style={{ letterSpacing: "-0.02em" }}>
            {sv ? "Integritetspolicy" : "Privacy Policy"}
          </h1>
          <div className="w-16 h-1 bg-primary/60 mx-auto rounded-full mb-4" />
          <p className="text-sm text-muted-foreground">
            {sv ? "Senast uppdaterad: mars 2026" : "Last updated: March 2026"}
          </p>
        </div>

        <Card className="p-8 sm:p-10 space-y-8 text-sm leading-relaxed shadow-lg">
          {/* Section 1 */}
          <section>
            <h2 className="text-lg font-medium mb-3">
              {sv ? "1. Vilka uppgifter samlar vi in?" : "1. What data do we collect?"}
            </h2>
            <p className="text-muted-foreground">
              {sv
                ? "När du skapar ett konto på Wedda samlar vi in följande personuppgifter:"
                : "When you create an account on Wedda, we collect the following personal data:"}
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
              <li>{sv ? "Namn" : "Name"}</li>
              <li>{sv ? "E-postadress" : "Email address"}</li>
              <li>{sv ? "Telefonnummer (valfritt)" : "Phone number (optional)"}</li>
              <li>{sv ? "Bröllopsdatum, plats och budget" : "Wedding date, location, and budget"}</li>
              <li>{sv ? "Antal gäster" : "Number of guests"}</li>
            </ul>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-lg font-medium mb-3">
              {sv ? "2. Hur använder vi era uppgifter?" : "2. How do we use your data?"}
            </h2>
            <p className="text-muted-foreground">
              {sv
                ? "Dina personuppgifter används för att:"
                : "Your personal data is used to:"}
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
              <li>{sv ? "Skapa och hantera ditt konto" : "Create and manage your account"}</li>
              <li>{sv ? "Förmedla kontakt mellan dig och leverantörer" : "Facilitate contact between you and vendors"}</li>
              <li>{sv ? "Skicka förfrågningar och beställningar till leverantörer" : "Send inquiries and orders to vendors"}</li>
              <li>{sv ? "Anpassa paketrekommendationer baserat på dina önskemål" : "Customize package recommendations based on your preferences"}</li>
              <li>{sv ? "Förbättra vår tjänst och användarupplevelse" : "Improve our service and user experience"}</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-lg font-medium mb-3">
              {sv ? "3. Dina rättigheter enligt GDPR" : "3. Your rights under GDPR"}
            </h2>
            <p className="text-muted-foreground">
              {sv
                ? "Enligt EU:s dataskyddsförordning (GDPR) har du följande rättigheter:"
                : "Under the EU General Data Protection Regulation (GDPR), you have the following rights:"}
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
              <li>{sv ? "Rätt att få tillgång till dina personuppgifter" : "Right to access your personal data"}</li>
              <li>{sv ? "Rätt till rättelse av felaktiga uppgifter" : "Right to correction of inaccurate data"}</li>
              <li>{sv ? "Rätt till radering ('rätten att bli glömd')" : "Right to erasure ('right to be forgotten')"}</li>
              <li>{sv ? "Rätt att begränsa behandlingen av dina uppgifter" : "Right to restrict processing of your data"}</li>
              <li>{sv ? "Rätt till dataportabilitet" : "Right to data portability"}</li>
              <li>{sv ? "Rätt att invända mot behandling" : "Right to object to processing"}</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-lg font-medium mb-3">
              {sv ? "4. Delning med tredje part" : "4. Third-party sharing"}
            </h2>
            <p className="text-muted-foreground">
              {sv
                ? "Vi delar dina kontaktuppgifter med de leverantörer du väljer att skicka förfrågningar till. Vi säljer aldrig dina uppgifter till tredje part i marknadsföringssyfte."
                : "We share your contact details with the vendors you choose to send inquiries to. We never sell your data to third parties for marketing purposes."}
            </p>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-lg font-medium mb-3">
              {sv ? "5. Cookies och lokal lagring" : "5. Cookies and local storage"}
            </h2>
            <p className="text-muted-foreground">
              {sv
                ? "Wedda använder inga cookies eller lokal lagring. Inloggningsstatus hanteras helt via applikationens tillstånd och varar bara under pågående session."
                : "Wedda does not use cookies or local storage. Login state is managed entirely through application state and only lasts for the current session."}
            </p>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-lg font-medium mb-3">
              {sv ? "6. Datasäkerhet" : "6. Data security"}
            </h2>
            <p className="text-muted-foreground">
              {sv
                ? "Vi vidtar lämpliga tekniska och organisatoriska åtgärder för att skydda dina personuppgifter. Lösenord lagras som krypterade hashvärden (bcrypt) och överförs aldrig i klartext."
                : "We take appropriate technical and organizational measures to protect your personal data. Passwords are stored as encrypted hash values (bcrypt) and are never transmitted in plaintext."}
            </p>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-lg font-medium mb-3">
              {sv ? "7. Kontakt" : "7. Contact"}
            </h2>
            <p className="text-muted-foreground">
              {sv
                ? "Om du har frågor om vår integritetspolicy eller vill utöva dina rättigheter, kontakta oss:"
                : "If you have questions about our privacy policy or wish to exercise your rights, contact us:"}
            </p>
            <p className="mt-2">
              <a href="mailto:jonatan.siden@gmail.com,svenake62@gmail.com" className="text-primary hover:underline">
                jonatan.siden@gmail.com
              </a>
            </p>
          </section>
        </Card>
      </div>
    </div>
  );
}
