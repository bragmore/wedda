import { useI18n } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Heart, Users, Sparkles, Mail } from "lucide-react";

export default function About() {
  const { lang } = useI18n();
  const sv = lang === "sv";

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 pt-28 pb-16">
        {/* Header */}
        <div className="text-center mb-14">
          <p className="text-xs font-medium uppercase tracking-[0.15em] text-primary mb-3">
            {sv ? "VÅR HISTORIA" : "OUR STORY"}
          </p>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight mb-4" style={{ letterSpacing: "-0.02em" }}>
            {sv ? "Om Wedda" : "About Wedda"}
          </h1>
          <div className="w-16 h-1 bg-primary/60 mx-auto rounded-full" />
        </div>

        {/* Intro */}
        <div className="prose prose-sm max-w-none mb-12 text-center">
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {sv
              ? "Wedda är Sveriges smartaste bröllopsguide — en plattform som hjälper blivande brudar och brudgummar att planera sitt drömbröllop, oavsett var i Sverige de gifter sig."
              : "Wedda is Sweden's smartest wedding guide — a platform that helps brides and grooms plan their dream wedding, wherever in Sweden they're getting married."}
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <Card className="p-8 text-center hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-7 w-7 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">{sv ? "Skräddarsydda paket" : "Tailored packages"}</h3>
            <p className="text-sm text-muted-foreground">
              {sv
                ? "Ange er budget, plats och önskemål — vi sätter ihop paket som passar just er."
                : "Enter your budget, location, and wishes — we put together packages that suit you perfectly."}
            </p>
          </Card>
          <Card className="p-8 text-center hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Users className="h-7 w-7 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">{sv ? "Verifierade leverantörer" : "Verified vendors"}</h3>
            <p className="text-sm text-muted-foreground">
              {sv
                ? "Vi samarbetar med hundratals leverantörer över hela Sverige — från fotografer till florister."
                : "We work with hundreds of vendors across Sweden — from photographers to florists."}
            </p>
          </Card>
          <Card className="p-8 text-center hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Heart className="h-7 w-7 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">{sv ? "Allt på ett ställe" : "Everything in one place"}</h3>
            <p className="text-sm text-muted-foreground">
              {sv
                ? "Jämför, välj och skicka förfrågningar till alla era leverantörer — direkt från Wedda."
                : "Compare, choose, and send inquiries to all your vendors — directly from Wedda."}
            </p>
          </Card>
        </div>

        {/* How it works */}
        <div className="mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-center mb-8" style={{ letterSpacing: "-0.02em" }}>
            {sv ? "Så fungerar Wedda" : "How Wedda works"}
          </h2>
          <div className="space-y-6 max-w-2xl mx-auto">
            {[
              {
                num: "1",
                title: sv ? "Skapa ett konto" : "Create an account",
                desc: sv
                  ? "Registrera dig gratis och berätta om ert bröllop — datum, plats, budget och antal gäster."
                  : "Sign up for free and tell us about your wedding — date, location, budget, and guest count.",
              },
              {
                num: "2",
                title: sv ? "Välj era tjänster" : "Choose your services",
                desc: sv
                  ? "Bläddra bland kategorier som lokal, fotograf, catering och blommor. Välj färdiga paket eller handplocka varje tjänst."
                  : "Browse categories like venue, photographer, catering, and flowers. Choose ready-made packages or hand-pick each service.",
              },
              {
                num: "3",
                title: sv ? "Skicka förfrågningar" : "Send inquiries",
                desc: sv
                  ? "Med ett klick skickas era önskemål till varje leverantör. Följ svar och offerter direkt i er portal."
                  : "With one click, your requests are sent to each vendor. Track responses and quotes directly in your portal.",
              },
            ].map(step => (
              <div key={step.num} className="flex gap-4">
                <span className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                  {step.num}
                </span>
                <div>
                  <h3 className="font-medium text-sm">{step.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contact */}
        <Card className="p-10 text-center shadow-xl">
          <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Mail className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-xl font-bold mb-2" style={{ letterSpacing: "-0.02em" }}>{sv ? "Kontakta oss" : "Contact us"}</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {sv
              ? "Har ni frågor eller vill samarbeta med Wedda? Hör av er!"
              : "Have questions or want to partner with Wedda? Get in touch!"}
          </p>
          <a
            href="mailto:jonatan.siden@gmail.com,svenake62@gmail.com"
            className="text-primary hover:underline text-sm"
          >
            jonatan.siden@gmail.com
          </a>
        </Card>
      </div>
    </div>
  );
}
