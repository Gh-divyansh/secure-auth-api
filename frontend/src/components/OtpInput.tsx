import { useEffect, useRef } from "react";
export function OtpInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  useEffect(() => { refs.current[0]?.focus(); }, []);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || "");
  const set = (i: number, raw: string) => { const clean = raw.replace(/\D/g, ""); if (clean.length > 1) { onChange((value.slice(0, i) + clean).slice(0, 6)); refs.current[Math.min(5, i + clean.length)]?.focus(); } else { const next = value.split(""); next[i] = clean; onChange(next.join("").slice(0, 6)); if (clean) refs.current[i + 1]?.focus(); } };
  return <div className="flex justify-between gap-2" onPaste={(e) => { e.preventDefault(); onChange(e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)); refs.current[5]?.focus(); }}>
    {digits.map((digit, i) => <input key={i} ref={(el) => { refs.current[i] = el; }} inputMode="numeric" autoComplete={i === 0 ? "one-time-code" : "off"} aria-label={`OTP digit ${i + 1}`} value={digit} onChange={(e) => set(i, e.target.value)} onKeyDown={(e) => { if (e.key === "Backspace" && !digit) refs.current[i - 1]?.focus(); if (e.key === "ArrowLeft") refs.current[i - 1]?.focus(); if (e.key === "ArrowRight") refs.current[i + 1]?.focus(); }} className="h-14 w-full min-w-0 rounded-xl border border-slate-700 bg-slate-900 text-center text-xl font-semibold text-cyan-200 transition focus:border-cyan-400" />)}
  </div>;
}
