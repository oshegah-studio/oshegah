import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Database } from "@/integrations/supabase/types";

export type CustomerRow = Database["public"]["Tables"]["customers"]["Row"];
export type LinkRow = Database["public"]["Tables"]["links"]["Row"];
export type BusinessRow = Database["public"]["Tables"]["businesses"]["Row"];
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

/** The signed-in user's own card profile (personal dashboard). */
export function useMyCustomer() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["my-customer", profile?.id],
    enabled: Boolean(profile?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("user_id", profile!.id)
        .is("business_id", null)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as CustomerRow) ?? null;
    },
  });
}

export function useLinks(customerId?: string | null) {
  return useQuery({
    queryKey: ["links", customerId],
    enabled: Boolean(customerId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("links")
        .select("*")
        .eq("customer_id", customerId!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as LinkRow[];
    },
  });
}

export interface CustomerStats {
  views: number;
  clicks: number;
  lastVisit: string | null;
  topLinkId: string | null;
  viewsByDay: { day: string; views: number }[];
  clicksByLink: Record<string, number>;
}

export function useCustomerStats(customerIds: string[]) {
  const key = [...customerIds].sort().join(",");
  return useQuery({
    queryKey: ["stats", key],
    enabled: customerIds.length > 0,
    queryFn: async (): Promise<CustomerStats> => {
      const [views, clicks] = await Promise.all([
        supabase.from("profile_views").select("created_at,customer_id").in("customer_id", customerIds),
        supabase.from("link_clicks").select("created_at,link_id,customer_id").in("customer_id", customerIds),
      ]);
      if (views.error) throw views.error;
      if (clicks.error) throw clicks.error;

      const byDay = new Map<string, number>();
      for (let i = 13; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        byDay.set(d.toISOString().slice(0, 10), 0);
      }
      let lastVisit: string | null = null;
      for (const v of views.data ?? []) {
        const day = v.created_at.slice(0, 10);
        if (byDay.has(day)) byDay.set(day, (byDay.get(day) ?? 0) + 1);
        if (!lastVisit || v.created_at > lastVisit) lastVisit = v.created_at;
      }

      const clicksByLink: Record<string, number> = {};
      for (const c of clicks.data ?? []) {
        if (!c.link_id) continue;
        clicksByLink[c.link_id] = (clicksByLink[c.link_id] ?? 0) + 1;
      }
      const topLinkId =
        Object.entries(clicksByLink).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

      return {
        views: views.data?.length ?? 0,
        clicks: clicks.data?.length ?? 0,
        lastVisit,
        topLinkId,
        viewsByDay: [...byDay.entries()].map(([day, v]) => ({ day: day.slice(5), views: v })),
        clicksByLink,
      };
    },
  });
}

/** The business owned by the signed-in user. */
export function useMyBusiness() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["my-business", profile?.id],
    enabled: Boolean(profile?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .eq("owner_id", profile!.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as BusinessRow) ?? null;
    },
  });
}

export function useBusinessProfiles(businessId?: string | null) {
  return useQuery({
    queryKey: ["business-profiles", businessId],
    enabled: Boolean(businessId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("business_id", businessId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CustomerRow[];
    },
  });
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  full_name: string;
  avatar_url: string | null;
  views: number;
}

/** Public, privacy-safe ranking: no emails, phones or owner identifiers. */
export function useLeaderboard(limit = 20) {
  return useQuery({
    queryKey: ["leaderboard", limit],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_leaderboard", { _limit: limit });
      if (error) throw error;
      return (data ?? []) as LeaderboardEntry[];
    },
  });
}
