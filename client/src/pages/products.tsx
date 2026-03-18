import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { usePackage } from "@/lib/package-context";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { Category, Product } from "@shared/schema";
import { Search, AlertCircle, Check, Plus } from "lucide-react";

export default function Products() {
  const { t, lang } = useI18n();
  const { toggleProductObj, isProductSelected } = usePackage();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    queryFn: () => apiRequest("GET", "/api/categories").then(r => r.json()),
  });

  const { data: allProducts = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    queryFn: () => apiRequest("GET", "/api/products").then(r => r.json()),
  });

  // Filter products client-side for immediate responsiveness
  const filteredProducts = allProducts.filter(p => {
    const matchesCategory = !activeCategory || p.category_id === activeCategory;
    const matchesSearch = !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getCategoryName = (categoryId: string) => {
    const cat = categories.find(c => c.slug === categoryId || (c as any).id === categoryId);
    if (!cat) return categoryId;
    return lang === "sv" ? cat.nameSv : cat.nameEn;
  };

  function getCategoryFilterId(cat: Category): string {
    return cat.slug;
  }

  const sv = lang === "sv";

  return (
    <div className="min-h-screen pt-28 pb-12">
      {/* Product Detail Dialog */}
      {detailProduct && (
        <Dialog open={!!detailProduct} onOpenChange={(open: boolean) => !open && setDetailProduct(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-lg">{detailProduct.name}</DialogTitle>
            </DialogHeader>
            {detailProduct.image_url && (
              <div className="aspect-[16/9] overflow-hidden rounded-2xl bg-muted">
                <img src={detailProduct.image_url} alt={detailProduct.name} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="space-y-3">
              <Badge variant="secondary" className="text-xs">
                {getCategoryName(detailProduct.category_id)}
              </Badge>
              {detailProduct.description && detailProduct.description !== detailProduct.name && (
                <p className="text-sm text-muted-foreground">{detailProduct.description}</p>
              )}
              <div>
                {detailProduct.price_on_demand || (!detailProduct.price_from && !detailProduct.price_to) ? (
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-medium text-amber-600">{t("products.priceOnDemand")}</span>
                  </div>
                ) : (
                  <p className="text-lg font-bold text-primary">
                    {detailProduct.price_from ? detailProduct.price_from.toLocaleString("sv-SE") : ""}
                    {detailProduct.price_to && detailProduct.price_to !== detailProduct.price_from && (
                      <> – {detailProduct.price_to.toLocaleString("sv-SE")}</>
                    )}{" "}
                    {t("general.sek")}
                  </p>
                )}
              </div>
              <Button
                className="w-full"
                variant={isProductSelected(detailProduct.id) ? "secondary" : "default"}
                onClick={() => { toggleProductObj(detailProduct); setDetailProduct(null); }}
              >
                {isProductSelected(detailProduct.id) ? (
                  <><Check className="h-4 w-4 mr-2" /> {t("products.added")} — {sv ? "Ta bort" : "Remove"}</>
                ) : (
                  <><Plus className="h-4 w-4 mr-2" /> {sv ? "Lägg till i din kundvagn" : "Add to your cart"}</>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-medium uppercase tracking-[0.15em] text-primary mb-2">
            {lang === "sv" ? "UTFORSKA" : "EXPLORE"}
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2" style={{ letterSpacing: "-0.02em" }}>
            {t("products.title")}
          </h1>
          <div className="w-16 h-1 bg-primary/60 rounded-full mb-6" />

          {/* Search */}
          <div className="relative mb-5">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("products.search")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 w-full h-12"
              data-testid="input-search"
            />
          </div>

          {/* Category filter tabs */}
          <div className="relative">
            <div className="flex gap-2 overflow-x-auto pb-2 pr-16 scrollbar-none" style={{ WebkitOverflowScrolling: 'touch' }}>
              <button
                className={`flex-shrink-0 whitespace-nowrap px-4 py-2 rounded-full text-xs font-medium transition-all duration-200 ${!activeCategory ? 'bg-primary text-primary-foreground shadow-md' : 'border border-border bg-background hover:bg-muted'}`}
                onClick={() => setActiveCategory(null)}
                data-testid="filter-all"
              >
                {t("products.all")}
              </button>
              {categories.map(cat => {
                const filterId = getCategoryFilterId(cat);
                const hasProducts = allProducts.some(p => p.category_id === filterId);
                if (!hasProducts) return null;
                return (
                  <button
                    key={cat.id}
                    className={`flex-shrink-0 whitespace-nowrap px-4 py-2 rounded-full text-xs font-medium transition-all duration-200 ${activeCategory === filterId ? 'bg-primary text-primary-foreground shadow-md' : 'border border-border bg-background hover:bg-muted'}`}
                    onClick={() => setActiveCategory(activeCategory === filterId ? null : filterId)}
                    data-testid={`filter-${cat.slug}`}
                  >
                    {lang === "sv" ? cat.nameSv : cat.nameEn}
                  </button>
                );
              })}
            </div>
            <div className="absolute right-0 top-0 bottom-2 w-16 bg-gradient-to-l from-background to-transparent pointer-events-none" />
          </div>
        </div>

        {/* Product grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-5">
          {filteredProducts.map((product, i) => {
            const selected = isProductSelected(product.id);
            return (
              <Card
                key={product.id}
                className="group overflow-hidden transition-all duration-300 hover:-translate-y-1.5 card-hover-glow hover:shadow-xl cursor-pointer"
                style={{ transitionDelay: `${Math.min(i, 15) * 30}ms` }}
                data-testid={`card-product-${product.id}`}
                onClick={() => setDetailProduct(product)}
              >
                <div className="aspect-[4/3] overflow-hidden rounded-t-3xl product-img-overlay relative">
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
                  />
                  {selected && (
                    <div className="absolute top-2 right-2 p-1 rounded-full bg-primary text-primary-foreground shadow-md" style={{ animation: "bounce-in 0.3s ease" }}>
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                </div>
                <div className="p-3.5">
                  <h3 className="font-semibold text-sm truncate">{product.name}</h3>
                  <p className="text-xs text-muted-foreground mb-1.5">
                    {getCategoryName(product.category_id)}
                  </p>
                  <div className="mb-2.5">
                    {product.price_on_demand || (!product.price_from && !product.price_to) ? (
                      <div className="flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 text-amber-500" />
                        <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                          {t("products.priceOnDemand")}
                        </span>
                      </div>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {t("products.from")} {product.price_from?.toLocaleString("sv-SE")} {t("general.sek")}
                      </span>
                    )}
                  </div>
                  <button
                    className={`w-full py-2 rounded-full text-xs font-semibold transition-all duration-200 active:scale-[0.96] cursor-pointer ${
                      selected
                        ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                        : "gradient-btn text-white"
                    }`}
                    onClick={(e) => { e.stopPropagation(); toggleProductObj(product); }}
                    data-testid={`button-add-${product.id}`}
                  >
                    {selected ? t("products.added") : t("products.addToPackage")}
                  </button>
                </div>
              </Card>
            );
          })}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-20">
            <p className="text-sm text-muted-foreground">
              {lang === "sv" ? "Inga produkter hittades." : "No products found."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
