import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/lib/i18n";
import { PackageProvider } from "@/lib/package-context";
import { UserProvider } from "@/lib/user-context";
import { AuthProvider } from "@/lib/auth-context";
import { Navbar } from "@/components/Navbar";
import { ParallaxBackground } from "@/components/ParallaxBackground";
import Home from "@/pages/home";
import Products from "@/pages/products";
import Categories, { CategoryDetail } from "@/pages/categories";
import Builder from "@/pages/builder";
import AuthPage from "@/pages/auth";
import Portal from "@/pages/portal";
import About from "@/pages/about";
import Privacy from "@/pages/privacy";
import VendorRespond from "@/pages/vendor-respond";
import NotFound from "@/pages/not-found";

function AppRoutes() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/products" component={Products} />
      <Route path="/categories" component={Categories} />
      <Route path="/categories/:slug" component={CategoryDetail} />
      <Route path="/builder" component={Builder} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/portal" component={Portal} />
      <Route path="/about" component={About} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/dashboard" component={Portal} />
      <Route path="/vendor/respond/:token" component={VendorRespond} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <I18nProvider>
          <AuthProvider>
            <UserProvider>
              <PackageProvider>
                <Router hook={useHashLocation}>
                  <div className="min-h-screen bg-background text-foreground">
                    <ParallaxBackground />
                    <Navbar />
                    <main>
                      <AppRoutes />
                    </main>
                  </div>
                </Router>
              </PackageProvider>
            </UserProvider>
          </AuthProvider>
        </I18nProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
