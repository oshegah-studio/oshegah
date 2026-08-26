const KEY = "oshegah:visitor_id";

const uuid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
      });

/** Persistent, anonymous, non-identifying visitor id (localStorage + cookie fallback). */
export function getVisitorId(): string {
  let id: string | null = null;
  try {
    id = localStorage.getItem(KEY);
  } catch {
    /* storage blocked */
  }
  if (!id) {
    const match = document.cookie.match(/(?:^|;\s*)oshegah_visitor_id=([^;]+)/);
    id = match?.[1] ?? null;
  }
  if (!id) id = uuid();

  try {
    localStorage.setItem(KEY, id);
  } catch {
    /* ignore */
  }
  try {
    document.cookie = `oshegah_visitor_id=${id}; path=/; max-age=63072000; SameSite=Lax`;
  } catch {
    /* ignore */
  }
  return id;
}
