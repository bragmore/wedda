import { useState } from "react";
import { useLocation } from "wouter";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Mail, Lock, User, Phone, ArrowRight, ArrowLeft, CheckCircle } from "lucide-react";

type Tab = "login" | "register" | "forgot";

export default function AuthPage() {
  const { lang } = useI18n();
  const { login, register } = useAuth();
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<Tab>("login");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register state
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");

  // Forgot state
  const [forgotEmail, setForgotEmail] = useState("");

  const sv = lang === "sv";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(loginEmail, loginPassword);
      navigate("/portal");
    } catch (err: any) {
      setError(sv ? "Felaktig e-post eller lösenord" : "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (regPassword !== regConfirm) {
      setError(sv ? "Lösenorden matchar inte" : "Passwords don't match");
      return;
    }
    if (regPassword.length < 6) {
      setError(sv ? "Lösenordet måste vara minst 6 tecken" : "Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      await register({ email: regEmail, password: regPassword, name: regName, phone: regPhone || undefined });
      navigate("/portal");
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.includes("409")) {
        setError(sv ? "E-postadressen är redan registrerad" : "Email already registered");
      } else {
        setError(sv ? "Registrering misslyckades" : "Registration failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await apiRequest("POST", "/api/auth/forgot-password", { email: forgotEmail });
      setForgotSent(true);
    } catch {
      setError(sv ? "Något gick fel" : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-24 pb-12">
      <Card className="w-full max-w-md p-8 sm:p-10 shadow-xl">
        {/* Tab selector */}
        {tab !== "forgot" && (
          <div className="flex mb-8 border-b border-border">
            <button
              onClick={() => { setTab("login"); setError(""); }}
              className={`flex-1 pb-3 text-sm font-medium transition-colors cursor-pointer ${
                tab === "login" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
              }`}
            >
              {sv ? "Logga in" : "Log in"}
            </button>
            <button
              onClick={() => { setTab("register"); setError(""); }}
              className={`flex-1 pb-3 text-sm font-medium transition-colors cursor-pointer ${
                tab === "register" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
              }`}
            >
              {sv ? "Skapa konto" : "Create account"}
            </button>
          </div>
        )}

        {/* Login form */}
        {tab === "login" && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold tracking-tight" style={{ letterSpacing: "-0.02em" }}>{sv ? "Välkommen tillbaka" : "Welcome back"}</h1>
              <p className="text-sm text-muted-foreground mt-1">{sv ? "Logga in på ditt Wedda-konto" : "Log in to your Wedda account"}</p>
            </div>

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder={sv ? "E-postadress" : "Email address"}
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder={sv ? "Lösenord" : "Password"}
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                className="pl-10"
                required
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full h-12 text-base font-semibold cursor-pointer" disabled={loading}>
              {loading ? (sv ? "Loggar in..." : "Logging in...") : (sv ? "Logga in" : "Log in")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>

            <button
              type="button"
              onClick={() => { setTab("forgot"); setError(""); setForgotSent(false); }}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 cursor-pointer"
            >
              {sv ? "Glömt lösenord?" : "Forgot password?"}
            </button>
          </form>
        )}

        {/* Register form */}
        {tab === "register" && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold tracking-tight" style={{ letterSpacing: "-0.02em" }}>{sv ? "Skapa konto" : "Create account"}</h1>
              <p className="text-sm text-muted-foreground mt-1">{sv ? "Börja planera ert drömbröllop" : "Start planning your dream wedding"}</p>
            </div>

            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={sv ? "Ert namn" : "Your name"}
                value={regName}
                onChange={e => setRegName(e.target.value)}
                className="pl-10"
                required
              />
            </div>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder={sv ? "E-postadress" : "Email address"}
                value={regEmail}
                onChange={e => setRegEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="tel"
                placeholder={sv ? "Telefonnummer (valfritt)" : "Phone number (optional)"}
                value={regPhone}
                onChange={e => setRegPhone(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder={sv ? "Lösenord (minst 6 tecken)" : "Password (min 6 characters)"}
                value={regPassword}
                onChange={e => setRegPassword(e.target.value)}
                className="pl-10"
                required
                minLength={6}
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder={sv ? "Bekräfta lösenord" : "Confirm password"}
                value={regConfirm}
                onChange={e => setRegConfirm(e.target.value)}
                className="pl-10"
                required
                minLength={6}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full h-12 text-base font-semibold cursor-pointer" disabled={loading}>
              {loading ? (sv ? "Skapar konto..." : "Creating account...") : (sv ? "Skapa konto" : "Create account")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>
        )}

        {/* Forgot password */}
        {tab === "forgot" && (
          <div className="space-y-4">
            <button
              onClick={() => { setTab("login"); setError(""); setForgotSent(false); }}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-3 w-3" />
              {sv ? "Tillbaka till inloggning" : "Back to login"}
            </button>

            {forgotSent ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h2 className="text-lg font-medium mb-2">
                  {sv ? "E-post skickad!" : "Email sent!"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {sv
                    ? "Om e-postadressen finns registrerad har vi skickat en återställningskod."
                    : "If the email is registered, we've sent a password reset code."}
                </p>
              </div>
            ) : (
              <form onSubmit={handleForgot} className="space-y-4">
                <div className="text-center mb-4">
                  <h1 className="text-2xl font-bold tracking-tight" style={{ letterSpacing: "-0.02em" }}>{sv ? "Glömt lösenord" : "Forgot password"}</h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    {sv ? "Ange din e-post så skickar vi en återställningslänk" : "Enter your email and we'll send a reset link"}
                  </p>
                </div>

                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder={sv ? "E-postadress" : "Email address"}
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <Button type="submit" className="w-full cursor-pointer" disabled={loading}>
                  {loading ? (sv ? "Skickar..." : "Sending...") : (sv ? "Skicka återställningslänk" : "Send reset link")}
                </Button>
              </form>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
