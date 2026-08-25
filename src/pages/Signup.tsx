import { useState } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wordmark } from "@/components/Brand";
import { useAuth, homeRouteFor } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export default function Signup() {
  const { user, profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accountType, setAccountType] = useState<"personal" | "business">("personal");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={homeRouteFor(profile, isAdmin)} replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return toast.error("Use at least 8 characters for your password.");
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: fullName.trim(), account_type: accountType },
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Account created.");
    navigate(accountType === "business" ? "/business" : "/dashboard", { replace: true });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-5 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-7 shadow-soft">
        <Wordmark />
        <h1 className="mt-6 font-display text-2xl font-semibold">Create your account</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your digital card is minutes away.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {(["personal", "business"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setAccountType(type)}
                className={cn(
                  "rounded-xl border px-3 py-2 text-sm font-medium capitalize transition-colors",
                  accountType === type ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground",
                )}
              >
                {type}
              </button>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>{busy ? "Creating…" : "Create account"}</Button>
        </form>
        <p className="mt-5 text-center text-sm text-muted-foreground">
          Already have an account? <Link to="/login" className="font-medium text-primary hover:underline">Log in</Link>
        </p>
      </div>
    </main>
  );
}
