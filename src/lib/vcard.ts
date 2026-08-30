export interface VCardInput {
  fullName: string;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  title?: string | null;
  location?: string | null;
  profileUrl?: string;
}

const esc = (v: string) => v.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");

export function buildVCard(input: VCardInput): string {
  const parts = input.fullName.trim().split(/\s+/);
  const last = parts.length > 1 ? parts[parts.length - 1] : "";
  const first = parts.length > 1 ? parts.slice(0, -1).join(" ") : input.fullName;

  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${esc(last)};${esc(first)};;;`,
    `FN:${esc(input.fullName)}`,
    "ORG:OSHEGAH",
  ];
  if (input.title) lines.push(`TITLE:${esc(input.title)}`);
  if (input.phone) lines.push(`TEL;TYPE=CELL:${input.phone.replace(/[^\d+]/g, "")}`);
  if (input.email) lines.push(`EMAIL;TYPE=INTERNET:${esc(input.email)}`);
  if (input.profileUrl) lines.push(`URL:${esc(input.profileUrl)}`);
  if (input.website && input.website !== input.profileUrl) lines.push(`URL:${esc(input.website)}`);
  if (input.location) lines.push(`ADR;TYPE=WORK:;;${esc(input.location)};;;;`);
  lines.push(`NOTE:${esc(`OSHEGAH digital profile${input.profileUrl ? ` — ${input.profileUrl}` : ""}`)}`);
  lines.push(`REV:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`);
  lines.push("END:VCARD");

  return lines.join("\r\n");
}

export function downloadVCard(input: VCardInput) {
  const blob = new Blob([buildVCard(input)], { type: "text/vcard;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${input.fullName.replace(/\s+/g, "-").toLowerCase() || "contact"}.vcf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export const profileUrlFor = (username: string) => `${window.location.origin}/${username}`;

/** Permanent NFC/QR destination — never changes when the username changes. */
export const cardUrlFor = (customerId: string) => `${window.location.origin}/c/${customerId}`;
