import { FormEvent, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { OtpInput } from "../components/OtpInput";
import { Alert } from "../components/Toast";

export function VerifyOtp() {
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const email = params.get("email") || "";
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState(location.state && (location.state as { created?: boolean }).created ? "Account created. Request a verification code to continue." : "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => { if (!email) navigate("/signup", { replace: true }); }, [email, navigate]);

  const request = async () => {
    setError(""); setMessage(""); setRequesting(true);
    try {
      await api.requestOtp(email);
      setMessage("We've sent a 6-digit verification code to your email. Check your inbox and spam folder.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't request a code.");
    } finally { setRequesting(false); }
  };

  const verify = async (e: FormEvent) => {
    e.preventDefault(); setError("");
    if (otp.length !== 6) return setError("Enter the full 6-digit code.");
    setLoading(true);
    try { await api.verifyOtp(email, otp); navigate("/login", { replace: true, state: { verified: true } }); }
    catch (err) { setError(err instanceof ApiError ? err.message : "Couldn't verify that code."); }
    finally { setLoading(false); }
  };

  return <div className="card p-7 sm:p-9"><p className="text-sm font-semibold text-cyan-300">One more step</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Verify your email</h1><p className="mt-2 text-sm leading-6 text-slate-400">We'll verify <span className="font-medium text-slate-300">{email}</span> with a six-digit code.</p><div className="mt-6 space-y-3">{message && <Alert type="info">{message}</Alert>}{error && <Alert>{error}</Alert>}</div><button type="button" onClick={request} disabled={requesting} className="mt-6 w-full rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-400/20 disabled:opacity-50">{requesting ? "Requesting code…" : "Request verification code"}</button><form onSubmit={verify} className="mt-7"><label className="label mb-3 block">Verification code</label><OtpInput value={otp} onChange={setOtp} /><button className="primary mt-6" disabled={loading || otp.length !== 6}>{loading ? "Verifying…" : "Verify email"}</button></form><p className="mt-7 text-center text-sm text-slate-400"><Link className="font-semibold text-cyan-300 hover:text-cyan-200" to="/login">Back to sign in</Link></p></div>;
}
