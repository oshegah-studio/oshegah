export function cardReturnPath(from?: string): string | null {
  if (from === '/get-your-card') return from;
  return sessionStorage.getItem('oshegah-card-return') === '/get-your-card' ? '/get-your-card' : null;
}