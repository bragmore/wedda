import { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  LayoutDashboard, ShoppingBag, Mail, FileText, ChevronDown, ChevronUp,
  Send, CheckCircle, Clock, AlertCircle, ArrowRight, Wallet, MapPin,
  Users, Calendar, LogOut, MessageSquare, Eye,
} from "lucide-react";
import type { Message } from "@shared/schema";

type Section = "overview" | "orders" | "messages" | "quotes";

const ADMIN_EMAILS = ["jonatan.siden@gmail.com", "jonatan@prymit.com"];

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  sent: "bg-blue-100 text-blue-800",
  quoted: "bg-purple-100 text-purple-800",
  accepted: "bg-green-100 text-green-800",
  declined: "bg-red-100 text-red-800",
};

const statusIcons: Record<string, any> = {
  pending: Clock,
  sent: Send,
  quoted: FileText,
  accepted: CheckCircle,
  declined: AlertCircle,
};

export default function Portal() {
  const { lang } = useI18n();
  const { user, isAuthenticated, logout } = useAuth();
  const [, navigate] = useLocation();
  const [section, setSection] = useState<Section>("overview");
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [replyText, setReplyText] = useState("");
  const queryClient = useQueryClient();
  const sv = lang === "sv";

  // All hooks must be called before any conditional returns (React rules of hooks)
  const userId = user?.id;

  const { data: orders = [] } = useQuery<any[]>({
    queryKey: ["/api/orders/user", userId],
    queryFn: () => apiRequest("GET", `/api/orders/user/${userId}`).then(r => r.json()),
    enabled: !!userId,
    refetchInterval: 15000,
    staleTime: 10000,
  });

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
    queryFn: () => apiRequest("GET", "/api/messages").then(r => r.json()),
    enabled: !!userId,
    refetchInterval: 15000,
    staleTime: 10000,
  });

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/messages/unread-count"],
    queryFn: () => apiRequest("GET", "/api/messages/unread-count").then(r => r.json()),
    enabled: !!userId,
    refetchInterval: 15000,
    staleTime: 10000,
  });

  const unreadCount = unreadData?.count ?? 0;

  const quoteMutation = useMutation({
    mutationFn: async ({ orderId, itemId }: { orderId: number; itemId: number }) => {
      const price = Math.floor(Math.random() * 30000) + 5000;
      return apiRequest("POST", `/api/orders/${orderId}/items/${itemId}/quote`, {
        quotedPrice: price,
        vendorMessage: sv ? "Tack för er förfrågan! Här är vår offert." : "Thank you for your inquiry! Here is our quote.",
        deliveryDate: "2026-06-15",
      }).then(r => r.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders/user", userId] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/unread-count"] });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (msgId: number) => apiRequest("PUT", `/api/messages/${msgId}/read`).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/unread-count"] });
    },
  });

  const acceptMutation = useMutation({
    mutationFn: async ({ orderId, itemId }: { orderId: number; itemId: number }) => {
      return apiRequest("POST", `/api/orders/${orderId}/items/${itemId}/accept`).then(r => r.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders/user", userId] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
    },
  });

  const declineMutation = useMutation({
    mutationFn: async ({ orderId, itemId }: { orderId: number; itemId: number }) => {
      return apiRequest("POST", `/api/orders/${orderId}/items/${itemId}/decline`).then(r => r.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders/user", userId] });
    },
  });

  const replyMutation = useMutation({
    mutationFn: async ({ orderId, body, vendorEmail }: { orderId: number; body: string; vendorEmail?: string }) => {
      return apiRequest("POST", `/api/orders/${orderId}/messages`, {
        senderType: "customer",
        senderName: user?.name || "",
        senderEmail: user?.email || "",
        subject: sv ? "Svar" : "Reply",
        body,
        vendorEmail,
      }).then(r => r.json());
    },
    onSuccess: () => {
      setReplyText("");
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
    },
  });

  // Stats
  const totalOrders = orders.length;
  const totalItems = orders.reduce((acc: number, o: any) => acc + (o.items?.length || 0), 0);
  const quotedItems = orders.reduce((acc: number, o: any) =>
    acc + (o.items?.filter((i: any) => i.status === "quoted" || i.status === "accepted").length || 0), 0);
  const totalQuoted = orders.reduce((acc: number, o: any) =>
    acc + (o.items?.reduce((s: number, i: any) => s + (i.quotedPrice || 0), 0) || 0), 0);

  // Redirect to auth if not logged in (AFTER all hooks)
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 pt-24 pb-12">
        <Card className="max-w-md w-full p-8 sm:p-10 text-center shadow-xl">
          <LayoutDashboard className="h-12 w-12 mx-auto mb-4 text-primary/40" />
          <h2 className="text-xl font-bold mb-2" style={{ letterSpacing: "-0.02em" }}>{sv ? "Logga in för att se din portal" : "Log in to view your portal"}</h2>
          <p className="text-sm text-muted-foreground mb-6">
            {sv ? "Du behöver vara inloggad för att komma åt din portal." : "You need to be logged in to access your portal."}
          </p>
          <Link href="/auth">
            <Button className="cursor-pointer">
              {sv ? "Logga in" : "Log in"} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const navItems = [
    { id: "overview" as Section, label: sv ? "Översikt" : "Overview", icon: LayoutDashboard },
    { id: "orders" as Section, label: sv ? "Beställningar" : "Orders", icon: ShoppingBag, count: totalOrders },
    { id: "messages" as Section, label: sv ? "Meddelanden" : "Messages", icon: Mail, count: unreadCount },
    { id: "quotes" as Section, label: sv ? "Offerter" : "Quotes", icon: FileText, count: quotedItems },
  ];

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-24 pb-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ letterSpacing: "-0.02em" }}>
              {sv ? "Min portal" : "My Portal"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {sv ? `Inloggad som ${user.name}` : `Logged in as ${user.name}`}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => { logout(); navigate("/"); }} className="cursor-pointer">
            <LogOut className="h-4 w-4 mr-2" />
            {sv ? "Logga ut" : "Log out"}
          </Button>
        </div>

        {/* Navigation tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setSection(item.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap cursor-pointer ${
                  section === item.id
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-card hover:bg-accent/60 text-muted-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
                {item.count !== undefined && item.count > 0 && (
                  <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${
                    section === item.id ? "bg-primary-foreground/20" : "bg-primary/10 text-primary"
                  }`}>
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Overview */}
        {section === "overview" && (
          <div className="space-y-6">
            {/* Stats cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-primary/10">
                    <Wallet className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{sv ? "Budget" : "Budget"}</p>
                    <p className="text-lg font-medium">
                      {user.budget ? `${user.budget.toLocaleString("sv-SE")} kr` : (sv ? "Ej angiven" : "Not set")}
                    </p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-500/10">
                    <Calendar className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{sv ? "Bröllopsdag" : "Wedding date"}</p>
                    <p className="text-lg font-medium">{user.weddingDate || (sv ? "Ej angiven" : "Not set")}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-green-500/10">
                    <ShoppingBag className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{sv ? "Beställningar" : "Orders"}</p>
                    <p className="text-lg font-medium">{totalOrders}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-500/10">
                    <FileText className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{sv ? "Totalt offererat" : "Total quoted"}</p>
                    <p className="text-lg font-medium">{totalQuoted > 0 ? `${totalQuoted.toLocaleString("sv-SE")} kr` : "—"}</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Profile info */}
            <Card className="p-6">
              <h3 className="font-medium mb-4">{sv ? "Dina uppgifter" : "Your details"}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{user.email}</span>
                </div>
                {user.phone && (
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{user.phone}</span>
                  </div>
                )}
                {user.region && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{user.region}</span>
                  </div>
                )}
                {user.guestCount && (
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{user.guestCount} {sv ? "gäster" : "guests"}</span>
                  </div>
                )}
              </div>
            </Card>

            {/* Quick actions */}
            {totalOrders === 0 && (
              <Card className="p-6 text-center">
                <ShoppingBag className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                <h3 className="font-medium mb-1">{sv ? "Inga beställningar ännu" : "No orders yet"}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {sv ? "Börja med att skapa ert bröllopspaket!" : "Start by creating your wedding package!"}
                </p>
                <Link href="/builder">
                  <Button className="cursor-pointer">
                    {sv ? "Gå till bröllopsguiden" : "Go to wedding guide"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </Card>
            )}
          </div>
        )}

        {/* Orders */}
        {section === "orders" && (
          <div className="space-y-4">
            {orders.length === 0 ? (
              <Card className="p-8 text-center">
                <ShoppingBag className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-muted-foreground">{sv ? "Inga beställningar ännu" : "No orders yet"}</p>
                <Link href="/builder">
                  <Button className="mt-4 cursor-pointer">{sv ? "Skapa bröllopspaket" : "Create wedding package"}</Button>
                </Link>
              </Card>
            ) : (
              orders.map((order: any) => {
                const expanded = expandedOrder === order.id;
                return (
                  <Card key={order.id} className="overflow-hidden">
                    <button
                      onClick={() => setExpandedOrder(expanded ? null : order.id)}
                      className="w-full p-4 flex items-center justify-between cursor-pointer hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Badge className={statusColors[order.status] || "bg-gray-100"}>
                          {sv ? (order.status === "sent" ? "Skickad" : order.status === "pending" ? "Väntar" : order.status) : order.status}
                        </Badge>
                        <span className="text-sm font-medium">
                          {sv ? "Beställning" : "Order"} #{order.id}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {order.items?.length || 0} {sv ? "tjänster" : "services"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {order.totalEstimate > 0 && (
                          <span className="text-sm font-medium">{order.totalEstimate.toLocaleString("sv-SE")} kr</span>
                        )}
                        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </button>
                    {expanded && order.items && (
                      <div className="border-t border-border px-4 pb-4">
                        {order.items.map((item: any) => {
                          const StatusIcon = statusIcons[item.status] || Clock;
                          return (
                            <div key={item.id} className="py-3 border-b border-border/50 last:border-0 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <StatusIcon className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="text-sm font-medium">{item.vendorName || `Leverantör #${item.vendorId}`}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {item.productName && <span className="mr-2">{item.productName}</span>}
                                    {item.quotedPrice ? `${item.quotedPrice.toLocaleString("sv-SE")} kr` : (sv ? "Väntar på offert" : "Awaiting quote")}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge className={statusColors[item.status] || "bg-gray-100"} variant="outline">
                                  {item.status}
                                </Badge>
                                {item.status === "sent" && user?.email && ADMIN_EMAILS.includes(user.email) && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => quoteMutation.mutate({ orderId: order.id, itemId: item.id })}
                                    disabled={quoteMutation.isPending}
                                    className="text-xs cursor-pointer"
                                  >
                                    {sv ? "Simulera offert (admin)" : "Simulate quote (admin)"}
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Card>
                );
              })
            )}
          </div>
        )}

        {/* Messages */}
        {section === "messages" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Message list */}
            <div className="lg:col-span-1 space-y-2">
              {messages.length === 0 ? (
                <Card className="p-8 text-center">
                  <Mail className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">{sv ? "Inga meddelanden" : "No messages"}</p>
                </Card>
              ) : (
                messages.map((msg: Message) => (
                  <Card
                    key={msg.id}
                    className={`p-3 cursor-pointer transition-colors hover:bg-accent/50 ${
                      selectedMessage?.id === msg.id ? "ring-2 ring-primary" : ""
                    } ${!msg.read && msg.senderType !== "customer" ? "border-l-4 border-l-primary" : ""}`}
                    onClick={() => {
                      setSelectedMessage(msg);
                      if (!msg.read && msg.senderType !== "customer") {
                        markReadMutation.mutate(msg.id);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm truncate ${!msg.read && msg.senderType !== "customer" ? "font-semibold" : "font-medium"}`}>
                          {msg.senderName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{msg.subject}</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">
                          {msg.createdAt ? new Date(msg.createdAt).toLocaleDateString("sv-SE") : ""}
                        </p>
                      </div>
                      {!msg.read && msg.senderType !== "customer" && (
                        <div className="w-2 h-2 rounded-full bg-primary mt-1 shrink-0" />
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>

            {/* Message detail */}
            <div className="lg:col-span-2">
              {selectedMessage ? (
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-medium">{selectedMessage.subject}</h3>
                      <p className="text-sm text-muted-foreground">
                        {sv ? "Från" : "From"}: {selectedMessage.senderName} ({selectedMessage.senderEmail})
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {selectedMessage.createdAt ? new Date(selectedMessage.createdAt).toLocaleString("sv-SE") : ""}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {selectedMessage.senderType === "vendor" ? (sv ? "Leverantör" : "Vendor") :
                       selectedMessage.senderType === "system" ? "System" : (sv ? "Du" : "You")}
                    </Badge>
                  </div>
                  <div className="bg-card rounded-2xl p-4 mb-4 whitespace-pre-wrap text-sm border border-border/50">
                    {selectedMessage.body}
                  </div>

                  {/* Reply form */}
                  <div className="border-t border-border pt-4">
                    <Textarea
                      placeholder={sv ? "Skriv ett svar..." : "Write a reply..."}
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      className="mb-3"
                      rows={3}
                    />
                    <Button
                      size="sm"
                      disabled={!replyText.trim() || replyMutation.isPending}
                      onClick={() => {
                        if (replyText.trim()) {
                          // Pass vendor email so backend can send real email
                          const vendorEmail = selectedMessage.senderType === "vendor" ? selectedMessage.senderEmail : undefined;
                          replyMutation.mutate({ orderId: selectedMessage.orderId, body: replyText, vendorEmail });
                        }
                      }}
                      className="cursor-pointer"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {sv ? "Skicka svar" : "Send reply"}
                      {selectedMessage.senderType === "vendor" && (
                        <span className="ml-1 text-xs opacity-70">
                          ({sv ? "e-post skickas" : "email sent"})
                        </span>
                      )}
                    </Button>
                  </div>
                </Card>
              ) : (
                <Card className="p-8 text-center">
                  <MessageSquare className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    {sv ? "Välj ett meddelande för att läsa det" : "Select a message to read it"}
                  </p>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Quotes */}
        {section === "quotes" && (
          <div className="space-y-4">
            {orders.every((o: any) => !o.items?.some((i: any) => i.quotedPrice)) ? (
              <Card className="p-8 text-center">
                <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-muted-foreground">{sv ? "Inga offerter mottagna ännu" : "No quotes received yet"}</p>
                {user?.email && ADMIN_EMAILS.includes(user.email) && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {sv ? "Simulera offerter under Beställningar-fliken (admin)" : "Simulate quotes in the Orders tab (admin)"}
                  </p>
                )}
              </Card>
            ) : (
              <div className="grid gap-4">
                {orders.flatMap((order: any) =>
                  (order.items || [])
                    .filter((item: any) => item.quotedPrice)
                    .map((item: any) => (
                      <Card key={`${order.id}-${item.id}`} className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{item.vendorName || `Leverantör #${item.vendorId}`}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.productName && <span>{item.productName} · </span>}
                              {sv ? "Beställning" : "Order"} #{order.id}
                            </p>
                            {item.vendorMessage && (
                              <p className="text-xs text-muted-foreground mt-1 italic">"{item.vendorMessage}"</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-medium text-primary">
                              {item.quotedPrice.toLocaleString("sv-SE")} kr
                            </p>
                            <Badge className={statusColors[item.status]} variant="outline">
                              {item.status === "quoted" ? (sv ? "Offert" : "Quote") :
                               item.status === "accepted" ? (sv ? "Accepterad" : "Accepted") : item.status}
                            </Badge>
                          </div>
                        </div>
                        {item.status === "quoted" && (
                          <div className="flex gap-2 mt-3 pt-3 border-t border-border/50">
                            <Button
                              size="sm"
                              className="cursor-pointer"
                              disabled={acceptMutation.isPending || declineMutation.isPending}
                              onClick={() => acceptMutation.mutate({ orderId: order.id, itemId: item.id })}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              {sv ? "Acceptera" : "Accept"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="cursor-pointer"
                              disabled={acceptMutation.isPending || declineMutation.isPending}
                              onClick={() => declineMutation.mutate({ orderId: order.id, itemId: item.id })}
                            >
                              <AlertCircle className="h-3 w-3 mr-1" />
                              {sv ? "Avböj" : "Decline"}
                            </Button>
                          </div>
                        )}
                      </Card>
                    ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
