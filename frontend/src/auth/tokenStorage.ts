export type Tokens = { accessToken: string; refreshToken: string };
const KEY = "shielded.auth.tokens";

export const tokenStorage = {
  get(): Tokens | null {
    try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) as Tokens : null; } catch { return null; }
  },
  set(tokens: Tokens) { localStorage.setItem(KEY, JSON.stringify(tokens)); },
  clear() { localStorage.removeItem(KEY); },
};
