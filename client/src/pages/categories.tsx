import { Link, useParams } from "wouter";
import { useI18n } from "@/lib/i18n";
import { usePackage } from "@/lib/package-context";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Category, Vendor } from "@shared/schema";
import {
  Castle, UtensilsCrossed, Camera, Music, Flower2, Sparkles,
  CircleDot, Heart, Palette, Video, Car, Cake, Mail, Lamp,
  PartyPopper, ClipboardList, Shirt, Lightbulb, Star, MapPin,
  Check, Plus, ArrowLeft, ShoppingBag, Building2, Scissors, Briefcase,
} from "lucide-react";

const iconMap: Record<string, any> = {
  Castle, UtensilsCrossed, Camera, Music, Flower2, Sparkles,
  CircleDot, Heart, Palette, Video, Car, Cake, Mail, Lamp,
  PartyPopper, ClipboardList, Shirt, Lightbulb, Building2, Scissors, Briefcase,
};

export default function Categories() {
  const { t, lang } = useI18n();
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    queryFn: () => apiRequest("GET", "/api/categories").then(r => r.json()),
  });

  return (
    <div className="min-h-screen py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-12">
          <h1 className="text-3xl sm:text-4xl font-light tracking-tight mb-2">{t("categories.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("categories.subtitle")}
          </p>
          <div className="w-12 h-px bg-primary mt-4" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map(cat => {
            const Icon = iconMap[cat.icon] || Heart;
            return (
              <Link key={cat.id} href={`/categories/${cat.slug}`}>
                <Card
                  className="group cursor-pointer p-6 border border-border/50 hover:border-primary/30 transition-all duration-200"
                  data-testid={`card-category-${cat.slug}`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 p-2 rounded-md bg-primary/5">
                      <Icon className="h-5 w-5 text-primary/70 group-hover:text-primary transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm mb-1 group-hover:text-primary transition-colors">
                        {lang === "sv" ? cat.nameSv : cat.nameEn}
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {lang === "sv" ? cat.descriptionSv : cat.descriptionEn}
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function CategoryDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { t, lang } = useI18n();
  const { addVendor, removeVendor, isSelected } = usePackage();

  const { data: category } = useQuery<Category>({
    queryKey: ["/api/categories", slug],
    queryFn: () => apiRequest("GET", `/api/categories/${slug}`).then(r => r.json()),
    enabled: !!slug,
  });

  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors/category", category?.id],
    queryFn: () => apiRequest("GET", `/api/vendors/category/${category!.id}`).then(r => r.json()),
    enabled: !!category?.id,
  });

  if (!category) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">{t("general.loading")}</p>
      </div>
    );
  }

  const Icon = iconMap[category.icon] || Heart;

  return (
    <div className="min-h-screen py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Link href="/categories">
          <span className="inline-flex items-center gap-1 text-sm text-muted-foreground cursor-pointer hover:text-foreground mb-6">
            <ArrowLeft className="h-4 w-4" /> {t("categories.title")}
          </span>
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 rounded-md bg-primary/10">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-light tracking-tight">
              {lang === "sv" ? category.nameSv : category.nameEn}
            </h1>
            <p className="text-sm text-muted-foreground">
              {lang === "sv" ? category.descriptionSv : category.descriptionEn}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {vendors.map(vendor => {
            const selected = isSelected(vendor.id);
            return (
              <Card
                key={vendor.id}
                className={`p-5 border transition-all duration-200 ${
                  selected ? "border-primary/50 bg-primary/5" : "border-border/50"
                }`}
                data-testid={`card-vendor-${vendor.id}`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm">
                      {vendor.name}
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      {vendor.priceRange}
                    </span>
                  </div>
                  {vendor.featured && (
                    <span className="text-[10px] font-medium uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded">
                      {t("general.featured")}
                    </span>
                  )}
                </div>

                <p className="text-xs text-muted-foreground mb-4 line-clamp-2 leading-relaxed">
                  {lang === "sv" ? vendor.descriptionSv : vendor.descriptionEn}
                </p>

                <div className="flex items-center justify-between mb-4">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {vendor.location}
                  </span>
                  <span className="flex items-center gap-0.5">
                    {Array.from({ length: vendor.rating || 0 }).map((_, i) => (
                      <Star key={i} className="h-3 w-3 fill-primary text-primary" />
                    ))}
                  </span>
                </div>

                <Button
                  variant={selected ? "secondary" : "default"}
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    if (selected) {
                      removeVendor(vendor.id);
                    } else {
                      addVendor(vendor, category);
                    }
                  }}
                  data-testid={`button-select-vendor-${vendor.id}`}
                >
                  {selected ? (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      {t("builder.selected")}
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-1" />
                      {t("builder.select")}
                    </>
                  )}
                </Button>
              </Card>
            );
          })}
        </div>

        {/* Floating cart indicator */}
        <Link href="/builder">
          <div className="fixed bottom-6 right-6 z-40">
            <Button size="lg" className="cursor-pointer shadow-lg rounded-full px-6" data-testid="button-floating-cart">
              <ShoppingBag className="h-4 w-4 mr-2" />
              {t("nav.builder")}
            </Button>
          </div>
        </Link>
      </div>
    </div>
  );
}
