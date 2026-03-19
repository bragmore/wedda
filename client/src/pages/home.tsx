import { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "wouter";
import { useI18n } from "@/lib/i18n";
import { usePackage } from "@/lib/package-context";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import type { Category, Product } from "@shared/schema";
import {
  Castle, UtensilsCrossed, Camera, Music, Flower2, Sparkles,
  CircleDot, Heart, Palette, Video, Car, Cake, Mail, Lamp,
  PartyPopper, ClipboardList, Shirt, Lightbulb, ArrowRight,
  Building2, Scissors, Briefcase, AlertCircle, Plus, Check,
} from "lucide-react";


const iconMap: Record<string, any> = {
  Castle, UtensilsCrossed, Camera, Music, Flower2, Sparkles,
  CircleDot, Heart, Palette, Video, Car, Cake, Mail, Lamp,
  PartyPopper, ClipboardList, Shirt, Lightbulb, Building2, Scissors, Briefcase,
};

const HERO_VIDEOS = [
  "https://videos.pexels.com/video-files/8775884/8775884-hd_1280_720_25fps.mp4",
  "https://videos.pexels.com/video-files/8246896/8246896-hd_1920_1080_25fps.mp4",
  "https://videos.pexels.com/video-files/13038199/13038199-hd_1920_1080_25fps.mp4",
];

function VideoHero({ children }: { children: React.ReactNode }) {
  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);
  const [activeVideo, setActiveVideo] = useState<"A" | "B">("A");
  const [dotIndex, setDotIndex] = useState(0);
  const sequenceRef = useRef(0);
  const fadingRef = useRef(false);
  const FADE_DUR = 1.5; // seconds — crossfade duration

  useEffect(() => {
    const vidA = videoARef.current;
    const vidB = videoBRef.current;
    if (!vidA || !vidB) return;

    let disposed = false;

    // Set initial sources
    vidA.src = HERO_VIDEOS[0];
    vidA.load();
    vidA.style.opacity = "1";
    vidB.style.opacity = "0";

    // Preload video B with next clip
    vidB.src = HERO_VIDEOS[1 % HERO_VIDEOS.length];
    vidB.load();

    // Start playing A
    vidA.play().catch(() => {});
    // Also start B silently so it's decoded and ready
    vidB.play().catch(() => {});

    let currentSeq = 0;

    function getActiveEl(): HTMLVideoElement { return (currentSeq % 2 === 0 ? vidA : vidB)!; }
    function getStandbyEl(): HTMLVideoElement { return (currentSeq % 2 === 0 ? vidB : vidA)!; }

    function crossfade() {
      if (disposed || fadingRef.current) return;
      fadingRef.current = true;

      const active = getActiveEl();
      const standby = getStandbyEl();

      // Make sure standby is playing from start
      standby.currentTime = 0;
      standby.play().catch(() => {});

      // Fade: active out, standby in
      active.style.transition = `opacity ${FADE_DUR}s ease-in-out`;
      standby.style.transition = `opacity ${FADE_DUR}s ease-in-out`;
      active.style.opacity = "0";
      standby.style.opacity = "1";

      currentSeq++;
      sequenceRef.current = currentSeq;
      const nextClipIdx = (currentSeq + 1) % HERO_VIDEOS.length;

      // Update dots
      setDotIndex(currentSeq % HERO_VIDEOS.length);
      setActiveVideo(currentSeq % 2 === 0 ? "A" : "B");

      // After fade completes, prepare the now-hidden element for next clip
      setTimeout(() => {
        if (disposed) return;
        fadingRef.current = false;
        const nowHidden = active; // the one that faded out
        nowHidden.style.transition = "none";
        nowHidden.src = HERO_VIDEOS[nextClipIdx];
        nowHidden.load();
        nowHidden.play().catch(() => {});
      }, FADE_DUR * 1000 + 100);
    }

    // Listen for timeupdate on both videos to trigger crossfade near end
    function handleTimeUpdate(e: Event) {
      const vid = e.target as HTMLVideoElement;
      const isActive = (currentSeq % 2 === 0 && vid === vidA) || (currentSeq % 2 !== 0 && vid === vidB);
      if (!isActive) return;
      if (vid.duration && vid.currentTime > vid.duration - FADE_DUR - 0.5 && !fadingRef.current) {
        crossfade();
      }
    }

    vidA.addEventListener("timeupdate", handleTimeUpdate);
    vidB.addEventListener("timeupdate", handleTimeUpdate);

    // Fallback: if video is very long or timeupdate doesn't fire, crossfade after 8s
    let fallbackInterval = setInterval(() => {
      if (!fadingRef.current) {
        const active = getActiveEl();
        if (active.currentTime > 7) crossfade();
      }
    }, 1000);

    return () => {
      disposed = true;
      vidA.removeEventListener("timeupdate", handleTimeUpdate);
      vidB.removeEventListener("timeupdate", handleTimeUpdate);
      clearInterval(fallbackInterval);
    };
  }, []);

  return (
    <section className="relative h-screen min-h-[600px] flex items-center justify-center overflow-hidden" data-testid="section-hero">
      {/* Fallback poster image (base layer) */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1519741497674-611481863552?w=1920&h=1080&fit=crop')", zIndex: 0 }}
      />

      {/* Video A */}
      <video
        ref={videoARef}
        muted
        playsInline
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ zIndex: 1 }}
      />

      {/* Video B */}
      <video
        ref={videoBRef}
        muted
        playsInline
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ zIndex: 2 }}
      />

      {/* Cinematic overlay gradient */}
      <div
        className="absolute inset-0"
        style={{
          zIndex: 3,
          background: "linear-gradient(to top, hsl(30 20% 5% / 0.85) 0%, hsl(30 15% 8% / 0.5) 40%, hsl(30 10% 10% / 0.25) 70%, transparent 100%)",
        }}
      />

      {/* Content */}
      <div className="relative" style={{ zIndex: 4 }}>
        {children}
      </div>

      {/* Gradient fade bottom (replaces SVG curve) */}
      <div
        className="absolute bottom-0 left-0 right-0 h-32"
        style={{
          zIndex: 4,
          background: "linear-gradient(to top, var(--background) 0%, transparent 100%)",
        }}
      />

      {/* Video indicator dots */}
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-2" style={{ zIndex: 5 }}>
        {HERO_VIDEOS.map((_, i) => (
          <div
            key={i}
            className={`h-2 rounded-full transition-all duration-500 ${
              i === dotIndex ? "bg-white w-6" : "bg-white/40 w-2"
            }`}
          />
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  const { t, lang } = useI18n();
  const { toggleProduct, isProductSelected } = usePackage();
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());

  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ["/api/categories"],
    queryFn: () => apiRequest("GET", "/api/categories").then(r => r.json()),
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    queryFn: () => apiRequest("GET", "/api/products").then(r => r.json()),
  });

  // Filter only parent categories for display
  const parentCategories = useMemo(() =>
    categories.filter((c: any) => !c.parentId),
  [categories]);

  // Only child categories for links
  const childCategories = useMemo(() =>
    categories.filter((c: any) => c.parentId),
  [categories]);

  // Featured products: only those with prices
  const featuredProducts = useMemo(() =>
    products.filter(p => p.price_from && p.price_from > 0).slice(0, 8),
  [products]);

  // Intersection observer for scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setVisibleSections(prev => new Set([...prev, entry.target.id]));
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );

    document.querySelectorAll("[data-animate]").forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [products.length, categories.length]);

  const getCategoryName = (categoryId: string) => {
    const cat = categories.find((c: any) => c.slug === categoryId || (c as any).id === categoryId);
    if (!cat) return categoryId;
    return lang === "sv" ? cat.nameSv : cat.nameEn;
  };

  const isVisible = (id: string) => visibleSections.has(id);

  // Parallax scroll effect
  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen relative">
      {/* Subtle parallax wedding background */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23b8860b' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          transform: `translateY(${scrollY * 0.1}px)`,
          zIndex: 0,
        }}
      />
      <div className="relative" style={{ zIndex: 1 }}>
      {/* Hero Section with Video */}
      <VideoHero>
        <div className="text-center text-white px-4 sm:px-6 max-w-4xl mx-auto">
          <p className="text-xs sm:text-sm font-medium uppercase tracking-[0.3em] mb-6 text-white/70 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            {lang === "sv" ? "SVERIGES BRÖLLOPSGUIDE" : "SWEDEN'S WEDDING GUIDE"}
          </p>
          <h1
            className="text-5xl md:text-7xl lg:text-8xl font-extrabold uppercase mb-6 leading-[1.05] animate-fade-in-up"
            style={{ animationDelay: "0.4s", letterSpacing: "-0.03em" }}
          >
            {lang === "sv" ? "SKRÄDDARSY ERT DRÖMBRÖLLOP" : "TAILOR YOUR DREAM WEDDING"}
          </h1>
          <p className="text-lg md:text-xl font-light mb-10 text-white/80 max-w-2xl mx-auto leading-relaxed animate-fade-in-up" style={{ animationDelay: "0.6s" }}>
            {t("hero.subtitle")}
          </p>
          <div className="animate-fade-in-up" style={{ animationDelay: "0.8s" }}>
            <Link href="/builder">
              <Button size="lg" className="cursor-pointer text-base px-10 py-6 uppercase tracking-wider" data-testid="button-hero-cta">
                {lang === "sv" ? "BÖRJA PLANERA" : "START PLANNING"}
              </Button>
            </Link>
          </div>
        </div>
      </VideoHero>

      {/* How it works */}
      <section
        id="section-how"
        data-animate
        className={`py-24 sm:py-32 bg-background transition-all duration-700 ${isVisible("section-how") ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
        data-testid="section-how"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center mb-20">
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-primary mb-3">
              {lang === "sv" ? "SÅ FUNGERAR DET" : "HOW IT WORKS"}
            </p>
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight mb-4" style={{ letterSpacing: "-0.02em" }}>{t("how.title")}</h2>
            <div className="w-16 h-1 bg-primary/60 mx-auto rounded-full" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-0 relative">
            {[
              { num: "01", title: t("how.step1.title"), desc: t("how.step1.desc") },
              { num: "02", title: t("how.step2.title"), desc: t("how.step2.desc") },
              { num: "03", title: t("how.step3.title"), desc: t("how.step3.desc") },
            ].map((step, i) => (
              <div
                key={step.num}
                className="relative text-center md:text-left px-6 md:px-10 transition-all duration-500"
                style={{ transitionDelay: `${i * 150}ms` }}
              >
                {/* Elegant connector line between steps (desktop) */}
                {i < 2 && (
                  <div className="hidden md:block absolute top-[3.5rem] -right-[1px] w-px h-24 z-10">
                    <div className="w-px h-full bg-gradient-to-b from-primary/30 via-primary/15 to-transparent" />
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary/25" />
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary/15" />
                  </div>
                )}
                {/* Elegant connector line between steps (mobile) */}
                {i < 2 && (
                  <div className="md:hidden flex justify-center py-4 absolute -bottom-6 left-1/2 -translate-x-1/2">
                    <div className="h-px w-16 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
                  </div>
                )}
                {/* Vertical divider between columns (desktop) */}
                {i > 0 && (
                  <div className="hidden md:block absolute left-0 top-8 bottom-8 w-px bg-gradient-to-b from-transparent via-border to-transparent" />
                )}
                <span className="text-8xl font-extralight text-primary/15 block mb-4 leading-none select-none">{step.num}</span>
                <h3 className="text-xl font-bold mb-3" style={{ letterSpacing: "-0.01em" }}>{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-[1.7]">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products Preview */}
      <section
        id="section-featured"
        data-animate
        className={`py-24 sm:py-32 transition-all duration-700 ${isVisible("section-featured") ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
        data-testid="section-featured"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex items-end justify-between mb-14">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.15em] text-primary mb-3">
                {lang === "sv" ? "UTVALDA" : "FEATURED"}
              </p>
              <h2 className="text-3xl sm:text-5xl font-bold tracking-tight mb-3" style={{ letterSpacing: "-0.02em" }}>
                {t("home.featured")}
              </h2>
              <div className="w-16 h-1 bg-primary/60 rounded-full" />
            </div>
            <Link href="/products">
              <Button variant="outline" size="sm" className="cursor-pointer gap-1.5">
                {t("home.viewAll")} <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {featuredProducts.map((product, i) => {
              const selected = isProductSelected(product.id);
              return (
                <Card
                  key={product.id}
                  className="group overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1.5"
                  style={{ transitionDelay: `${i * 60}ms` }}
                  data-testid={`card-product-${product.id}`}
                >
                  <div className="aspect-square overflow-hidden rounded-t-3xl">
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-sm truncate mb-0.5">{product.name}</h3>
                    <p className="text-xs text-muted-foreground mb-1.5">
                      {getCategoryName(product.category_id)}
                    </p>
                    {product.price_from ? (
                      <p className="text-sm font-bold text-primary mb-3">
                        {product.price_from.toLocaleString("sv-SE")} {t("general.sek")}
                      </p>
                    ) : (
                      <p className="text-xs text-amber-600 mb-3 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {t("products.priceOnDemand")}
                      </p>
                    )}
                    <Button
                      variant={selected ? "secondary" : "outline"}
                      size="sm"
                      className="w-full text-xs"
                      onClick={(e) => {
                        e.preventDefault();
                        toggleProduct(product.id);
                      }}
                    >
                      {selected ? (
                        <><Check className="h-3 w-3 mr-1" /> {t("products.added")}</>
                      ) : (
                        <><Plus className="h-3 w-3 mr-1" /> {t("products.addToPackage")}</>
                      )}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Parent Categories */}
      <section
        id="section-categories"
        data-animate
        className={`py-20 sm:py-28 bg-background transition-all duration-700 ${isVisible("section-categories") ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
        data-testid="section-categories"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-primary mb-3">
              {lang === "sv" ? "KATEGORIER" : "CATEGORIES"}
            </p>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight mb-3" style={{ letterSpacing: "-0.02em" }}>
              {lang === "sv" ? "Allt för bröllopet" : "Everything for the wedding"}
            </h2>
            <div className="w-16 h-1 bg-primary/60 mx-auto rounded-full" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
            {parentCategories.map((cat: any, i: number) => {
              const Icon = iconMap[cat.icon] || Heart;
              return (
                <Link key={cat.id} href="/builder">
                  <Card
                    className="group p-7 text-center cursor-pointer hover:shadow-xl hover:border-primary/30 transition-all duration-300 hover:scale-[1.03] hover:-translate-y-1.5"
                    style={{ transitionDelay: `${i * 60}ms` }}
                  >
                    <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors duration-300">
                      <Icon className="h-7 w-7 text-primary/70 group-hover:text-primary transition-colors duration-300" />
                    </div>
                    <h3 className="text-sm font-semibold">
                      {lang === "sv" ? cat.nameSv : cat.nameEn}
                    </h3>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section
        id="section-cta"
        data-animate
        className={`py-24 sm:py-32 transition-all duration-700 ${isVisible("section-cta") ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
        data-testid="section-cta"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Card className="text-center py-16 sm:py-20 px-6">
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-primary mb-3">
              {lang === "sv" ? "KOM IGÅNG" : "GET STARTED"}
            </p>
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight mb-4" style={{ letterSpacing: "-0.02em" }}>
              {lang === "sv" ? "Redo att börja planera?" : "Ready to start planning?"}
            </h2>
            <p className="text-muted-foreground mb-10 max-w-md mx-auto leading-relaxed">
              {lang === "sv"
                ? "Skapa ert skräddarsydda bröllopspaket på några minuter."
                : "Create your tailored wedding package in minutes."}
            </p>
            <Link href="/builder">
              <Button size="lg" className="cursor-pointer text-base px-10" data-testid="button-cta-start">
                {t("hero.cta")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12" data-testid="footer">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="w-full h-px bg-gradient-to-r from-transparent via-border to-transparent mb-10" />
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <p className="text-xs text-muted-foreground">
                © 2026 Wedda. {t("footer.tagline")}
              </p>
            </div>
            <div className="flex items-center gap-6 text-xs text-muted-foreground">
              <Link href="/about"><span className="cursor-pointer hover:text-foreground transition-colors duration-200">{t("footer.about")}</span></Link>
              <a href="mailto:jonatan.siden@gmail.com,svenake62@gmail.com" className="cursor-pointer hover:text-foreground transition-colors duration-200">{t("footer.contact")}</a>
              <Link href="/privacy"><span className="cursor-pointer hover:text-foreground transition-colors duration-200">{t("footer.privacy")}</span></Link>
            </div>
          </div>
        </div>
      </footer>
      </div>{/* close relative z-1 wrapper */}
    </div>
  );
}
