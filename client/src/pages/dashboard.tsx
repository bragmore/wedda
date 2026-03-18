import { useState } from "react";
import { Link } from "wouter";
import { useI18n } from "@/lib/i18n";
import { useUser } from "@/lib/user-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { Category, Vendor, Order, OrderItem } from "@shared/schema";
import {
  ShoppingBag, ArrowRight, Package, Send, CheckCircle,
  Clock, AlertCircle, DollarSign, Zap
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type OrderWithItems = Order & { items: OrderItem[] };

export default function Dashboard() {
  const { t, lang } = useI18n();
  const { user, setUser } = useUser();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [loginEmail, setLoginEmail] = useState("");

  // Quick login by email
  const loginMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/users", { name: loginEmail.split("@")[0], email: loginEmail });
      return res.json();
    },
    onSuccess: (data) => setUser(data),
  });

  const { data: orders = [], isLoading } = useQuery<OrderWithItems[]>({
    queryKey: ["/api/orders/user", user?.id],
    queryFn: () => apiRequest("GET", `/api/orders/user/${user!.id}`).then(r => r.json()),
    enabled: !!user?.id,
  });

  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
    queryFn: () => apiRequest("GET", "/api/vendors").then(r => r.json()),
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    queryFn: () => apiRequest("GET", "/api/categories").then(r => r.json()),
  });

  const simulateQuoteMutation = useMutation({
    mutationFn: async ({ orderId, itemId }: { orderId: number; itemId: number }) => {
      const price = Math.floor(Math.random() * 40000) + 5000;
      const res = await apiRequest("POST", `/api/orders/${orderId}/items/${itemId}/quote`, {
        quotedPrice: price,
        vendorMessage: lang === "sv"
          ? `Tack för er förfrågan! Vi kan erbjuda detta för ${price.toLocaleString("sv-SE")} kr. Kontakta oss gärna för mer detaljer.`
          : `Thank you for your inquiry! We can offer this for ${price.toLocaleString("sv-SE")} SEK. Please contact us for more details.`,
        deliveryDate: "2026-06-15",
      });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/orders/user", user?.id] });
      toast({
        title: lang === "sv" ? "Offert simulerad" : "Quote simulated",
        description: lang === "sv" ? "En simulerad offert har lagts till." : "A simulated quote has been added.",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />{t("dash.status.pending")}</Badge>;
      case "sent":
        return <Badge variant="secondary"><Send className="h-3 w-3 mr-1" />{t("dash.status.sent")}</Badge>;
      case "quoted":
        return <Badge variant="default"><DollarSign className="h-3 w-3 mr-1" />{t("dash.status.quoted")}</Badge>;
      case "accepted":
        return <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />{t("dash.status.accepted")}</Badge>;
      case "declined":
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />{t("dash.status.declined")}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-24 pb-12">
        <div className="mx-auto max-w-sm px-4 text-center">
          <Package className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h1 className="text-2xl font-bold tracking-tight mb-2" style={{ letterSpacing: "-0.02em" }}>{t("dash.title")}</h1>
          <p className="text-sm text-muted-foreground mb-6">
            {lang === "sv" ? "Logga in med din e-postadress för att se dina förfrågningar." : "Log in with your email to view your inquiries."}
          </p>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="anna@example.com"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              data-testid="input-login-email"
            />
            <Button
              disabled={!loginEmail || loginMutation.isPending}
              onClick={() => loginMutation.mutate()}
              data-testid="button-login"
            >
              {lang === "sv" ? "Logga in" : "Log in"}
            </Button>
          </div>
          <div className="mt-6">
            <Link href="/builder">
              <Button variant="outline" className="cursor-pointer" data-testid="button-start-building">
                {t("hero.cta")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <p className="text-sm text-muted-foreground mb-1">
              {lang === "sv" ? `Välkommen, ${user.name}` : `Welcome, ${user.name}`}
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ letterSpacing: "-0.02em" }}>{t("dash.title")}</h1>
            <div className="w-16 h-1 bg-primary/60 mt-3 rounded-full" />
          </div>
          <Link href="/builder">
            <Button variant="outline" className="cursor-pointer" data-testid="button-new-package">
              <ShoppingBag className="h-4 w-4 mr-2" />
              {lang === "sv" ? "Nytt paket" : "New package"}
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="p-6 animate-pulse">
                <div className="h-4 bg-muted rounded w-1/3 mb-3" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </Card>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20">
            <Package className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">
              {t("dash.noOrders")}
            </p>
            <Link href="/builder">
              <Button className="mt-4 cursor-pointer" data-testid="button-start-from-empty">
                {t("hero.cta")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map(order => {
              const quotedItems = order.items.filter(i => i.quotedPrice != null);
              const totalQuoted = quotedItems.reduce((sum, i) => sum + (i.quotedPrice || 0), 0);

              return (
                <Card key={order.id} className="border border-border/50" data-testid={`order-${order.id}`}>
                  <div className="p-5 border-b border-border/50">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h2 className="font-semibold text-sm">
                          {lang === "sv" ? `Förfrågan #${order.id}` : `Inquiry #${order.id}`}
                        </h2>
                        <p className="text-xs text-muted-foreground">
                          {order.items.length} {lang === "sv" ? "leverantörer" : "vendors"}
                          {quotedItems.length > 0 && ` · ${quotedItems.length} ${lang === "sv" ? "offerter" : "quotes"}`}
                        </p>
                      </div>
                      {quotedItems.length > 0 && (
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">
                            {t("dash.total")}
                          </p>
                          <p className="text-lg font-semibold text-primary">
                            {totalQuoted.toLocaleString("sv-SE")} {t("general.sek")}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="divide-y divide-border/30">
                    {order.items.map(item => {
                      const vendor = vendors.find(v => v.id === item.vendorId);
                      const cat = categories.find(c => c.id === item.categoryId);
                      return (
                        <div key={item.id} className="p-5" data-testid={`order-item-${item.id}`}>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-medium text-sm">
                                  {vendor?.name || `Vendor #${item.vendorId}`}
                                </h3>
                                {getStatusBadge(item.status)}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {cat ? (lang === "sv" ? cat.nameSv : cat.nameEn) : ""}
                                {vendor ? ` · ${vendor.location}` : ""}
                              </p>
                              {item.vendorMessage && (
                                <div className="mt-3 p-3 rounded-2xl bg-accent/50">
                                  <p className="text-xs text-foreground leading-relaxed">
                                    {item.vendorMessage}
                                  </p>
                                </div>
                              )}
                            </div>
                            <div className="text-right flex-shrink-0">
                              {item.quotedPrice != null ? (
                                <p className="font-semibold text-sm text-primary">
                                  {item.quotedPrice.toLocaleString("sv-SE")} {t("general.sek")}
                                </p>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => simulateQuoteMutation.mutate({ orderId: order.id, itemId: item.id })}
                                  disabled={simulateQuoteMutation.isPending}
                                  data-testid={`button-simulate-${item.id}`}
                                >
                                  <Zap className="h-3 w-3 mr-1" />
                                  {t("dash.simulateQuote")}
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
