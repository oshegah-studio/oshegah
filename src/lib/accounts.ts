import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { brokeredPreviewStorage } from "@/integrations/supabase/previewAuthStorage";

/**
 * Quick account switching (max 3).
 *
 * Supabase JS keeps exactly one active session per storage key, so parked
 * accounts are held in the *same* storage adapter the Supabase client itself
 * uses for its session — no separate, weaker store, no passwords, and no custom
 * auth. Switching hands the parked session back to `supabase.auth.setSession()`,
 * which validates and refreshes it against the auth server.
 */

const KEY = "oshegah.accounts.v1";
export const MAX_ACCOUNTS = 3;

export interface ParkedAccount {
  userId: string;
  email: string | null;
  name: string | null;
  accountType: string | null;
  avatarUrl: string | null;
  accessToken: string;
  refreshToken: string;
  savedAt: number;
}

type AnyStorage = {
  getItem: (k: string) => string | null | Promise<string | null>;
  setItem: (k: string, v: string) => void | Promise<void>;
  removeItem: (k: string) => void | Promise<void>;
};

const storage = (): AnyStorage =>
  (brokeredPreviewStorage() as AnyStorage | undefined) ?? (localStorage as AnyStorage);

export async function listAccounts(): Promise<ParkedAccount[]> {
  try {
    const raw = await Promise.resolve(storage().getItem(KEY));
    const parsed = raw ? (JSON.parse(raw) as ParkedAccount[]) : [];
    return Array.isArray(parsed) ? parsed.filter((a) => a?.userId && a?.refreshToken) : [];
  } catch {
    return [];
  }
}

async function write(accounts: ParkedAccount[]) {
  try {
    await Promise.resolve(storage().setItem(KEY, JSON.stringify(accounts.slice(0, MAX_ACCOUNTS))));
  } catch {
    /* storage unavailable — switching is simply not offered */
  }
}

export interface RememberMeta {
  name?: string | null;
  accountType?: string | null;
  avatarUrl?: string | null;
}

export type RememberResult = "saved" | "updated" | "limit";

/** Parks the currently signed-in session so it can be switched back to later. */
export async function rememberAccount(session: Session, meta: RememberMeta = {}): Promise<RememberResult> {
  if (!session.refresh_token || !session.user) return "limit";
  const accounts = await listAccounts();
  const existing = accounts.findIndex((a) => a.userId === session.user.id);

  const entry: ParkedAccount = {
    userId: session.user.id,
    email: session.user.email ?? null,
    name: meta.name ?? (session.user.user_metadata?.full_name as string | undefined) ?? null,
    accountType: meta.accountType ?? null,
    avatarUrl: meta.avatarUrl ?? null,
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    savedAt: Date.now(),
  };

  if (existing >= 0) {
    accounts[existing] = entry;
    await write(accounts);
    return "updated";
  }
  if (accounts.length >= MAX_ACCOUNTS) return "limit";
  accounts.push(entry);
  await write(accounts);
  return "saved";
}

export async function forgetAccount(userId: string) {
  const accounts = await listAccounts();
  await write(accounts.filter((a) => a.userId !== userId));
}

/** Restores a parked session through Supabase's own session API. */
export async function switchToAccount(account: ParkedAccount) {
  const { data, error } = await supabase.auth.setSession({
    access_token: account.accessToken,
    refresh_token: account.refreshToken,
  });
  if (error || !data.session) {
    // Refresh token no longer valid — drop it so the user re-authenticates once.
    await forgetAccount(account.userId);
    throw error ?? new Error("session-expired");
  }
  // Rotate the stored tokens to the freshly issued ones.
  await rememberAccount(data.session, {
    name: account.name,
    accountType: account.accountType,
    avatarUrl: account.avatarUrl,
  });
  return data.session;
}
