import { useState } from "react";
import { Link, useNavigate, useLocation, Navigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wordmark } from "@/components/Brand";
import { useAuth, homeRouteFor } from "@/hooks/useAuth";

export default function Login() {
  const { user, profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={location.state?.from || homeRouteFor(profile, isAdmin)} replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back.");
    navigate(location.state?.from || "/dashboard", { replace: true });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-5 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-7 shadow-soft">
        <Wordmark />
        <h1 className="mt-6 font-display text-2xl font-semibold">Log in</h1>
        <p className="mt-1 text-sm text-muted-foreground">Access your OSHEGAH dashboard.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>{busy ? "Signing in…" : "Log in"}</Button>
        </form>
        <p className="mt-5 text-center text-sm text-muted-foreground">
          No account? <Link to="/signup" className="font-medium text-primary hover:underline">Create one</Link>
        </p>
      </div>
    </main>
  );
}
