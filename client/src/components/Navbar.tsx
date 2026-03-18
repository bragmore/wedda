import { Link, useLocation } from "wouter";
import { useI18n } from "@/lib/i18n";
import { usePackage } from "@/lib/package-context";
import { useAuth } from "@/lib/auth-context";
import { WeddaLogo } from "./WeddaLogo";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Sun, Moon, Menu, X, Globe, User, LogIn } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";

export function Navbar() {
  const { t, lang, setLang } = useI18n();
  const { getItems, getSelectedProductIds } = usePackage();
  const { isAuthenticated, user } = useAuth();
  const [location] = useLocation();
  const [dark, setDark] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);
  const itemCount = getItems().length + getSelectedProductIds().length;

  // Default to light theme always (user can toggle to dark)
  useEffect(() => {
    setDark(false);
    document.documentElement.classList.remove("dark");
  }, []);

  const toggleDark = () => {
    setDark(!dark);
    document.documentElement.classList.toggle("dark");
  };

  const handleScroll = useCallback(() => {
    const currentY = window.scrollY;
    setScrolled(currentY > 20);
    if (currentY > lastScrollY.current && currentY > 80) {
      setHidden(true);
    } else {
      setHidden(false);
    }
    lastScrollY.current = currentY;
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const navLinks = [
    { href: "/", label: t("nav.home") },
    { href: "/products", label: t("nav.products") },
    { href: "/builder", label: t("nav.builder") },
    { href: "/portal", label: t("nav.dashboard") },
  ];

  return (
    <header
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-5xl
        rounded-full border backdrop-blur-2xl
        transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]
        ${scrolled ? "bg-background/80 border-white/15 shadow-xl" : "bg-background/50 border-white/10 shadow-lg"}
        ${hidden ? "-translate-y-[120%]" : "translate-y-0"}
      `}
      data-testid="navbar"
    >
      <div className="mx-auto flex h-14 items-center justify-between gap-4 px-5 sm:px-6">
        <Link href="/" data-testid="link-home">
          <WeddaLogo className="h-7 w-auto cursor-pointer" />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1" data-testid="nav-desktop">
          {navLinks.map(link => (
            <Link key={link.href} href={link.href}>
              <span
                className={`px-4 py-1.5 text-sm font-medium rounded-full cursor-pointer transition-all duration-200 ${
                  location === link.href
                    ? "text-foreground bg-accent/80 shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                }`}
              >
                {link.label}
              </span>
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          {/* Language toggle */}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setLang(lang === "sv" ? "en" : "sv")}
            data-testid="button-lang-toggle"
          >
            <Globe className="h-4 w-4" />
          </Button>

          {/* Dark mode toggle */}
          <Button size="icon" variant="ghost" onClick={toggleDark} data-testid="button-theme-toggle">
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {/* Auth */}
          {isAuthenticated ? (
            <Link href="/portal">
              <Button variant="ghost" size="sm" className="cursor-pointer gap-1" data-testid="button-user">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline text-xs max-w-[80px] truncate">{user?.name}</span>
              </Button>
            </Link>
          ) : (
            <Link href="/auth">
              <Button variant="ghost" size="sm" className="cursor-pointer gap-1" data-testid="button-login">
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline text-xs">{lang === "sv" ? "Logga in" : "Log in"}</span>
              </Button>
            </Link>
          )}

          {/* Package cart */}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (location.startsWith('/builder')) {
                window.dispatchEvent(new CustomEvent('wedda-show-cart'));
              } else {
                (window as any).__weddaShowCart = true;
                window.location.hash = '#/builder';
              }
            }}
          >
            <Button variant="ghost" size="sm" className="relative overflow-visible cursor-pointer" data-testid="button-cart">
              <ShoppingCart className="h-5 w-5" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 flex min-w-5 h-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1 animate-[bounce-in_0.3s_ease]">
                  {itemCount}
                </span>
              )}
            </Button>
          </a>

          {/* Mobile menu toggle */}
          <Button size="icon" variant="ghost" className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)} data-testid="button-mobile-menu">
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Mobile nav - glassmorphism dropdown */}
      {mobileOpen && (
        <nav
          className="md:hidden mx-3 mb-3 rounded-2xl border border-white/10 bg-background/70 backdrop-blur-xl px-4 pb-3 pt-2 animate-[slide-up-spring_0.4s_ease]"
          data-testid="nav-mobile"
        >
          {navLinks.map(link => (
            <Link key={link.href} href={link.href}>
              <span
                onClick={() => setMobileOpen(false)}
                className={`block px-4 py-2.5 text-sm font-medium rounded-xl cursor-pointer transition-all duration-200 ${
                  location === link.href
                    ? "text-foreground bg-accent/80"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                }`}
              >
                {link.label}
              </span>
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
