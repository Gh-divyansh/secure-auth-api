import { FormEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import { PasswordInput } from "../components/PasswordInput";
import { Alert } from "../components/Toast";
export function Login() {
  const { login } = useAuth(); const navigate = useNavigate(); const location = useLocation();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  const submit = async (e: FormEvent) => { e.preventDefault(); setError(""); if (!email || !password) return setError("Enter your email and password."); setLoading(true); try { await login(email, password); navigate((location.state as { from?: Location })?.from?.pathname || "/dashboard", { replace: true }); } catch (err) { setError(err instanceof ApiError ? err.message : "Unable to sign in."); } finally { setLoading(false); } };
  return <div className="card p-7 sm:p-9"><p className="text-sm font-semibold text-cyan-300">Welcome back</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Sign in to Shielded</h1><p className="mt-2 text-sm text-slate-400">Use your account to continue securely.</p><form className="mt-8 space-y-5" onSubmit={submit} noValidate>{error && <Alert>{error}</Alert>}<div><label className="label" htmlFor="login-email">Email address</label><input className="field" id="login-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required /></div><div><label className="label" htmlFor="login-password">Password</label><PasswordInput id="login-password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" required /></div><button className="primary" disabled={loading}>{loading ? "Signing in…" : "Sign in securely"}</button></form><p className="mt-7 text-center text-sm text-slate-400">New to Shielded? <Link className="font-semibold text-cyan-300 hover:text-cyan-200" to="/signup">Create an account</Link></p></div>;
}
