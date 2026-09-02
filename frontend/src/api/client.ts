import { tokenStorage, type Tokens } from "../auth/tokenStorage";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
export type User = { id: number; email: string; emailVerifiedAt: string | null };
type ErrorBody = { error?: string; message?: string };
export class ApiError extends Error { constructor(public code: string, message: string, public status: number) { super(message); } }

const friendly: Record<string, string> = {
  INVALID_CREDENTIALS: "That email or password is not correct.", EMAIL_ALREADY_EXISTS: "An account with that email already exists.",
  INVALID_OTP: "That code is invalid or has expired.", OTP_ATTEMPTS_EXCEEDED: "Too many attempts. Please request a new code.",
  INVALID_REFRESH_TOKEN: "Your session has expired. Please sign in again.", REFRESH_TOKEN_REUSE: "Your session was secured and signed out. Please sign in again.",
  VALIDATION_ERROR: "Please check the information you entered.", UNAUTHORIZED: "Your session has expired. Please sign in again.",
};

let onAuthenticationFailure: (() => void) | null = null;
let refreshInFlight: Promise<Tokens> | null = null;
export const api = {
  setAuthenticationFailureHandler(handler: () => void) { onAuthenticationFailure = handler; },
  async request<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
    const tokens = tokenStorage.get();
    const headers = new Headers(options.headers);
    if (options.body !== undefined) headers.set("Content-Type", "application/json");
    if (tokens?.accessToken) headers.set("Authorization", `Bearer ${tokens.accessToken}`);
    let response: Response;
    try { response = await fetch(`${API_URL}${path}`, { ...options, headers }); }
    catch { throw new ApiError("NETWORK_ERROR", "We couldn’t reach the authentication service. Please try again.", 0); }
    // /auth/me is currently the API's protected resource. Auth form errors must
    // surface directly rather than triggering an unrelated session refresh.
    if (response.status === 401 && retry && path === "/auth/me" && tokens?.refreshToken) {
      try { await this.refresh(); return this.request<T>(path, options, false); }
      catch { onAuthenticationFailure?.(); throw new ApiError("UNAUTHORIZED", friendly.UNAUTHORIZED, 401); }
    }
    if (!response.ok) {
      const body = await response.json().catch(() => ({})) as ErrorBody;
      throw new ApiError(body.error || "REQUEST_ERROR", friendly[body.error || ""] || body.message || "Something went wrong. Please try again.", response.status);
    }
    return response.json() as Promise<T>;
  },
  async refresh(): Promise<Tokens> {
    if (refreshInFlight) return refreshInFlight;
    const current = tokenStorage.get();
    if (!current?.refreshToken) throw new ApiError("INVALID_REFRESH_TOKEN", friendly.INVALID_REFRESH_TOKEN, 401);
    refreshInFlight = this.request<Tokens>("/auth/refresh", { method: "POST", body: JSON.stringify({ refreshToken: current.refreshToken }) }, false)
      .then((tokens) => { tokenStorage.set(tokens); return tokens; })
      .finally(() => { refreshInFlight = null; });
    return refreshInFlight;
  },
  signup: (email: string, password: string) => api.request<{ message: string; user: Pick<User, "email"> }>("/auth/signup", { method: "POST", body: JSON.stringify({ email, password }) }),
  login: (email: string, password: string) => api.request<{ message: string; accessToken: string; refreshToken: string; user: Pick<User, "id" | "email"> }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  requestOtp: (email: string) => api.request<{ message: string }>("/auth/otp/request", { method: "POST", body: JSON.stringify({ email }) }),
  verifyOtp: (email: string, otp: string) => api.request<{ message: string; user: Pick<User, "id" | "email"> }>("/auth/otp/verify", { method: "POST", body: JSON.stringify({ email, otp }) }),
  getMe: () => api.request<{ user: User }>("/auth/me"),
  logout: (refreshToken: string) => api.request<{ message: string }>("/auth/logout", { method: "POST", body: JSON.stringify({ refreshToken }) }),
  deleteAccount: () => api.request<{ message: string }>("/auth/account", { method: "DELETE" }),
  health: () => api.request<{ status: string; hasDb: boolean }>("/health"),
};
