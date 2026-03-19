import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Send, CheckCircle, AlertCircle, User, Mail, Phone, Calendar, Package, Loader2,
} from "lucide-react";

interface VendorResponseData {
  orderItemId: number;
  orderId: number;
  status: string;
  customerNotes: string | null;
  quotedPrice: number | null;
  vendorMessage: string | null;
  deliveryDate: string | null;
  vendorName: string;
  productName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  weddingDate: string | null;
}

export default function VendorRespond() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [message, setMessage] = useState("");
  const [quotedPrice, setQuotedPrice] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");

  const { data, isLoading, error } = useQuery<VendorResponseData>({
    queryKey: ["/api/vendor/respond", token],
    queryFn: async () => {
      const res = await fetch(`/api/vendor/respond/${token}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Okänt fel" }));
        throw new Error(err.error || "Kunde inte ladda förfrågan");
      }
      return res.json();
    },
    enabled: !!token,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/vendor/respond/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message.trim() || undefined,
          quotedPrice: quotedPrice ? parseInt(quotedPrice, 10) : undefined,
          deliveryDate: deliveryDate || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Kunde inte skicka svar" }));
        throw new Error(err.error);
      }
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 pt-24 pb-12">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Laddar förfrågan...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 pt-24 pb-12">
        <Card className="max-w-md w-full p-8 text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-400" />
          <h2 className="text-xl font-bold mb-2">Ogiltig länk</h2>
          <p className="text-sm text-muted-foreground">
            {(error as Error)?.message || "Denna länk är ogiltig eller har upphört att gälla."}
          </p>
        </Card>
      </div>
    );
  }

  const alreadyResponded = data.status === "quoted" || data.status === "accepted" || data.status === "declined";

  if (submitMutation.isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 pt-24 pb-12">
        <Card className="max-w-md w-full p-8 text-center">
          <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
          <h2 className="text-xl font-bold mb-2">Tack för ert svar!</h2>
          <p className="text-sm text-muted-foreground">
            Ert svar har skickats till {data.customerName}. Kunden har fått en notifikation via e-post.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 pt-24 pb-12">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ letterSpacing: "-0.02em" }}>
            Kundförfrågan via Wedda
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Svara direkt till kunden nedan
          </p>
        </div>

        {/* Customer info card */}
        <Card className="p-5">
          <h3 className="font-medium mb-3 text-sm uppercase tracking-wide text-muted-foreground">Kundinformation</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>{data.customerName}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>{data.customerEmail}</span>
            </div>
            {data.customerPhone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{data.customerPhone}</span>
              </div>
            )}
            {data.weddingDate && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>Bröllopsdag: {data.weddingDate}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Product/service card */}
        <Card className="p-5">
          <h3 className="font-medium mb-3 text-sm uppercase tracking-wide text-muted-foreground">Efterfrågad tjänst</h3>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">{data.productName}</p>
              <p className="text-xs text-muted-foreground">Leverantör: {data.vendorName}</p>
            </div>
          </div>
          {data.customerNotes && (
            <div className="mt-4 p-3 bg-accent/50 rounded-lg">
              <p className="text-xs font-medium text-muted-foreground mb-1">Kundanteckningar:</p>
              <p className="text-sm">{data.customerNotes}</p>
            </div>
          )}
        </Card>

        {/* Already responded */}
        {alreadyResponded && (
          <Card className="p-5 border-primary/20">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium mb-1">Ni har redan svarat på denna förfrågan</p>
                {data.quotedPrice && (
                  <p className="text-sm text-muted-foreground">
                    Offererat pris: {data.quotedPrice.toLocaleString("sv-SE")} kr
                  </p>
                )}
                {data.vendorMessage && (
                  <p className="text-sm text-muted-foreground mt-1">Meddelande: {data.vendorMessage}</p>
                )}
                <Badge className="mt-2" variant="outline">
                  {data.status === "quoted" ? "Offert skickad" : data.status === "accepted" ? "Accepterad" : "Avböjd"}
                </Badge>
              </div>
            </div>
          </Card>
        )}

        {/* Response form */}
        {!alreadyResponded && (
          <Card className="p-5">
            <h3 className="font-medium mb-4 text-sm uppercase tracking-wide text-muted-foreground">Ert svar</h3>

            <div className="space-y-4">
              {/* Message */}
              <div>
                <label className="block text-sm font-medium mb-1.5">Meddelande till kunden</label>
                <Textarea
                  placeholder="Skriv ett meddelande till kunden..."
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={4}
                />
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm font-medium mb-1.5">Offererat pris (SEK)</label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="T.ex. 15000"
                    value={quotedPrice}
                    onChange={e => setQuotedPrice(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    min="0"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">kr</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Valfritt – lämna tomt om ni vill diskutera priset separat</p>
              </div>

              {/* Delivery date */}
              <div>
                <label className="block text-sm font-medium mb-1.5">Leveransdatum (valfritt)</label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={e => setDeliveryDate(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              {/* Submit */}
              {submitMutation.error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {(submitMutation.error as Error).message}
                </div>
              )}

              <Button
                className="w-full cursor-pointer"
                size="lg"
                disabled={(!message.trim() && !quotedPrice) || submitMutation.isPending}
                onClick={() => submitMutation.mutate()}
              >
                {submitMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Skickar...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Skicka svar
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Svaret skickas till kunden via Weddas meddelandesystem och e-post.
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
