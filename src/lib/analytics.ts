import { supabase } from "@/integrations/supabase/client";

const seenKey = (customerId: string) => `oshegah:viewed:${customerId}`;

/** Records one profile view per customer per session. Fire-and-forget. */
export async function recordProfileView(customerId: string) {
  try {
    if (sessionStorage.getItem(seenKey(customerId))) return;
    sessionStorage.setItem(seenKey(customerId), "1");
  } catch {
    /* private mode — still record */
  }
  await supabase.from("profile_views").insert({ customer_id: customerId });
}

export async function recordLinkClick(customerId: string, linkId: string) {
  await supabase.from("link_clicks").insert({ customer_id: customerId, link_id: linkId });
}
