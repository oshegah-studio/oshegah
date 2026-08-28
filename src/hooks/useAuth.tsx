import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { listAccounts, rememberAccount, forgetAccount, type ParkedAccount } from "@/lib/accounts";

export type AccountType = "personal" | "business";

export interface AppProfile {
  id: string;
  auth_user_id: string;
  account_type: AccountType;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  last_profile_type_change_at: string | null;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: AppProfile | null;
  isAdmin: boolean;
  loading: boolean;
  accounts: ParkedAccount[];
  refreshAccounts: () => Promise<void>;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null, session: null, profile: null, isAdmin: false, loading: true,
  accounts: [], refreshAccounts: async () => {},
  refresh: async () => {}, signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AppProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<ParkedAccount[]>([]);

  const refreshAccounts = useCallback(async () => {
    setAccounts(await listAccounts());
  }, []);

  const loadProfile = useCallback(async (userId: string, activeSession?: Session | null) => {
    const [{ data: prof }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").eq("auth_user_id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);
    const typed = (prof as AppProfile) ?? null;
    setProfile(typed);
    setIsAdmin(Boolean(roles?.some((r) => r.role === "admin")));

    if (activeSession) {
      await rememberAccount(activeSession, {
        name: typed?.full_name,
        accountType: typed?.account_type,
        avatarUrl: typed?.avatar_url,
      });
      await refreshAccounts();
    }
  }, [refreshAccounts]);

  useEffect(() => {
    void refreshAccounts();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      if (nextSession?.user) {
        setTimeout(() => { void loadProfile(nextSession.user.id, nextSession); }, 0);
      } else {
        setProfile(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(async ({ data: { session: current } }) => {
      setSession(current);
      setUser(current?.user ?? null);
      if (current?.user) await loadProfile(current.user.id, current);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [loadProfile, refreshAccounts]);

  const refresh = useCallback(async () => {
    if (user) await loadProfile(user.id, session);
  }, [user, session, loadProfile]);

  const signOut = useCallback(async () => {
    const id = user?.id;
    await supabase.auth.signOut();
    if (id) await forgetAccount(id);
    setProfile(null);
    setIsAdmin(false);
    await refreshAccounts();
  }, [user?.id, refreshAccounts]);

  return (
    <AuthContext.Provider
      value={{ user, session, profile, isAdmin, loading, accounts, refreshAccounts, refresh, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

export const homeRouteFor = (profile: AppProfile | null, isAdmin: boolean) => {
  if (isAdmin) return "/admin";
  if (profile?.account_type === "business") return "/business";
  return "/dashboard";
};
