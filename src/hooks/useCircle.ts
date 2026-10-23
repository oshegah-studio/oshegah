import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Database } from "@/integrations/supabase/types";

export type CircleEntry = Database["public"]["Functions"]["get_circle_entries"]["Returns"][number];
export type CircleAction = "save" | "unsave" | "view" | "remove_history" | "clear_history";

export function useCircle() {
  const { user } = useAuth();
  const client = useQueryClient();
  const userId = user?.id;
  const key = ["circle", userId];
  const query = useQuery({
    queryKey: key,
    enabled: Boolean(userId),
    staleTime: 30_000,
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase.rpc("get_circle_entries");
      if (error) throw error;
      return data ?? [];
    },
  });
  const mutation = useMutation({
    mutationFn: async ({ customerId, action }: { customerId?: string; action: CircleAction }) => {
      if (!userId) throw new Error("AUTH_REQUIRED");
      const { error } = await supabase.rpc("update_circle", { _customer_id: customerId ?? "00000000-0000-0000-0000-000000000000", _action: action });
      if (error) throw error;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: key }),
  });
  // Never return another account's cached list when the session changes.
  return { ...query, data: userId ? query.data : [], mutation };
}