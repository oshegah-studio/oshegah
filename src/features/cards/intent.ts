const KEY = 'oshegah-card-return';
const SERIAL_PATH = /^\/OSH-[A-Z0-9]{8}$/;

/** Only internal, allowlisted destinations may survive sign-in (prevents open redirects). */
export function isSafeReturn(path?: string | null): path is string {
  return path === '/get-your-card' || (typeof path === 'string' && SERIAL_PATH.test(path));
}

export function rememberReturn(path: string) {
  if (isSafeReturn(path)) sessionStorage.setItem(KEY, path);
}

export function clearReturn() {
  sessionStorage.removeItem(KEY);
}

export function cardReturnPath(from?: string): string | null {
  if (isSafeReturn(from)) return from;
  const stored = sessionStorage.getItem(KEY);
  return isSafeReturn(stored) ? stored : null;
}

export function serialReturnPath(): string | null {
  const stored = sessionStorage.getItem(KEY);
  return stored && SERIAL_PATH.test(stored) ? stored : null;
}
