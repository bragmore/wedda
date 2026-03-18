import { useState, useMemo, useEffect, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { useI18n } from "@/lib/i18n";
import { usePackage } from "@/lib/package-context";
import { useUser } from "@/lib/user-context";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Category, Vendor, Product } from "@shared/schema";
import {
  Castle, UtensilsCrossed, Camera, Music, Flower2, Sparkles,
  CircleDot, Heart, Palette, Video, Car, Cake, Mail, Lamp,
  PartyPopper, ClipboardList, Shirt, Lightbulb, Star, MapPin,
  Check, Plus, Trash2, ArrowRight, ArrowLeft, Send, ShoppingCart, CheckCircle,
  Building2, Scissors, Briefcase, Users, Wallet, ChevronRight, AlertCircle,
  Package, Sparkle, Info, Phone, User, ChevronDown, ChevronUp, Crown, Gem,
  Lock, LogIn, X, Eye, Calendar, SlidersHorizontal, Filter,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";

// ── Icon map ──────────────────────────────────────────────────────────────────
const iconMap: Record<string, any> = {
  Castle, UtensilsCrossed, Camera, Music, Flower2, Sparkles,
  CircleDot, Heart, Palette, Video, Car, Cake, Mail, Lamp,
  PartyPopper, ClipboardList, Shirt, Lightbulb, Building2, Scissors, Briefcase,
};

// ── Types ─────────────────────────────────────────────────────────────────────
interface CategoryFromAPI {
  id: number;
  slug: string;
  nameSv: string;
  nameEn: string;
  icon: string;
  parentId: string | null;
  descriptionSv: string;
  descriptionEn: string;
  sortOrder: number;
}

type WizardStep = 1 | 2 | 3 | 4 | "4b" | 5 | 6 | 7;

interface GeneratedPackage {
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  products: Product[];
  totalPrice: number;
  podCount: number;
  icon: any;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const BUDGET_PRESETS = [
  { label: "50k", sublabel: "50 000 kr", value: 50000 },
  { label: "100k", sublabel: "100 000 kr", value: 100000 },
  { label: "200k", sublabel: "200 000 kr", value: 200000 },
  { label: "500k", sublabel: "500 000 kr", value: 500000 },
  { label: "1M", sublabel: "1 000 000 kr", value: 1000000 },
];

const SIZE_PRESETS = [
  { sv: "Intimt (under 30)", en: "Intimate (under 30)", value: 20, icon: "💑" },
  { sv: "Litet (30–60)", en: "Small (30–60)", value: 50, icon: "👨‍👩‍👦" },
  { sv: "Medelstort (60–100)", en: "Medium (60–100)", value: 80, icon: "👨‍👩‍👧‍👦" },
  { sv: "Stort (100–200)", en: "Large (100–200)", value: 150, icon: "🎉" },
  { sv: "Storskaligt (200+)", en: "Grand (200+)", value: 250, icon: "🏛️" },
];

const SWEDISH_REGIONS = [
  "Stockholm", "Västra Götaland", "Skåne", "Uppsala", "Östergötland",
  "Jönköping", "Halland", "Västmanland", "Örebro", "Dalarna",
  "Värmland", "Västerbotten", "Norrbotten", "Jämtland", "Västernorrland",
  "Gävleborg", "Södermanland", "Blekinge", "Kalmar", "Gotland", "Kronoberg",
  "Hela Sverige",
];

// ── Price formatter ───────────────────────────────────────────────────────────
function formatPrice(n: number): string {
  return n.toLocaleString("sv-SE");
}

// ── Package generation ────────────────────────────────────────────────────────
interface PackageSplit {
  withinBudget: GeneratedPackage[];
  overBudget: GeneratedPackage[];
}

function generatePackages(
  budget: number,
  selectedParentSlugs: string[],
  allProducts: Product[],
  categories: CategoryFromAPI[],
): PackageSplit {
  const childCats = categories.filter(
    (c) => c.parentId !== null && selectedParentSlugs.includes(c.parentId),
  );

  if (childCats.length === 0 || allProducts.length === 0)
    return { withinBudget: [], overBudget: [] };

  function pickAtPercentile(pct: number): Product[] {
    const picked: Product[] = [];
    for (const cat of childCats) {
      const priced = allProducts
        .filter((p) => p.category_id === cat.slug && p.price_from !== null && p.price_from > 0)
        .sort((a, b) => (a.price_from ?? 0) - (b.price_from ?? 0));

      if (priced.length === 0) {
        const pod = allProducts.find(
          (p) => p.category_id === cat.slug && p.price_on_demand,
        );
        if (pod) picked.push(pod);
        continue;
      }

      const idx = Math.min(
        Math.round(pct * (priced.length - 1)),
        priced.length - 1,
      );
      picked.push(priced[idx]);
    }
    return picked;
  }

  function makePkg(
    products: Product[],
    name: string,
    nameEn: string,
    desc: string,
    descEn: string,
    icon: any,
  ): GeneratedPackage {
    let totalPrice = 0;
    let podCount = 0;
    products.forEach((p) => {
      if (p.price_from) totalPrice += p.price_from;
      if (p.price_on_demand) podCount++;
    });
    return { name, nameEn, description: desc, descriptionEn: descEn, products, totalPrice, podCount, icon };
  }

  const candidates: GeneratedPackage[] = [];

  const configs: {
    pct: number;
    name: string;
    nameEn: string;
    desc: string;
    descEn: string;
    icon: any;
  }[] = [
    { pct: 0.0, name: "Sparsamt", nameEn: "Budget", desc: "Smarta val som håller budgeten", descEn: "Smart picks that keep the budget", icon: Wallet },
    { pct: 0.15, name: "Ekonomi", nameEn: "Economy", desc: "Bra kvalitet till bra pris", descEn: "Good quality at a good price", icon: Wallet },
    { pct: 0.3, name: "Balanserat", nameEn: "Balanced", desc: "Balanserat paket med kvalitet och värde", descEn: "Balanced package with quality and value", icon: Star },
    { pct: 0.4, name: "Modernt", nameEn: "Modern", desc: "Stilrent och samtida för det moderna paret", descEn: "Sleek and contemporary for the modern couple", icon: Gem },
    { pct: 0.5, name: "Standard", nameEn: "Standard", desc: "Det populäraste valet", descEn: "The most popular choice", icon: Star },
    { pct: 0.6, name: "Romantiskt", nameEn: "Romantic", desc: "Mjuka toner och romantisk elegans", descEn: "Soft tones and romantic elegance", icon: Heart },
    { pct: 0.7, name: "Elegant", nameEn: "Elegant", desc: "Elegant och tidlöst", descEn: "Elegant and timeless", icon: Crown },
    { pct: 0.8, name: "Lyxigt", nameEn: "Luxury", desc: "Exklusiva produkter för en lyxig upplevelse", descEn: "Exclusive products for a luxurious experience", icon: Crown },
    { pct: 0.9, name: "Premium", nameEn: "Premium", desc: "De bästa produkterna för ert drömbröllop", descEn: "The best products for your dream wedding", icon: Crown },
    { pct: 1.0, name: "Ultimat", nameEn: "Ultimate", desc: "Det allra bästa, utan kompromisser", descEn: "The very best, no compromises", icon: Crown },
  ];

  const seenTotals = new Set<number>();

  for (const cfg of configs) {
    const products = pickAtPercentile(cfg.pct);
    if (products.length === 0) continue;
    const pkg = makePkg(products, cfg.name, cfg.nameEn, cfg.desc, cfg.descEn, cfg.icon);
    if (seenTotals.has(pkg.totalPrice)) continue;
    seenTotals.add(pkg.totalPrice);
    candidates.push(pkg);
  }

  candidates.sort((a, b) => a.totalPrice - b.totalPrice);

  const within = candidates.filter((p) => p.totalPrice <= budget);
  const over = candidates.filter((p) => p.totalPrice > budget && p.totalPrice <= budget * 2);

  return {
    withinBudget: within.slice(0, 5),
    overBudget: over.slice(0, 5),
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// ── Builder Component ─────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
export default function Builder() {
  const { t, lang } = useI18n();
  const {
    getItems,
    addVendor,
    removeVendor,
    isSelected,
    updateNotes,
    clearAll,
    getSelectedProductIds,
    toggleProduct,
    isProductSelected,
    selectedProducts,
    toggleProductObj,
    setProducts,
  } = usePackage();
  const { user, setUser } = useUser();
  const { user: authUser, isAuthenticated, login: authLogin, register: authRegister } = useAuth();
  const [, navigate] = useLocation();

  // ── Wizard state ────────────────────────────────────────────────────────────
  const [step, setStep] = useState<WizardStep>(1);

  // ── Animation state ─────────────────────────────────────────────────────────
  const [animating, setAnimating] = useState(false);
  const [animDir, setAnimDir] = useState<"left" | "right">("right");

  const animatedGo = useCallback((nextStep: WizardStep, dir: "left" | "right" = "right") => {
    setAnimDir(dir);
    setAnimating(true);
    setTimeout(() => {
      setStep(nextStep);
      setAnimating(false);
    }, 280);
  }, []);

  // ── Sub-step state for step 2 ───────────────────────────────────────────────
  type SubStep = "budget" | "guests" | "region" | "details";
  const [subStep, setSubStep] = useState<SubStep>("budget");
  const [subAnimating, setSubAnimating] = useState(false);
  const [subAnimDir, setSubAnimDir] = useState<"left" | "right">("right");

  const animatedSubGo = useCallback((next: SubStep, dir: "left" | "right" = "right") => {
    setSubAnimDir(dir);
    setSubAnimating(true);
    setTimeout(() => {
      setSubStep(next);
      setSubAnimating(false);
    }, 280);
  }, []);

  // Reset sub-step when entering step 2
  useEffect(() => {
    if (step === 2) setSubStep("budget");
  }, [step]);

  // ── Product detail modal state ─────────────────────────────────────────────
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);

  // Handle cart icon click → jump directly to step 5 (review/cart)
  useEffect(() => {
    const showCart = () => {
      if (isAuthenticated) {
        setStep(5);
      }
    };
    if ((window as any).__weddaShowCart) {
      delete (window as any).__weddaShowCart;
      showCart();
    }
    window.addEventListener("wedda-show-cart", showCart);
    return () => window.removeEventListener("wedda-show-cart", showCart);
  }, [isAuthenticated]);

  // Step 1: Auth — login/register inline
  const [authTab, setAuthTab] = useState<"login" | "register" | "forgot" | "reset">("login");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authPhone, setAuthPhone] = useState("");
  const [authConfirm, setAuthConfirm] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Step 2: Contact info (read-only from profile, only date editable)
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactDate, setContactDate] = useState("");

  // Step 2: Budget & location
  const [budget, setBudget] = useState<number>(200000);
  const [customBudget, setCustomBudget] = useState("");
  const [guestCount, setGuestCount] = useState<number>(80);
  const [selectedRegion, setSelectedRegion] = useState<string>("");

  // Step 3: Categories (parent slugs)
  const [selectedParentSlugs, setSelectedParentSlugs] = useState<string[]>([]);
  const [expandedParents, setExpandedParents] = useState<Set<string>>(
    new Set(),
  );
  const [deselectedChildren, setDeselectedChildren] = useState<Set<string>>(
    new Set(),
  );

  // Step 4: Package selection
  const [selectedPackageIdx, setSelectedPackageIdx] = useState<number | null>(
    null,
  );

  // Step 4b: Manual product selection
  const [activeCategorySlug, setActiveCategorySlug] = useState<string>("");
  const [priceFilter, setPriceFilter] = useState<[number, number]>([0, 0]);
  const [venueRegionFilter, setVenueRegionFilter] = useState<string>("");

  // Step 5: Review
  const [orderNotes, setOrderNotes] = useState("");

  // Step 6: Registration
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regDate, setRegDate] = useState("");

  // Step 7: Success
  const [orderId, setOrderId] = useState<number | null>(null);

  // ── API data ────────────────────────────────────────────────────────────────
  const { data: categories = [] } = useQuery<CategoryFromAPI[]>({
    queryKey: ["/api/categories"],
    queryFn: () => apiRequest("GET", "/api/categories").then((r) => r.json()),
  });

  const { data: allProducts = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    queryFn: () => apiRequest("GET", "/api/products").then((r) => r.json()),
  });

  const { data: allVendors = [] } = useQuery<any[]>({
    queryKey: ["/api/vendors"],
    queryFn: () => apiRequest("GET", "/api/vendors").then((r) => r.json()),
  });

  const vendorMap = useMemo(() => {
    const map = new Map<number, any>();
    allVendors.forEach((v: any) => map.set(v.id, v));
    return map;
  }, [allVendors]);

  const venueRegions = useMemo(() => {
    const regions = new Set<string>();
    allProducts.forEach((p) => {
      if (p.category_id === "venues" && p.vendor_id) {
        const vendor = vendorMap.get(p.vendor_id);
        if (vendor?.region && vendor.region !== "Hela Sverige") {
          regions.add(vendor.region);
        }
      }
    });
    return [...regions].sort();
  }, [allProducts, vendorMap]);

  const priceRange = useMemo(() => {
    const prices = allProducts
      .filter((p) => p.price_from && p.price_from > 0)
      .map((p) => p.price_from as number);
    if (prices.length === 0) return { min: 0, max: 100000 };
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }, [allProducts]);

  // ── Derived data ────────────────────────────────────────────────────────────
  const parentCategories = useMemo(
    () => categories.filter((c) => c.parentId === null),
    [categories],
  );

  const childCategories = useMemo(
    () => categories.filter((c) => c.parentId !== null),
    [categories],
  );

  const activeChildSlugs = useMemo(() => {
    const slugs: string[] = [];
    for (const parent of selectedParentSlugs) {
      const children = childCategories.filter((c) => c.parentId === parent);
      for (const child of children) {
        if (!deselectedChildren.has(child.slug)) {
          slugs.push(child.slug);
        }
      }
    }
    return slugs;
  }, [selectedParentSlugs, childCategories, deselectedChildren]);

  const packageSplit = useMemo(
    () => generatePackages(budget, selectedParentSlugs, allProducts, categories),
    [budget, selectedParentSlugs, allProducts, categories],
  );
  const allGeneratedPackages = useMemo(
    () => [...packageSplit.withinBudget, ...packageSplit.overBudget],
    [packageSplit],
  );

  const currentCategoryProducts = useMemo(() => {
    if (!activeCategorySlug) return [];
    let filtered = allProducts.filter((p) => p.category_id === activeCategorySlug);
    // Apply price filter
    if (priceFilter[1] > 0) {
      filtered = filtered.filter((p) => {
        if (p.price_on_demand || (!p.price_from && !p.price_to)) return true;
        const price = p.price_from || 0;
        return price >= priceFilter[0] && price <= priceFilter[1];
      });
    }
    // Apply venue region filter
    if (activeCategorySlug === "venues" && venueRegionFilter) {
      filtered = filtered.filter((p) => {
        if (!p.vendor_id) return true;
        const vendor = vendorMap.get(p.vendor_id);
        return vendor?.region === venueRegionFilter;
      });
    }
    return filtered;
  }, [allProducts, activeCategorySlug, priceFilter, venueRegionFilter, vendorMap]);

  const totalEstimate = useMemo(() => {
    let total = 0;
    let podCount = 0;
    selectedProducts.forEach((p) => {
      if (p.price_from) {
        total += p.price_from;
      }
      if (p.price_on_demand) {
        podCount++;
      }
    });
    return { total, podCount, hasPOD: podCount > 0 };
  }, [selectedProducts]);

  // Pre-fill contact info from authenticated user
  useEffect(() => {
    if (isAuthenticated && authUser) {
      setContactName(authUser.name || "");
      setContactEmail(authUser.email || "");
      setContactPhone(authUser.phone || "");
      setContactDate(authUser.weddingDate || "");
      if (authUser.budget) setBudget(authUser.budget);
      if (authUser.region) setSelectedRegion(authUser.region);
      if (authUser.guestCount) setGuestCount(parseInt(authUser.guestCount) || 80);
    }
  }, [isAuthenticated, authUser]);

  // Pre-fill registration from contact info (legacy)
  useEffect(() => {
    if (step === 6 && !regName && contactName) {
      setRegName(contactName);
      setRegEmail(contactEmail);
      setRegDate(contactDate);
    }
  }, [step, regName, contactName, contactEmail, contactDate]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const toggleParentCategory = (parentSlug: string) => {
    setSelectedParentSlugs((prev) =>
      prev.includes(parentSlug)
        ? prev.filter((s) => s !== parentSlug)
        : [...prev, parentSlug],
    );
    setDeselectedChildren((prev) => {
      const next = new Set(prev);
      const children = childCategories.filter(
        (c) => c.parentId === parentSlug,
      );
      children.forEach((c) => next.delete(c.slug));
      return next;
    });
  };

  const toggleChildCategory = (childSlug: string) => {
    setDeselectedChildren((prev) => {
      const next = new Set(prev);
      if (next.has(childSlug)) {
        next.delete(childSlug);
      } else {
        next.add(childSlug);
      }
      return next;
    });
  };

  const toggleExpandParent = (parentSlug: string) => {
    setExpandedParents((prev) => {
      const next = new Set(prev);
      if (next.has(parentSlug)) {
        next.delete(parentSlug);
      } else {
        next.add(parentSlug);
      }
      return next;
    });
  };

  const toggleProductSelection = (product: Product) => {
    toggleProductObj(product);
  };

  const selectPackage = (idx: number) => {
    const pkg = allGeneratedPackages[idx];
    if (!pkg) return;
    setSelectedPackageIdx(idx);
    const next = new Map<number, Product>();
    pkg.products.forEach((p) => next.set(p.id, p));
    setProducts(next);
  };

  const goToManualSelection = () => {
    if (activeChildSlugs.length > 0 && !activeCategorySlug) {
      setActiveCategorySlug(activeChildSlugs[0]);
    }
    animatedGo("4b");
  };

  // Contact validation
  const isContactValid =
    contactName.trim().length > 0 &&
    contactEmail.trim().length > 0 &&
    /\S+@\S+\.\S+/.test(contactEmail) &&
    contactPhone.trim().length > 0;

  // ── Mutations ───────────────────────────────────────────────────────────────
  const registerMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/users", {
        name: regName,
        email: regEmail,
        weddingDate: regDate || undefined,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setUser(data);
      submitOrder(data.id);
    },
  });

  const orderMutation = useMutation({
    mutationFn: async (userId: number) => {
      const items = [...selectedProducts.values()].map((p) => ({
        vendorId: p.vendor_id || 0,
        categoryId:
          categories.find((c) => c.slug === p.category_id)?.id || 0,
        productId: p.id,
        customerNotes: `${contactName}, ${contactPhone}, ${guestCount} gäster, ${selectedRegion}, Budget: ${formatPrice(budget)} kr`,
      }));
      const res = await apiRequest("POST", "/api/orders", {
        userId,
        items,
        notes: `${orderNotes}\nBudget: ${budget}, Gäster: ${guestCount}, Plats: ${selectedRegion}`,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setOrderId(data.order.id);
      setStep(7);
    },
  });

  const submitOrder = (userId: number) => {
    orderMutation.mutate(userId);
  };

  const handleSubmit = () => {
    if (authUser) {
      submitOrder(authUser.id);
    } else if (user) {
      submitOrder(user.id);
    } else {
      setStep(6);
    }
  };

  // ── Product Detail Modal ──────────────────────────────────────────────────
  const ProductDetailModal = () => {
    if (!detailProduct) return null;
    const product = detailProduct;
    const isPOD = product.price_on_demand || (!product.price_from && !product.price_to);
    const isProductSel = selectedProducts.has(product.id);
    const childCat = categories.find((c: CategoryFromAPI) => c.slug === product.category_id);
    const sv = lang === "sv";

    return (
      <Dialog open={!!detailProduct} onOpenChange={(open: boolean) => !open && setDetailProduct(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg">{product.name}</DialogTitle>
          </DialogHeader>
          {product.image_url && (
            <div className="aspect-[16/9] overflow-hidden rounded-2xl bg-muted">
              <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="space-y-3">
            {childCat && (
              <Badge variant="secondary" className="text-xs">
                {sv ? childCat.nameSv : childCat.nameEn}
              </Badge>
            )}
            {product.description && product.description !== product.name && (
              <p className="text-sm text-muted-foreground">{product.description}</p>
            )}
            <div>
              {isPOD ? (
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium text-amber-600">{t("products.priceOnDemand")}</span>
                </div>
              ) : (
                <p className="text-lg font-bold text-primary">
                  {product.price_from ? formatPrice(product.price_from) : ""}
                  {product.price_to && product.price_to !== product.price_from && (
                    <> – {formatPrice(product.price_to)}</>
                  )}{" "}
                  {t("general.sek")}
                </p>
              )}
            </div>
            <Button
              className="w-full"
              variant={isProductSel ? "secondary" : "default"}
              onClick={() => { toggleProductSelection(product); setDetailProduct(null); }}
            >
              {isProductSel ? (
                <><Check className="h-4 w-4 mr-2" /> {t("builder.selected")} — {sv ? "Ta bort" : "Remove"}</>
              ) : (
                <><Plus className="h-4 w-4 mr-2" /> {sv ? "Lägg till i din kundvagn" : "Add to your cart"}</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  // ── Step Indicator (Modern progress bar) ──────────────────────────────────
  const stepLabels = [
    lang === "sv" ? "Konto" : "Account",
    t("wizard.step2"),
    t("wizard.step3"),
    t("wizard.step4"),
    t("wizard.step5"),
  ];

  const numericStep = (s: WizardStep): number => {
    if (s === "4b") return 4;
    return s as number;
  };

  const StepIndicator = () => {
    const current = numericStep(step);
    const displayStep = current > 5 ? 5 : current;

    return (
      <div
        className="bg-background/80 backdrop-blur-xl py-4 -mx-4 px-4 sm:-mx-6 sm:px-6 mb-8 border-b border-white/10"
        data-testid="step-indicator"
      >
        <div className="max-w-2xl mx-auto">
          <div className="relative flex items-center justify-between">
            {/* Background line */}
            <div className="absolute top-5 left-0 right-0 h-1 bg-border/40 rounded-full" />
            {/* Active progress line */}
            <div
              className="absolute top-5 left-0 h-1 bg-primary rounded-full transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
              style={{ width: `${((displayStep - 1) / (stepLabels.length - 1)) * 100}%` }}
            />

            {stepLabels.map((label, i) => {
              const stepNum = i + 1;
              const isActive = displayStep === stepNum;
              const isComplete = displayStep > stepNum;

              return (
                <div key={i} className="relative flex flex-col items-center z-10">
                  <div
                    className={`flex items-center justify-center w-11 h-11 rounded-full border-2 font-bold text-sm transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                      isActive
                        ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-110"
                        : isComplete
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border/60 bg-background/80 text-muted-foreground"
                    }`}
                    style={isActive ? { animation: "pulse-gold 2s infinite" } : isComplete ? undefined : { animation: "gentleBounce 3s ease-in-out infinite", animationDelay: `${i * 0.2}s` }}
                  >
                    {isComplete ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <span>{stepNum}</span>
                    )}
                  </div>
                  <span
                    className={`hidden sm:block mt-1.5 text-xs font-medium transition-colors duration-300 max-w-[80px] text-center leading-tight ${
                      isActive
                        ? "text-primary"
                        : isComplete
                          ? "text-primary/70"
                          : "text-muted-foreground"
                    }`}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // ── Animation wrapper class ─────────────────────────────────────────────────
  const mainAnimClass = animating
    ? animDir === "right"
      ? "opacity-0 translate-x-12"
      : "opacity-0 -translate-x-12"
    : "opacity-100 translate-x-0";

  const subAnimClass = subAnimating
    ? subAnimDir === "right"
      ? "opacity-0 translate-x-12"
      : "opacity-0 -translate-x-12"
    : "opacity-100 translate-x-0";

  // ══════════════════════════════════════════════════════════════════════════
  // ── STEP 1: Auth Check (Login / Register) ─────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════
  if (step === 1) {
    const sv = lang === "sv";

    if (isAuthenticated && authUser) {
      return (
        <div className="min-h-screen pt-32 pb-12">
          <div className="mx-auto max-w-2xl px-4 sm:px-6">
            <StepIndicator />
            <div className={`transition-all duration-300 ease-out ${mainAnimClass}`}>
              <div className="text-center mb-10">
                <div className="inline-flex p-4 rounded-full bg-green-100 dark:bg-green-900/30 mb-5">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3" data-testid="step1-title">
                  {sv ? `Välkommen, ${authUser.name}!` : `Welcome, ${authUser.name}!`}
                </h1>
                <p className="text-base text-muted-foreground">{authUser.email}</p>
              </div>
              <div className="max-w-md mx-auto">
                <Button
                  size="lg"
                  className="w-full h-14 text-base font-semibold hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200"
                  onClick={() => animatedGo(2)}
                  data-testid="button-next-step1"
                >
                  {t("builder.next")} <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    const handleAuthLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setAuthError("");
      setAuthLoading(true);
      try {
        await authLogin(authEmail, authPassword);
        animatedGo(2);
      } catch {
        setAuthError(sv ? "Felaktig e-post eller lösenord" : "Invalid email or password");
      } finally {
        setAuthLoading(false);
      }
    };

    const handleAuthRegister = async (e: React.FormEvent) => {
      e.preventDefault();
      setAuthError("");
      if (authPassword !== authConfirm) {
        setAuthError(sv ? "Lösenorden matchar inte" : "Passwords don't match");
        return;
      }
      if (authPassword.length < 6) {
        setAuthError(sv ? "Lösenordet måste vara minst 6 tecken" : "Password must be at least 6 characters");
        return;
      }
      setAuthLoading(true);
      try {
        await authRegister({ email: authEmail, password: authPassword, name: authName, phone: authPhone || undefined });
        animatedGo(2);
      } catch (err: any) {
        const msg = err.message || "";
        if (msg.includes("409")) {
          setAuthError(sv ? "E-postadressen är redan registrerad" : "Email already registered");
        } else {
          setAuthError(sv ? "Registrering misslyckades" : "Registration failed");
        }
      } finally {
        setAuthLoading(false);
      }
    };

    return (
      <div className="min-h-screen pt-32 pb-12">
        <div className="mx-auto max-w-md px-4 sm:px-6">
          <StepIndicator />
          <div className={`transition-all duration-300 ease-out ${mainAnimClass}`}>
            <div className="text-center mb-8">
              <div className="inline-flex p-4 rounded-full bg-primary/10 mb-5">
                <LogIn className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3" data-testid="step1-title">
                {sv ? "Logga in eller skapa konto" : "Log in or create account"}
              </h1>
              <p className="text-base text-muted-foreground">
                {sv ? "Du behöver vara inloggad för att använda bröllopsguiden" : "You need to be logged in to use the wedding guide"}
              </p>
            </div>

            {(authTab === "login" || authTab === "register") && (
              <div className="flex mb-6 border-b border-border">
                <button
                  onClick={() => { setAuthTab("login"); setAuthError(""); }}
                  className={`flex-1 pb-3 text-sm font-medium transition-colors cursor-pointer ${
                    authTab === "login" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
                  }`}
                >
                  {sv ? "Logga in" : "Log in"}
                </button>
                <button
                  onClick={() => { setAuthTab("register"); setAuthError(""); }}
                  className={`flex-1 pb-3 text-sm font-medium transition-colors cursor-pointer ${
                    authTab === "register" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
                  }`}
                >
                  {sv ? "Skapa konto" : "Create account"}
                </button>
              </div>
            )}

            {authTab === "login" ? (
              <form onSubmit={handleAuthLogin} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="email" placeholder={sv ? "E-postadress" : "Email"} value={authEmail} onChange={e => setAuthEmail(e.target.value)} className="pl-10 h-12 rounded-xl" required />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="password" placeholder={sv ? "Lösenord" : "Password"} value={authPassword} onChange={e => setAuthPassword(e.target.value)} className="pl-10 h-12 rounded-xl" required />
                </div>
                {authError && <p className="text-sm text-destructive">{authError}</p>}
                <Button type="submit" size="lg" className="w-full h-14 text-base font-semibold hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200" disabled={authLoading}>
                  {authLoading ? (sv ? "Loggar in..." : "Logging in...") : (sv ? "Logga in" : "Log in")}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <button
                  type="button"
                  onClick={() => { setAuthTab("forgot"); setAuthError(""); setForgotSent(false); setForgotEmail(""); }}
                  className="w-full text-sm text-muted-foreground hover:text-primary transition-colors duration-200 cursor-pointer pt-1"
                >
                  {sv ? "Glömt lösenord?" : "Forgot password?"}
                </button>
              </form>
            ) : authTab === "register" ? (
              <form onSubmit={handleAuthRegister} className="space-y-4">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="text" placeholder={sv ? "Ert namn" : "Your name"} value={authName} onChange={e => setAuthName(e.target.value)} className="pl-10 h-12 rounded-xl" required />
                </div>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="email" placeholder={sv ? "E-postadress" : "Email"} value={authEmail} onChange={e => setAuthEmail(e.target.value)} className="pl-10 h-12 rounded-xl" required />
                </div>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="tel" placeholder={sv ? "Telefonnummer (valfritt)" : "Phone (optional)"} value={authPhone} onChange={e => setAuthPhone(e.target.value)} className="pl-10 h-12 rounded-xl" />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="password" placeholder={sv ? "Lösenord (minst 6 tecken)" : "Password (min 6 chars)"} value={authPassword} onChange={e => setAuthPassword(e.target.value)} className="pl-10 h-12 rounded-xl" required minLength={6} />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="password" placeholder={sv ? "Bekräfta lösenord" : "Confirm password"} value={authConfirm} onChange={e => setAuthConfirm(e.target.value)} className="pl-10 h-12 rounded-xl" required minLength={6} />
                </div>
                {authError && <p className="text-sm text-destructive">{authError}</p>}
                <Button type="submit" size="lg" className="w-full h-14 text-base font-semibold hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200" disabled={authLoading}>
                  {authLoading ? (sv ? "Skapar konto..." : "Creating...") : (sv ? "Skapa konto" : "Create account")}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </form>
            ) : authTab === "forgot" ? (
              <div className="space-y-4">
                <button
                  onClick={() => { setAuthTab("login"); setAuthError(""); }}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  {sv ? "Tillbaka till inloggning" : "Back to login"}
                </button>

                {forgotSent ? (
                  <div className="text-center py-6">
                    <div className="inline-flex p-4 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <h2 className="text-lg font-semibold mb-2">
                      {sv ? "E-post skickad!" : "Email sent!"}
                    </h2>
                    <p className="text-sm text-muted-foreground mb-4">
                      {sv
                        ? "Vi har skickat en återställningskod till din e-post."
                        : "We've sent a reset code to your email."}
                    </p>
                    <div className="bg-accent/50 rounded-xl p-4 mb-6 text-left">
                      <p className="text-sm font-medium mb-2">{sv ? "Så här gör du:" : "Here's what to do:"}</p>
                      <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                        <li>{sv ? "Öppna din e-post och kopiera återställningskoden" : "Open your email and copy the reset code"}</li>
                        <li>{sv ? "Klicka på knappen nedan" : "Click the button below"}</li>
                        <li>{sv ? "Klistra in koden och välj nytt lösenord" : "Paste the code and choose a new password"}</li>
                      </ol>
                    </div>
                    <Button
                      onClick={() => { setAuthTab("reset"); setAuthError(""); }}
                      className="w-full h-12 text-base font-semibold cursor-pointer"
                    >
                      {sv ? "Jag har koden – återställ lösenord" : "I have the code – reset password"}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    setAuthError("");
                    setAuthLoading(true);
                    try {
                      await apiRequest("POST", "/api/auth/forgot-password", { email: forgotEmail });
                      setForgotSent(true);
                    } catch {
                      setAuthError(sv ? "Något gick fel" : "Something went wrong");
                    } finally {
                      setAuthLoading(false);
                    }
                  }} className="space-y-4">
                    <div className="text-center mb-4">
                      <h2 className="text-2xl font-bold tracking-tight" style={{ letterSpacing: "-0.02em" }}>
                        {sv ? "Glömt lösenord" : "Forgot password"}
                      </h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        {sv ? "Ange din e-post så skickar vi en återställningskod" : "Enter your email and we'll send a reset code"}
                      </p>
                    </div>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input type="email" placeholder={sv ? "E-postadress" : "Email"} value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} className="pl-10 h-12 rounded-xl" required />
                    </div>
                    {authError && <p className="text-sm text-destructive">{authError}</p>}
                    <Button type="submit" size="lg" className="w-full h-14 text-base font-semibold hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 cursor-pointer" disabled={authLoading}>
                      {authLoading ? (sv ? "Skickar..." : "Sending...") : (sv ? "Skicka återställningskod" : "Send reset code")}
                    </Button>
                  </form>
                )}
              </div>
            ) : authTab === "reset" ? (
              <div className="space-y-4">
                <button
                  onClick={() => { setAuthTab("forgot"); setAuthError(""); setResetSuccess(false); }}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  {sv ? "Tillbaka" : "Back"}
                </button>

                {resetSuccess ? (
                  <div className="text-center py-6">
                    <div className="inline-flex p-4 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <h2 className="text-lg font-semibold mb-2">
                      {sv ? "Lösenord ändrat!" : "Password changed!"}
                    </h2>
                    <p className="text-sm text-muted-foreground mb-6">
                      {sv ? "Du kan nu logga in med ditt nya lösenord." : "You can now log in with your new password."}
                    </p>
                    <Button
                      onClick={() => { setAuthTab("login"); setAuthError(""); }}
                      className="w-full h-12 text-base font-semibold cursor-pointer"
                    >
                      {sv ? "Logga in" : "Log in"}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    setAuthError("");
                    if (resetNewPassword !== resetConfirm) {
                      setAuthError(sv ? "Lösenorden matchar inte" : "Passwords don't match");
                      return;
                    }
                    if (resetNewPassword.length < 6) {
                      setAuthError(sv ? "Lösenordet måste vara minst 6 tecken" : "Password must be at least 6 characters");
                      return;
                    }
                    setAuthLoading(true);
                    try {
                      const res = await apiRequest("POST", "/api/auth/reset-password", { token: resetToken, newPassword: resetNewPassword });
                      const data = await res.json();
                      if (data.success) {
                        setResetSuccess(true);
                      } else {
                        setAuthError(sv ? "Ogiltig eller utgången kod" : "Invalid or expired code");
                      }
                    } catch {
                      setAuthError(sv ? "Ogiltig eller utgången kod" : "Invalid or expired code");
                    } finally {
                      setAuthLoading(false);
                    }
                  }} className="space-y-4">
                    <div className="text-center mb-4">
                      <h2 className="text-2xl font-bold tracking-tight" style={{ letterSpacing: "-0.02em" }}>
                        {sv ? "Återställ lösenord" : "Reset password"}
                      </h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        {sv ? "Ange koden från din e-post och välj nytt lösenord" : "Enter the code from your email and choose a new password"}
                      </p>
                    </div>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input type="text" placeholder={sv ? "Klistra in återställningskod från e-post" : "Paste reset code from email"} value={resetToken} onChange={e => setResetToken(e.target.value)} className="pl-10 h-12 rounded-xl text-xs" required />
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input type="password" placeholder={sv ? "Nytt lösenord (minst 6 tecken)" : "New password (min 6 chars)"} value={resetNewPassword} onChange={e => setResetNewPassword(e.target.value)} className="pl-10 h-12 rounded-xl" required minLength={6} />
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input type="password" placeholder={sv ? "Bekräfta lösenord" : "Confirm password"} value={resetConfirm} onChange={e => setResetConfirm(e.target.value)} className="pl-10 h-12 rounded-xl" required minLength={6} />
                    </div>
                    {authError && <p className="text-sm text-destructive">{authError}</p>}
                    <Button type="submit" size="lg" className="w-full h-14 text-base font-semibold hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 cursor-pointer" disabled={authLoading}>
                      {authLoading ? (sv ? "Återställer..." : "Resetting...") : (sv ? "Återställ lösenord" : "Reset password")}
                    </Button>
                  </form>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ── STEP 2: Budget & Details (Sub-steps) ────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════
  if (step === 2) {
    const sv = lang === "sv";

    return (
      <div className="min-h-screen pt-32 pb-12">
        <div className="mx-auto max-w-2xl px-4 sm:px-6">
          <StepIndicator />
          <div className={`transition-all duration-300 ease-out ${mainAnimClass}`}>
            <button
              onClick={() => {
                if (subStep === "budget") animatedGo(1, "left");
                else if (subStep === "guests") animatedSubGo("budget", "left");
                else if (subStep === "region") animatedSubGo("guests", "left");
                else if (subStep === "details") animatedSubGo("region", "left");
              }}
              className="back-btn mb-6"
              data-testid="button-back-1"
            >
              <ArrowLeft className="h-4 w-4" /> {t("builder.prev")}
            </button>

            {/* Sub-step progress dots */}
            <div className="flex items-center justify-center gap-2 mb-8">
              {(["budget", "guests", "region", "details"] as SubStep[]).map((s, i) => (
                <div
                  key={s}
                  className={`h-2 rounded-full transition-all duration-500 ${
                    s === subStep
                      ? "w-8 bg-primary"
                      : (["budget", "guests", "region", "details"] as SubStep[]).indexOf(subStep) > i
                        ? "w-2 bg-primary/60"
                        : "w-2 bg-border"
                  }`}
                />
              ))}
            </div>

            <div className={`transition-all duration-280 ease-out ${subAnimClass}`}>
              {/* ── Sub-step: Budget ──────────────────────────────────── */}
              {subStep === "budget" && (
                <div className="text-center">
                  <div className="inline-flex p-4 rounded-full bg-primary/10 mb-5">
                    <Wallet className="h-8 w-8 text-primary" />
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2" data-testid="step2-title">
                    {sv ? "Vad är er budget?" : "What is your budget?"}
                  </h1>
                  <p className="text-base text-muted-foreground mb-10">
                    {sv ? "Vi anpassar rekommendationerna efter er budget" : "We'll tailor recommendations to your budget"}
                  </p>

                  <div className="flex flex-wrap justify-center gap-3 max-w-xl mx-auto mb-6">
                    {BUDGET_PRESETS.map((preset) => (
                      <button
                        key={preset.value}
                        onClick={() => {
                          setBudget(preset.value);
                          setCustomBudget("");
                        }}
                        className={`px-6 py-4 rounded-2xl border-2 text-center transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:scale-95 min-w-[100px] ${
                          budget === preset.value && !customBudget
                            ? "border-primary bg-primary/10 text-primary shadow-lg shadow-primary/20 scale-105"
                            : "border-border hover:border-primary/40 text-foreground"
                        }`}
                        data-testid={`budget-${preset.value}`}
                      >
                        <span className="text-xl font-bold block">{preset.label}</span>
                        <span className="text-xs text-muted-foreground">{preset.sublabel}</span>
                      </button>
                    ))}
                  </div>

                  <div className="max-w-sm mx-auto mb-4">
                    <Input
                      type="number"
                      placeholder={t("wizard.budget.custom")}
                      value={customBudget}
                      onChange={(e) => {
                        setCustomBudget(e.target.value);
                        if (e.target.value)
                          setBudget(parseInt(e.target.value) || 0);
                      }}
                      className="text-center text-xl h-16 rounded-2xl font-semibold"
                      data-testid="input-custom-budget"
                    />
                  </div>

                  <p className="text-base text-muted-foreground mb-8">
                    {sv ? "Vald budget:" : "Selected budget:"}{" "}
                    <span className="font-bold text-primary text-lg">
                      {formatPrice(budget)} kr
                    </span>
                  </p>

                  <Button
                    size="lg"
                    className="w-full sm:w-auto px-12 h-14 text-base font-semibold hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200"
                    onClick={() => animatedSubGo("guests")}
                    disabled={!budget}
                  >
                    {t("builder.next")} <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              )}

              {/* ── Sub-step: Guest count ─────────────────────────────── */}
              {subStep === "guests" && (
                <div className="text-center">
                  <div className="inline-flex p-4 rounded-full bg-primary/10 mb-5">
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
                    {sv ? "Hur stort bröllop planerar ni?" : "How big is the wedding?"}
                  </h1>
                  <p className="text-base text-muted-foreground mb-10">
                    {t("wizard.size.subtitle")}
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-lg mx-auto mb-8">
                    {SIZE_PRESETS.map((preset) => (
                      <button
                        key={preset.value}
                        onClick={() => setGuestCount(preset.value)}
                        className={`p-5 rounded-2xl border-2 text-center transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:scale-95 ${
                          guestCount === preset.value
                            ? "border-primary bg-primary/10 text-primary shadow-md shadow-primary/20"
                            : "border-border hover:border-primary/40 text-foreground"
                        }`}
                        data-testid={`size-${preset.value}`}
                      >
                        <span className="text-2xl block mb-1">{preset.icon}</span>
                        <span className="text-base font-semibold block">
                          {sv ? preset.sv : preset.en}
                        </span>
                      </button>
                    ))}
                  </div>

                  <Button
                    size="lg"
                    className="w-full sm:w-auto px-12 h-14 text-base font-semibold hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200"
                    onClick={() => animatedSubGo("region")}
                  >
                    {t("builder.next")} <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              )}

              {/* ── Sub-step: Region ──────────────────────────────────── */}
              {subStep === "region" && (
                <div className="text-center">
                  <div className="inline-flex p-4 rounded-full bg-primary/10 mb-5">
                    <MapPin className="h-8 w-8 text-primary" />
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
                    {sv ? "Var i Sverige gifter ni er?" : "Where in Sweden are you getting married?"}
                  </h1>
                  <p className="text-base text-muted-foreground mb-10">
                    {t("wizard.location.subtitle")}
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-xl mx-auto mb-8">
                    {SWEDISH_REGIONS.map((region) => (
                      <button
                        key={region}
                        onClick={() => setSelectedRegion(region)}
                        className={`px-4 py-3.5 rounded-2xl border-2 text-base font-medium transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:scale-95 ${
                          selectedRegion === region
                            ? "border-primary bg-primary/10 text-primary shadow-md shadow-primary/20"
                            : "border-border hover:border-primary/40 text-muted-foreground hover:text-foreground"
                        }`}
                        data-testid={`region-${region}`}
                      >
                        {region}
                      </button>
                    ))}
                  </div>

                  <Button
                    size="lg"
                    className="w-full sm:w-auto px-12 h-14 text-base font-semibold hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200"
                    onClick={() => animatedSubGo("details")}
                    disabled={!selectedRegion}
                  >
                    {t("builder.next")} <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              )}

              {/* ── Sub-step: Contact details ────────────────────────── */}
              {subStep === "details" && (
                <div>
                  <div className="text-center mb-8">
                    <div className="inline-flex p-4 rounded-full bg-primary/10 mb-5">
                      <User className="h-8 w-8 text-primary" />
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
                      {t("wizard.contact.title")}
                    </h1>
                    <p className="text-base text-muted-foreground">
                      {t("wizard.contact.subtitle")}
                    </p>
                  </div>

                  {/* Wedding date — LARGE and prominent */}
                  <div className="mb-8 max-w-md mx-auto">
                    <label className="text-sm font-semibold mb-2 block text-center">
                      <Calendar className="inline h-4 w-4 mr-1.5 text-primary" />
                      {t("wizard.contact.date")}
                    </label>
                    <Input
                      type="date"
                      value={contactDate}
                      onChange={(e) => setContactDate(e.target.value)}
                      className="h-16 text-lg text-center rounded-2xl border-2 border-primary/30 focus:border-primary font-semibold"
                      data-testid="input-contact-date"
                    />
                  </div>

                  {/* Read-only contact fields from profile (compact) */}
                  {isAuthenticated && authUser && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto mb-8">
                      <div>
                        <label className="text-xs font-medium mb-1 block text-muted-foreground">{t("wizard.contact.name")}</label>
                        <Input value={contactName} readOnly className="h-10 bg-muted/50 cursor-not-allowed text-sm rounded-xl" />
                      </div>
                      <div>
                        <label className="text-xs font-medium mb-1 block text-muted-foreground">{t("wizard.contact.email")}</label>
                        <Input value={contactEmail} readOnly className="h-10 bg-muted/50 cursor-not-allowed text-sm rounded-xl" />
                      </div>
                      {contactPhone && (
                        <div className="sm:col-span-2">
                          <label className="text-xs font-medium mb-1 block text-muted-foreground">{t("wizard.contact.phone")}</label>
                          <Input value={contactPhone} readOnly className="h-10 bg-muted/50 cursor-not-allowed text-sm rounded-xl" />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Summary of selections */}
                  <div className="max-w-md mx-auto mb-8 p-4 rounded-2xl bg-muted/30 border border-border/40">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <Wallet className="h-4 w-4 text-primary mx-auto mb-1" />
                        <p className="text-xs text-muted-foreground">{sv ? "Budget" : "Budget"}</p>
                        <p className="text-sm font-bold">{formatPrice(budget)} kr</p>
                      </div>
                      <div>
                        <Users className="h-4 w-4 text-primary mx-auto mb-1" />
                        <p className="text-xs text-muted-foreground">{t("wizard.size.guests")}</p>
                        <p className="text-sm font-bold">{guestCount}</p>
                      </div>
                      <div>
                        <MapPin className="h-4 w-4 text-primary mx-auto mb-1" />
                        <p className="text-xs text-muted-foreground">{sv ? "Plats" : "Location"}</p>
                        <p className="text-sm font-bold truncate">{selectedRegion}</p>
                      </div>
                    </div>
                  </div>

                  <div className="max-w-md mx-auto">
                    <Button
                      size="lg"
                      className="w-full h-14 text-base font-semibold hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200"
                      onClick={() => animatedGo(3)}
                      disabled={!budget || !selectedRegion}
                      data-testid="button-next-step2"
                    >
                      {t("builder.next")}
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ── STEP 3: Categories ────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════
  if (step === 3) {
    return (
      <div className="min-h-screen pt-32 pb-12">
        <div className="mx-auto max-w-2xl px-4 sm:px-6">
          <StepIndicator />
          <div className={`transition-all duration-300 ease-out ${mainAnimClass}`}>
            <button
              onClick={() => animatedGo(2, "left")}
              className="back-btn mb-6"
              data-testid="button-back-2"
            >
              <ArrowLeft className="h-4 w-4" /> {t("builder.prev")}
            </button>

            <div className="text-center mb-10">
              <div className="inline-flex p-4 rounded-full bg-primary/10 mb-5">
                <Package className="h-8 w-8 text-primary" />
              </div>
              <h1
                className="text-3xl sm:text-4xl font-bold tracking-tight mb-3"
                data-testid="step3-title"
              >
                {t("wizard.categories.title")}
              </h1>
              <p className="text-base text-muted-foreground">
                {t("wizard.categories.subtitle")}
              </p>
            </div>

            <div className="space-y-3">
              {parentCategories.map((parent) => {
                const Icon = iconMap[parent.icon] || Heart;
                const isParentSelected = selectedParentSlugs.includes(
                  parent.slug,
                );
                const isExpanded = expandedParents.has(parent.slug);
                const children = childCategories.filter(
                  (c) => c.parentId === parent.slug,
                );
                const activeChildCount = children.filter(
                  (c) => !deselectedChildren.has(c.slug),
                ).length;

                return (
                  <div key={parent.slug}>
                    <div
                      className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer ${
                        isParentSelected
                          ? "border-primary bg-primary/5 shadow-sm shadow-primary/10"
                          : "border-border hover:border-primary/30"
                      }`}
                      data-testid={`cat-parent-${parent.slug}`}
                    >
                      <button
                        className="flex items-center gap-3 flex-1 text-left"
                        onClick={() => {
                          toggleParentCategory(parent.slug);
                          // Auto-expand subcategories when selecting a parent
                          if (!isParentSelected) {
                            setExpandedParents((prev) => {
                              const next = new Set(prev);
                              next.add(parent.slug);
                              return next;
                            });
                          }
                        }}
                        data-testid={`cat-toggle-${parent.slug}`}
                      >
                        <div
                          className={`p-2.5 rounded-xl transition-colors ${isParentSelected ? "bg-primary/15" : "bg-muted"}`}
                        >
                          <Icon
                            className={`h-5 w-5 ${isParentSelected ? "text-primary" : "text-muted-foreground"}`}
                          />
                        </div>
                        <div className="flex-1">
                          <span
                            className={`text-base font-semibold ${isParentSelected ? "text-primary" : "text-foreground"}`}
                          >
                            {lang === "sv" ? parent.nameSv : parent.nameEn}
                          </span>
                          {children.length > 0 && (
                            <span className="text-xs text-muted-foreground ml-2">
                              {children.length} {lang === "sv" ? "underkategorier" : "subcategories"}
                            </span>
                          )}
                        </div>
                        {isParentSelected && (
                          <Check className="h-5 w-5 text-primary flex-shrink-0" />
                        )}
                      </button>
                      {isParentSelected && children.length > 0 && (
                        <button
                          onClick={() => toggleExpandParent(parent.slug)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                            isExpanded
                              ? "bg-primary/15 text-primary"
                              : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
                          }`}
                          data-testid={`cat-expand-${parent.slug}`}
                        >
                          <span>{activeChildCount}/{children.length}</span>
                          {isExpanded ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}
                    </div>

                    {/* Subcategory panel - prominent with checkboxes */}
                    {isParentSelected && children.length > 0 && (
                      <div
                        className={`overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                          isExpanded ? "max-h-[500px] opacity-100 mt-2 mb-2" : "max-h-0 opacity-0"
                        }`}
                      >
                        <div className="ml-4 pl-4 border-l-2 border-primary/20 space-y-1">
                          {children.map((child) => {
                            const ChildIcon = iconMap[child.icon] || Heart;
                            const isChildActive = !deselectedChildren.has(
                              child.slug,
                            );
                            return (
                              <button
                                key={child.slug}
                                onClick={() => toggleChildCategory(child.slug)}
                                className={`flex items-center gap-3 w-full p-3 rounded-xl text-left transition-all duration-200 text-sm hover:bg-primary/5 active:scale-[0.98] group ${
                                  isChildActive
                                    ? "text-foreground"
                                    : "text-muted-foreground"
                                }`}
                                data-testid={`cat-child-${child.slug}`}
                              >
                                {/* Checkbox indicator */}
                                <div
                                  className={`flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200 ${
                                    isChildActive
                                      ? "bg-primary border-primary"
                                      : "border-border/60 group-hover:border-primary/40"
                                  }`}
                                >
                                  {isChildActive && (
                                    <Check className="h-3 w-3 text-primary-foreground" />
                                  )}
                                </div>
                                <ChildIcon className={`h-4 w-4 flex-shrink-0 ${
                                  isChildActive ? "text-primary" : "text-muted-foreground"
                                }`} />
                                <span className={`flex-1 font-medium ${
                                  isChildActive ? "" : "opacity-60"
                                }`}>
                                  {lang === "sv" ? child.nameSv : child.nameEn}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-8 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {selectedParentSlugs.length}{" "}
                {lang === "sv" ? "kategorier valda" : "categories selected"} (
                {activeChildSlugs.length}{" "}
                {lang === "sv" ? "underkategorier" : "subcategories"})
              </span>
              <Button
                size="lg"
                className="h-14 px-8 text-base font-semibold hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200"
                onClick={() => {
                  setSelectedPackageIdx(null);
                  animatedGo(4);
                }}
                disabled={activeChildSlugs.length === 0}
                data-testid="button-next-step3"
              >
                {t("builder.next")}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ── STEP 4: Choose Package ────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════
  if (step === 4) {
    return (
      <>
      <ProductDetailModal />
      <div className="min-h-screen pt-32 pb-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <StepIndicator />
          <div className={`transition-all duration-300 ease-out ${mainAnimClass}`}>
            <button
              onClick={() => animatedGo(3, "left")}
              className="back-btn mb-6"
              data-testid="button-back-3"
            >
              <ArrowLeft className="h-4 w-4" /> {t("builder.prev")}
            </button>

            <div className="text-center mb-10">
              <div className="inline-flex p-4 rounded-full bg-primary/10 mb-5">
                <Sparkle className="h-8 w-8 text-primary" />
              </div>
              <h1
                className="text-3xl sm:text-4xl font-bold tracking-tight mb-3"
                data-testid="step4-title"
              >
                {t("wizard.packages.title")}
              </h1>
              <p className="text-base text-muted-foreground">
                {t("wizard.packages.subtitle")}
              </p>
            </div>

            {/* Manual selection (prominent, above packages) */}
            <Card
              className="p-6 mb-8 border-2 border-primary/30 bg-primary/5 hover:border-primary/50 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 cursor-pointer rounded-2xl"
              onClick={goToManualSelection}
              data-testid="button-manual-selection-top"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/15">
                  <ShoppingCart className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg">{t("wizard.packages.manual")}</h3>
                </div>
                <ArrowRight className="h-5 w-5 text-primary" />
              </div>
            </Card>

            {/* Generated packages */}
            {(() => {
              const renderPackageCard = (pkg: GeneratedPackage, globalIdx: number) => {
                const PkgIcon = pkg.icon;
                const isSelected = selectedPackageIdx === globalIdx;
                return (
                  <Card
                    key={globalIdx}
                    className={`overflow-hidden border-2 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] rounded-2xl ${
                      isSelected
                        ? "border-primary ring-2 ring-primary/20 shadow-lg shadow-primary/10"
                        : "border-border/50 hover:border-primary/20"
                    }`}
                    data-testid={`package-${globalIdx}`}
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl transition-colors ${isSelected ? "bg-primary/15" : "bg-muted"}`}>
                            <PkgIcon className={`h-5 w-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                          </div>
                          <div>
                            <h3 className="font-bold text-lg">
                              {lang === "sv" ? pkg.name : pkg.nameEn}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {lang === "sv" ? pkg.description : pkg.descriptionEn}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xl font-bold text-primary">
                            {formatPrice(pkg.totalPrice)} kr
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {pkg.products.length} {t("wizard.packages.productsIncluded")}
                            {pkg.podCount > 0 && (
                              <span className="ml-1 text-amber-600">+{pkg.podCount} POD</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
                        {pkg.products.map((product) => (
                          <button
                            key={product.id}
                            className="flex-shrink-0 w-24 text-left cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={(e) => { e.stopPropagation(); setDetailProduct(product); }}
                            data-testid={`pkg-product-${product.id}`}
                          >
                            {product.image_url ? (
                              <div className="w-24 h-16 rounded-2xl overflow-hidden bg-muted mb-1 ring-1 ring-transparent hover:ring-primary/40 transition-all duration-200">
                                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
                              </div>
                            ) : (
                              <div className="w-24 h-16 rounded-2xl bg-muted mb-1 flex items-center justify-center ring-1 ring-transparent hover:ring-primary/40 transition-all duration-200">
                                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                            <p className="text-[10px] text-muted-foreground line-clamp-2 leading-tight">{product.name}</p>
                            {product.price_on_demand ? (
                              <p className="text-[10px] text-amber-600">POD</p>
                            ) : product.price_from ? (
                              <p className="text-[10px] font-medium text-primary">{formatPrice(product.price_from)} kr</p>
                            ) : null}
                          </button>
                        ))}
                      </div>
                      <Button
                        variant={isSelected ? "secondary" : "default"}
                        className="w-full hover:shadow-md active:scale-[0.98] transition-all"
                        onClick={() => selectPackage(globalIdx)}
                        data-testid={`button-select-package-${globalIdx}`}
                      >
                        {isSelected ? (
                          <><Check className="h-4 w-4 mr-2" /> {t("wizard.packages.selected")}</>
                        ) : (
                          <><Plus className="h-4 w-4 mr-2" /> {t("wizard.packages.selectPackage")}</>
                        )}
                      </Button>
                    </div>
                  </Card>
                );
              };

              const { withinBudget, overBudget } = packageSplit;
              const hasAnyPackages = withinBudget.length > 0 || overBudget.length > 0;

              if (!hasAnyPackages) {
                return (
                  <div className="text-center py-16">
                    <ShoppingCart className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      {lang === "sv"
                        ? "Inga paket kunde genereras. Välj fler kategorier eller justera budgeten."
                        : "No packages could be generated. Select more categories or adjust the budget."}
                    </p>
                  </div>
                );
              }

              return (
                <>
                  {withinBudget.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <Check className="h-5 w-5 text-green-600" />
                        <h2 className="text-xl font-bold">
                          {lang === "sv" ? "Inom din budget" : "Within your budget"}
                        </h2>
                        <Badge variant="secondary" className="text-xs">
                          {lang === "sv" ? `max ${formatPrice(budget)} kr` : `max ${formatPrice(budget)} kr`}
                        </Badge>
                      </div>
                      <div className="space-y-4">
                        {withinBudget.map((pkg, idx) => renderPackageCard(pkg, idx))}
                      </div>
                    </div>
                  )}

                  {overBudget.length > 0 && (
                    <div className={withinBudget.length > 0 ? "mt-10" : ""}>
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkle className="h-5 w-5 text-primary" />
                        <h2 className="text-xl font-bold">
                          {lang === "sv"
                            ? "Om du kan utöka din budget rekommenderar vi"
                            : "If you can extend your budget we recommend"}
                        </h2>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        {lang === "sv"
                          ? "Dessa paket överskrider din budget men ger mer valuta för pengarna."
                          : "These packages exceed your budget but offer more value."}
                      </p>
                      <div className="space-y-4">
                        {overBudget.map((pkg, idx) =>
                          renderPackageCard(pkg, withinBudget.length + idx)
                        )}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}

            {selectedPackageIdx !== null && (
              <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">
                <button
                  className="gradient-btn-review w-full h-14 text-base flex items-center justify-center gap-2 cursor-pointer"
                  onClick={() => animatedGo(5)}
                  data-testid="button-next-step4"
                >
                  {t("builder.review")}
                  <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      </>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ── STEP 4b: Manual Product Selection ─────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════
  if (step === "4b") {
    const activeChildCategories = childCategories.filter((c) =>
      activeChildSlugs.includes(c.slug),
    );

    if (!activeCategorySlug && activeChildCategories.length > 0) {
      setActiveCategorySlug(activeChildCategories[0].slug);
    }

    return (
      <>
      <ProductDetailModal />
      <div className="min-h-screen pt-32 pb-12">
        {/* Floating sticky review bar */}
        {selectedProducts.size > 0 && (
          <div
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4"
            data-testid="sticky-price-bar"
            style={{ animation: "slide-up-spring 0.4s cubic-bezier(0.16, 1, 0.3, 1)" }}
          >
            <div className="glass rounded-2xl px-5 py-3 flex items-center justify-between shadow-xl">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <ShoppingCart className="h-4 w-4 text-primary" />
                  <span className="text-sm font-bold">
                    {formatPrice(totalEstimate.total)} kr
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {selectedProducts.size}{" "}
                  {t("summary.stickyProducts")}
                  {totalEstimate.podCount > 0 && (
                    <span className="ml-1 text-amber-600">
                      ({totalEstimate.podCount} {t("summary.stickyPod")})
                    </span>
                  )}
                </span>
              </div>
              <button
                onClick={() => animatedGo(5)}
                className="gradient-btn-review px-5 py-2 text-sm flex items-center gap-1.5 cursor-pointer"
                data-testid="sticky-review-button"
              >
                {t("builder.review")}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <StepIndicator />
          <div className={`transition-all duration-300 ease-out ${mainAnimClass}`}>
            <button
              onClick={() => animatedGo(4, "left")}
              className="back-btn mb-6"
              data-testid="button-back-4b"
            >
              <ArrowLeft className="h-4 w-4" /> {t("builder.prev")}
            </button>

            <div className="text-center mb-8">
              <h1
                className="text-3xl sm:text-4xl font-bold tracking-tight mb-3"
                data-testid="step4b-title"
              >
                {t("wizard.products.title")}
              </h1>
              <p className="text-base text-muted-foreground">
                {t("wizard.products.subtitle")}
              </p>
            </div>

            {/* Category tabs */}
            <div
              className="flex flex-wrap items-center gap-2 mb-6"
              data-testid="category-tabs"
            >
              {activeChildCategories.map((cat) => {
                const CatIcon = iconMap[cat.icon] || Heart;
                const productsInCat = [...selectedProducts.values()].filter(
                  (p) => p.category_id === cat.slug,
                ).length;
                return (
                  <button
                    key={cat.slug}
                    onClick={() => { setActiveCategorySlug(cat.slug); setPriceFilter([0, 0]); setVenueRegionFilter(""); }}
                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm whitespace-nowrap transition-all duration-200 active:scale-95 ${
                      activeCategorySlug === cat.slug
                        ? "bg-primary text-primary-foreground font-semibold shadow-md"
                        : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
                    }`}
                    data-testid={`tab-${cat.slug}`}
                  >
                    <CatIcon className="h-3.5 w-3.5" />
                    {lang === "sv" ? cat.nameSv : cat.nameEn}
                    {productsInCat > 0 && (
                      <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary-foreground/20 text-[10px] font-bold">
                        {productsInCat}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Filters */}
            {activeCategorySlug && (
              <div className="mb-6 p-4 rounded-2xl bg-muted/50 border border-border/50 space-y-4" data-testid="product-filters">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <SlidersHorizontal className="h-4 w-4 text-primary" />
                  {lang === "sv" ? "Filter" : "Filters"}
                </div>

                {/* Price range filter */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {lang === "sv" ? "Prisintervall" : "Price range"}
                    </span>
                    {priceFilter[1] > 0 && (
                      <button
                        className="text-xs text-primary hover:underline"
                        onClick={() => setPriceFilter([0, 0])}
                        data-testid="clear-price-filter"
                      >
                        {lang === "sv" ? "Rensa" : "Clear"}
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground whitespace-nowrap w-20 text-right">
                      {priceFilter[1] > 0 ? formatPrice(priceFilter[0]) : formatPrice(priceRange.min)} kr
                    </span>
                    <Slider
                      min={priceRange.min}
                      max={priceRange.max}
                      step={1000}
                      value={priceFilter[1] > 0 ? priceFilter : [priceRange.min, priceRange.max]}
                      onValueChange={(val: number[]) => setPriceFilter([val[0], val[1]])}
                      className="flex-1"
                      data-testid="price-slider"
                    />
                    <span className="text-xs text-muted-foreground whitespace-nowrap w-20">
                      {priceFilter[1] > 0 ? formatPrice(priceFilter[1]) : formatPrice(priceRange.max)} kr
                    </span>
                  </div>
                </div>

                {/* Venue region filter (only for venues) */}
                {activeCategorySlug === "venues" && venueRegions.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3 inline mr-1" />
                        {lang === "sv" ? "Plats / Region" : "Location / Region"}
                      </span>
                      {venueRegionFilter && (
                        <button
                          className="text-xs text-primary hover:underline"
                          onClick={() => setVenueRegionFilter("")}
                          data-testid="clear-region-filter"
                        >
                          {lang === "sv" ? "Rensa" : "Clear"}
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {venueRegions.map((region) => (
                        <button
                          key={region}
                          onClick={() => setVenueRegionFilter(venueRegionFilter === region ? "" : region)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 active:scale-95 ${
                            venueRegionFilter === region
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "bg-background border border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                          }`}
                          data-testid={`region-filter-${region}`}
                        >
                          {region}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Current category header */}
            {activeCategorySlug && (
              <div className="flex items-center gap-2 mb-6">
                {(() => {
                  const currentCat = categories.find(
                    (c) => c.slug === activeCategorySlug,
                  );
                  const CIcon = currentCat
                    ? iconMap[currentCat.icon] || Heart
                    : Heart;
                  return (
                    <>
                      <CIcon className="h-5 w-5 text-primary" />
                      <h2 className="text-xl font-bold">
                        {currentCat
                          ? lang === "sv"
                            ? currentCat.nameSv
                            : currentCat.nameEn
                          : activeCategorySlug}
                      </h2>
                      <Badge variant="secondary" className="ml-2">
                        {currentCategoryProducts.length}{" "}
                        {lang === "sv" ? "produkter" : "products"}
                      </Badge>
                    </>
                  );
                })()}
              </div>
            )}

            {/* Product grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 stagger-fade-in">
              {currentCategoryProducts.map((product) => {
                const isProductSel = selectedProducts.has(product.id);
                const isPOD =
                  product.price_on_demand ||
                  (!product.price_from && !product.price_to);
                const vendor = product.vendor_id ? vendorMap.get(product.vendor_id) : null;

                return (
                  <Card
                    key={product.id}
                    className={`overflow-hidden border-2 transition-all duration-300 hover:-translate-y-1.5 active:scale-[0.98] rounded-2xl card-hover-glow ${
                      isProductSel
                        ? "border-primary ring-2 ring-primary/20 shadow-lg shadow-primary/10"
                        : "border-border/50 hover:border-primary/20 hover:shadow-xl"
                    }`}
                    data-testid={`product-${product.id}`}
                  >
                    {product.image_url && (
                      <button
                        className="aspect-[4/3] overflow-hidden bg-muted w-full cursor-pointer relative group rounded-t-3xl product-img-overlay"
                        onClick={() => setDetailProduct(product)}
                      >
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all flex items-center justify-center">
                          <Eye className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" />
                        </div>
                        {isProductSel && (
                          <div className="absolute top-2 right-2 p-1 rounded-full bg-primary text-primary-foreground shadow-md" style={{ animation: "bounce-in 0.3s ease" }}>
                            <Check className="h-3 w-3" />
                          </div>
                        )}
                      </button>
                    )}
                    <div className="p-3.5">
                      <button
                        className="font-bold text-sm mb-1 line-clamp-2 text-left hover:text-primary transition-colors cursor-pointer"
                        onClick={() => setDetailProduct(product)}
                      >
                        {product.name}
                      </button>
                      {vendor?.city && (
                        <p className="text-[10px] text-muted-foreground flex items-center gap-0.5 mb-1">
                          <MapPin className="h-2.5 w-2.5" /> {vendor.city}{vendor.region ? `, ${vendor.region}` : ''}
                        </p>
                      )}

                      <div className="mb-2.5">
                        {isPOD ? (
                          <div className="flex items-center gap-1">
                            <AlertCircle className="h-3 w-3 text-amber-500" />
                            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                              {t("products.priceOnDemand")}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {product.price_from
                              ? formatPrice(product.price_from)
                              : ""}
                            {product.price_to &&
                              product.price_to !== product.price_from && (
                                <>
                                  {" "}– {formatPrice(product.price_to)}
                                </>
                              )}{" "}
                            {t("general.sek")}
                          </span>
                        )}
                      </div>

                      <button
                        className={`w-full py-2 rounded-full text-xs font-semibold transition-all duration-200 active:scale-[0.96] cursor-pointer ${
                          isProductSel
                            ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                            : "gradient-btn text-white"
                        }`}
                        onClick={() => toggleProductSelection(product)}
                        data-testid={`button-product-${product.id}`}
                      >
                        {isProductSel ? (
                          <span className="flex items-center justify-center gap-1">
                            <Check className="h-3.5 w-3.5" />
                            {t("builder.selected")}
                          </span>
                        ) : isPOD ? (
                          <span className="flex items-center justify-center gap-1">
                            <Mail className="h-3.5 w-3.5" />
                            {t("products.addToPackage")}
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-1">
                            <Plus className="h-3.5 w-3.5" />
                            {t("builder.select")}
                          </span>
                        )}
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>

            {currentCategoryProducts.length === 0 && (
              <div className="text-center py-16">
                <ShoppingCart className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  {lang === "sv"
                    ? "Inga produkter i denna kategori ännu"
                    : "No products in this category yet"}
                </p>
              </div>
            )}

            {/* Navigation spacer for sticky bar */}
            <div className="mt-8 pt-6 border-t pb-20">
              <div className="text-sm text-muted-foreground text-center">
                {selectedProducts.size}{" "}
                {lang === "sv" ? "produkter valda" : "products selected"}
                {totalEstimate.total > 0 && (
                  <span className="ml-2 font-bold text-foreground">
                    ({formatPrice(totalEstimate.total)} kr)
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      </>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ── STEP 5: Review & Send ─────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════
  if (step === 5) {
    const productsByParent = new Map<string, { parent: CategoryFromAPI; products: Product[] }>();
    selectedProducts.forEach((p) => {
      const childCat = categories.find((c) => c.slug === p.category_id);
      const parentSlug = childCat?.parentId || p.category_id;
      const parentCat = categories.find((c) => c.slug === parentSlug);

      if (!productsByParent.has(parentSlug)) {
        productsByParent.set(parentSlug, {
          parent: parentCat || childCat || categories[0],
          products: [],
        });
      }
      productsByParent.get(parentSlug)!.products.push(p);
    });

    return (
      <>
      <ProductDetailModal />
      <div className="min-h-screen pt-32 pb-12">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <StepIndicator />
          <div className={`transition-all duration-300 ease-out ${mainAnimClass}`}>
            <button
              onClick={() =>
                animatedGo(selectedPackageIdx !== null ? 4 : "4b", "left")
              }
              className="back-btn mb-6"
              data-testid="button-back-5"
            >
              <ArrowLeft className="h-4 w-4" /> {t("builder.prev")}
            </button>

            <div className="text-center mb-10">
              <div className="inline-flex p-4 rounded-full bg-primary/10 mb-5">
                <ClipboardList className="h-8 w-8 text-primary" />
              </div>
              <h1
                className="text-3xl sm:text-4xl font-bold tracking-tight mb-3"
                data-testid="step5-title"
              >
                {t("wizard.review.title")}
              </h1>
              <p className="text-base text-muted-foreground">
                {t("wizard.review.subtitle")}
              </p>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3 mb-8">
              <Card className="p-4 text-center rounded-2xl" data-testid="summary-budget">
                <Wallet className="h-5 w-5 text-primary mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">
                  {lang === "sv" ? "Budget" : "Budget"}
                </p>
                <p className="text-sm font-bold">
                  {formatPrice(budget)} kr
                </p>
              </Card>
              <Card className="p-4 text-center rounded-2xl" data-testid="summary-guests">
                <Users className="h-5 w-5 text-primary mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">
                  {t("wizard.size.guests")}
                </p>
                <p className="text-sm font-bold">{guestCount}</p>
              </Card>
              <Card className="p-4 text-center rounded-2xl" data-testid="summary-location">
                <MapPin className="h-5 w-5 text-primary mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">
                  {lang === "sv" ? "Plats" : "Location"}
                </p>
                <p className="text-sm font-bold">{selectedRegion}</p>
              </Card>
            </div>

            {/* Products grouped by parent category */}
            <div className="space-y-4" data-testid="review-products">
              {[...productsByParent.entries()].map(
                ([parentSlug, { parent, products }]) => {
                  const ParentIcon = iconMap[parent.icon] || Heart;

                  return (
                    <Card
                      key={parentSlug}
                      className="p-5 border border-border/50 rounded-2xl"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <div className="p-1.5 rounded-lg bg-primary/10">
                          <ParentIcon className="h-4 w-4 text-primary" />
                        </div>
                        <h3 className="font-bold text-base">
                          {lang === "sv" ? parent.nameSv : parent.nameEn}
                        </h3>
                        <Badge variant="secondary" className="ml-auto text-xs">
                          {products.length}{" "}
                          {lang === "sv" ? "produkter" : "products"}
                        </Badge>
                      </div>

                      {products.map((product) => {
                        const isPOD =
                          product.price_on_demand ||
                          (!product.price_from && !product.price_to);
                        return (
                          <div
                            key={product.id}
                            className="flex items-center justify-between py-2 border-t border-border/30 group"
                            data-testid={`review-product-${product.id}`}
                          >
                            <button
                              className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => setDetailProduct(product)}
                            >
                              {product.image_url && (
                                <img
                                  src={product.image_url}
                                  alt=""
                                  className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                                />
                              )}
                              <div className="min-w-0">
                                <span className="text-sm font-medium truncate block hover:text-primary transition-colors">
                                  {product.name}
                                </span>
                                {(() => {
                                  const childCat = categories.find(
                                    (c) => c.slug === product.category_id,
                                  );
                                  return childCat ? (
                                    <span className="text-xs text-muted-foreground">
                                      {lang === "sv"
                                        ? childCat.nameSv
                                        : childCat.nameEn}
                                    </span>
                                  ) : null;
                                })()}
                              </div>
                            </button>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {isPOD ? (
                                <Badge
                                  variant="outline"
                                  className="text-amber-600 border-amber-300 text-xs"
                                >
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  {lang === "sv" ? "Pris på förfrågan" : "POD"}
                                </Badge>
                              ) : (
                                <span className="text-sm font-bold">
                                  {product.price_from
                                    ? formatPrice(product.price_from)
                                    : ""}{" "}
                                  kr
                                </span>
                              )}
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 hover:bg-destructive/10"
                                onClick={() => toggleProductSelection(product)}
                                data-testid={`remove-${product.id}`}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </Card>
                  );
                },
              )}
            </div>

            {selectedProducts.size === 0 && (
              <div className="text-center py-10">
                <ShoppingCart className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  {t("builder.empty")}
                </p>
              </div>
            )}

            {/* Total */}
            <Card
              className="p-6 mt-6 bg-primary/5 border-primary/20 rounded-2xl"
              data-testid="review-total"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-lg">{t("wizard.review.total")}</span>
                <span className="text-2xl font-bold text-primary">
                  {formatPrice(totalEstimate.total)} kr
                </span>
              </div>
              {totalEstimate.hasPOD && (
                <div className="flex items-start gap-2 mt-2 p-2 rounded-xl bg-amber-50 dark:bg-amber-900/20">
                  <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    {t("wizard.review.podNote")}
                  </p>
                </div>
              )}
              {totalEstimate.total > budget && (
                <div className="flex items-start gap-2 mt-2 p-2 rounded-xl bg-red-50 dark:bg-red-900/20">
                  <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-red-700 dark:text-red-400">
                    {lang === "sv"
                      ? `Uppskattat pris överstiger er budget med ${formatPrice(totalEstimate.total - budget)} kr`
                      : `Estimated price exceeds your budget by ${formatPrice(totalEstimate.total - budget)} SEK`}
                  </p>
                </div>
              )}
            </Card>

            {/* Notes */}
            <div className="mt-6">
              <label className="text-sm font-semibold mb-1.5 block">
                {t("summary.notes")}
              </label>
              <Textarea
                placeholder={t("summary.notesPlaceholder")}
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                className="resize-none rounded-xl"
                rows={3}
                data-testid="textarea-order-notes"
              />
            </div>

            <button
              className={`gradient-btn-review w-full mt-6 h-14 text-base flex items-center justify-center gap-2 cursor-pointer ${
                selectedProducts.size === 0 || orderMutation.isPending ? 'opacity-50 pointer-events-none' : ''
              }`}
              onClick={handleSubmit}
              data-testid="button-send-order"
            >
              <Send className="h-5 w-5" />
              {orderMutation.isPending
                ? t("summary.sending")
                : t("summary.send")}
            </button>
          </div>
        </div>
      </div>
      </>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ── STEP 6: Registration ──────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════
  if (step === 6) {
    return (
      <div className="min-h-screen pt-32 pb-12">
        <div className="mx-auto max-w-md px-4 sm:px-6">
          <StepIndicator />
          <div className={`transition-all duration-300 ease-out ${mainAnimClass}`}>
            <button
              onClick={() => animatedGo(5, "left")}
              className="back-btn mb-6"
              data-testid="button-back-6"
            >
              <ArrowLeft className="h-4 w-4" /> {t("builder.prev")}
            </button>

            <div className="text-center mb-8">
              <div className="inline-flex p-4 rounded-full bg-primary/10 mb-5">
                <User className="h-8 w-8 text-primary" />
              </div>
              <h1
                className="text-3xl sm:text-4xl font-bold tracking-tight mb-3"
                data-testid="step6-title"
              >
                {t("register.title")}
              </h1>
              <div className="w-12 h-0.5 bg-primary mx-auto rounded-full" />
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold mb-1.5 block">
                  {t("register.name")} *
                </label>
                <Input
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Anna & Erik"
                  className="h-12 rounded-xl"
                  data-testid="input-reg-name"
                />
              </div>
              <div>
                <label className="text-sm font-semibold mb-1.5 block">
                  {t("register.email")} *
                </label>
                <Input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="anna@example.com"
                  className="h-12 rounded-xl"
                  data-testid="input-reg-email"
                />
              </div>
              <div>
                <label className="text-sm font-semibold mb-1.5 block">
                  {t("register.date")}
                </label>
                <Input
                  type="date"
                  value={regDate}
                  onChange={(e) => setRegDate(e.target.value)}
                  className="h-12 rounded-xl"
                  data-testid="input-reg-date"
                />
              </div>
              <Button
                size="lg"
                className="w-full mt-4 h-14 text-base font-semibold hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200"
                disabled={
                  !regName || !regEmail || registerMutation.isPending
                }
                onClick={() => registerMutation.mutate()}
                data-testid="button-register"
              >
                {registerMutation.isPending
                  ? t("general.loading")
                  : t("summary.send")}
                <Send className="ml-2 h-5 w-5" />
              </Button>

              {registerMutation.isError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20">
                  <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                  <p className="text-sm text-red-700 dark:text-red-400">
                    {lang === "sv"
                      ? "Något gick fel. Försök igen."
                      : "Something went wrong. Try again."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ── STEP 7: Success ───────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen flex items-center justify-center py-12">
      <div className="mx-auto max-w-md px-4 sm:px-6 text-center">
        <div className="flex justify-center mb-6">
          <div className="p-5 rounded-full bg-primary/10" style={{ animation: "bounce-in 0.6s ease-out" }}>
            <CheckCircle className="h-12 w-12 text-primary" />
          </div>
        </div>
        <h1
          className="text-3xl sm:text-4xl font-bold tracking-tight mb-4"
          data-testid="step7-title"
        >
          {t("summary.success")}
        </h1>
        <p className="text-base text-muted-foreground mb-6 leading-relaxed">
          {t("summary.successMsg")}
        </p>
        <div
          className="bg-muted/30 backdrop-blur-sm rounded-3xl p-6 mb-8 text-left border border-white/10"
          data-testid="success-summary"
        >
          <p className="text-xs text-muted-foreground mb-3 font-semibold uppercase tracking-wider">
            {lang === "sv"
              ? "Beställningssammanfattning"
              : "Order summary"}
          </p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>{lang === "sv" ? "Produkter" : "Products"}</span>
              <span className="font-bold">{selectedProducts.size}</span>
            </div>
            <div className="flex justify-between">
              <span>{t("wizard.review.total")}</span>
              <span className="font-bold">
                {formatPrice(totalEstimate.total)} kr
              </span>
            </div>
            {totalEstimate.hasPOD && (
              <div className="flex justify-between">
                <span className="text-amber-600">
                  {t("products.priceOnDemand")}
                </span>
                <span className="font-bold text-amber-600">
                  {totalEstimate.podCount}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span>{lang === "sv" ? "Region" : "Region"}</span>
              <span className="font-bold">{selectedRegion}</span>
            </div>
            <div className="flex justify-between">
              <span>{lang === "sv" ? "Kontakt" : "Contact"}</span>
              <span className="font-bold">{contactName}</span>
            </div>
            {orderId && (
              <div className="flex justify-between pt-2 border-t border-border/50 mt-2">
                <span>
                  {lang === "sv" ? "Beställnings-ID" : "Order ID"}
                </span>
                <span className="font-bold">#{orderId}</span>
              </div>
            )}
          </div>
        </div>
        <Link href="/portal">
          <Button
            size="lg"
            className="cursor-pointer h-14 px-8 text-base font-semibold hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200"
            data-testid="button-go-portal"
          >
            {t("summary.goPortal")}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
