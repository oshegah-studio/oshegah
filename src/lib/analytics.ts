import { supabase } from "@/integrations/supabase/client";
import { getVisitorId } from "@/lib/visitor";

const seenKey = (customerId: string) => `oshegah:viewed:${customerId}`;

/**
 * Records at most one profile view per visitor per profile.
 * The frontend short-circuits repeat visits; the database enforces
 * UNIQUE(customer_id, visitor_id) through a security-definer RPC.
 */
export async function recordProfileView(customerId: string) {
  try {
    if (localStorage.getItem(seenKey(customerId))) return;
  } catch {
    /* private mode — the DB unique index still de-duplicates */
  }
  const { error } = await supabase.rpc("record_profile_view", {
    _customer_id: customerId,
    _visitor_id: getVisitorId(),
  });
  if (error) return; // keep no local flag so the view is retried next visit
  try {
    localStorage.setItem(seenKey(customerId), "1");
  } catch {
    /* ignore */
  }
}


export async function recordLinkClick(customerId: string, linkId: string) {
  await supabase.from("link_clicks").insert({ customer_id: customerId, link_id: linkId });
}
