"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Factory, ArrowRight, Eye, EyeOff, ShieldCheck, KeyRound,
  CheckCircle2, RotateCcw, Sparkles, AlertCircle, Mail,
  Shield, Zap, Server, Lock, Check
} from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [sessionNotice, setSessionNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // 2FA state
  const [step, setStep] = useState<"LOGIN" | "VERIFY_2FA">("LOGIN");
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [demoOtpCode, setDemoOtpCode] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(300);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const reason = params.get("reason");
      if (reason === "expired") {
        setSessionNotice("Your session has expired. Please sign in again.");
      } else if (reason === "inactivity") {
        setSessionNotice("You were automatically signed out due to 15 minutes of inactivity.");
      }
    }
  }, []);

  // 2FA Countdown timer
  useEffect(() => {
    if (step !== "VERIFY_2FA") return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [step]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || "Invalid credentials");
        return;
      }

      // 2FA triggered — user has it enabled in their account settings
      if (json.requires2FA) {
        setStep("VERIFY_2FA");
        setDemoOtpCode(json.data.demoOtpCode || null);
        setCountdown(300);
        setOtpDigits(["", "", "", "", "", ""]);
        setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
        return;
      }

      redirectAfterAuth(json.data?.user?.role);
    } catch (err) {
      setError("Connection error. Please check your network.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (e?: React.FormEvent, codeToUse?: string) => {
    if (e) e.preventDefault();
    setError("");
    const code = codeToUse || otpDigits.join("");
    if (code.length !== 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || "Verification failed. Code may be invalid or expired.");
        return;
      }
      redirectAfterAuth(json.data?.user?.role);
    } catch (err) {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const redirectAfterAuth = (role?: string) => {
    const params = new URLSearchParams(window.location.search);
    const callbackUrl = params.get("callbackUrl");
    if (callbackUrl && callbackUrl.startsWith("/")) {
      router.push(callbackUrl);
    } else if (role === "ADMIN" || role === "SUPERVISOR" || role === "PLANNER") {
      router.push("/");
    } else if (role === "QUALITY_INSPECTOR") {
      router.push("/quality");
    } else {
      router.push("/shop-floor");
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...otpDigits];
    newDigits[index] = value.slice(-1);
    setOtpDigits(newDigits);
    if (value && index < 5) otpInputRefs.current[index + 1]?.focus();
    if (newDigits.every((d) => d !== "") && newDigits.join("").length === 6) {
      handleVerify2FA(undefined, newDigits.join(""));
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const fillDemoCode = () => {
    if (!demoOtpCode) return;
    setOtpDigits(demoOtpCode.split(""));
    handleVerify2FA(undefined, demoOtpCode);
  };

  return (
    <div className="min-h-screen flex bg-surface-950 font-sans">

      {/* ── Left: Branding Panel ─────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-surface-900 border-r border-white/10">
        {/* Ambient glows */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/4 w-80 h-80 bg-primary-500/20 rounded-full blur-[100px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/12 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: "3s" }} />
        </div>
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.025]" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }} />

        <div className="relative z-10 flex flex-col justify-between p-14 text-white w-full">
          {/* Wordmark */}
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-xl shadow-primary-500/30 border border-white/15">
              <Factory size={24} />
            </div>
            <div>
              <p className="text-xl font-extrabold tracking-tight">MES System</p>
              <p className="text-[10px] font-mono text-primary-400 tracking-widest uppercase">Enterprise Edition 2.0</p>
            </div>
          </div>

          {/* Hero copy */}
          <div className="my-auto py-12">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.07] border border-white/12 text-[11px] font-semibold text-primary-300 mb-5">
              <ShieldCheck size={13} /> ISO 27001 · Zero-Trust Security
            </span>
            <h2 className="text-4xl xl:text-5xl font-black leading-[1.12] tracking-tight mb-5">
              Smart Factory
              <br />
              <span className="bg-gradient-to-r from-primary-300 via-primary-400 to-blue-400 bg-clip-text text-transparent">
                Execution Platform
              </span>
            </h2>
            <p className="text-white/55 text-sm leading-relaxed max-w-sm mb-10">
              Unified real-time production monitoring, OEE analytics, quality control, and zero-trust multi-factor authentication.
            </p>

            <div className="grid grid-cols-2 gap-3 max-w-sm">
              {[
                { icon: Shield, label: "Encrypted Sessions", sub: "256-Bit TLS 1.3" },
                { icon: Zap, label: "Live Telemetry", sub: "Sub-second IoT Sync" },
                { icon: Server, label: "High Availability", sub: "99.99% Uptime SLA" },
                { icon: KeyRound, label: "2-Step Verification", sub: "Account-Level 2FA" },
              ].map((f, i) => (
                <div key={i} className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.07]">
                  <f.icon size={18} className="text-primary-400 mb-2" />
                  <p className="text-xs font-bold">{f.label}</p>
                  <p className="text-[10px] text-white/40 mt-0.5">{f.sub}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-white/30 font-mono border-t border-white/10 pt-5">
            MES Enterprise v2.0 · Protected by TLS 1.3
          </p>
        </div>
      </div>

      {/* ── Right: Auth Form ──────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-surface-50 via-surface-100 to-surface-200">
        <div className="w-full max-w-md animate-in fade-in-up duration-500">

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-3 mb-6">
            {(["Credentials", "Verification"] as const).map((label, i) => {
              const isActive = (i === 0 && step === "LOGIN") || (i === 1 && step === "VERIFY_2FA");
              const isDone = i === 0 && step === "VERIFY_2FA";
              return (
                <div key={label} className="flex items-center gap-2">
                  {i > 0 && <div className="w-8 h-px bg-surface-300" />}
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    isDone ? "bg-emerald-100 text-emerald-700" :
                    isActive ? "bg-primary-100 text-primary-700" :
                    "bg-surface-200 text-surface-400"
                  }`}>
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black ${
                      isDone ? "bg-emerald-500 text-white" :
                      isActive ? "bg-primary-500 text-white" :
                      "bg-surface-300 text-surface-500"
                    }`}>
                      {isDone ? <Check size={10} /> : i + 1}
                    </span>
                    {label}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Card */}
          <div className="bg-white/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-surface-200/80 p-8 lg:p-10">

            {/* ── STEP 1: EMAIL + PASSWORD ── */}
            {step === "LOGIN" && (
              <div>
                <h1 className="text-2xl font-black text-surface-900 tracking-tight mb-1">Sign In</h1>
                <p className="text-surface-500 text-xs mb-6">Enter your enterprise credentials to access MES</p>

                <form onSubmit={handleLogin} className="space-y-4">
                  {sessionNotice && (
                    <div className="flex items-start gap-2.5 bg-amber-50 text-amber-800 text-xs font-semibold p-3.5 rounded-2xl border border-amber-200">
                      ⚠️ {sessionNotice}
                    </div>
                  )}

                  {error && (
                    <div className="flex items-center gap-2.5 bg-rose-50 text-rose-700 text-xs font-semibold p-3.5 rounded-2xl border border-rose-200/80">
                      <AlertCircle size={15} className="flex-shrink-0" />
                      {error}
                    </div>
                  )}

                  <div>
                    <label className="label">Work Email</label>
                    <div className="relative">
                      <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
                      <input
                        id="login-email"
                        type="email"
                        className="input-field pl-10 text-sm"
                        placeholder="name@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label">Password</label>
                    <div className="relative">
                      <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
                      <input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        className="input-field pl-10 pr-11 text-sm"
                        placeholder="••••••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 transition-colors p-1"
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  <button
                    id="login-submit"
                    type="submit"
                    className="btn-primary w-full py-3.5 text-sm font-bold flex items-center justify-center gap-2 group shadow-lg shadow-primary-500/20 mt-2"
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        Sign In to Dashboard
                        <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* ── STEP 2: 2-STEP VERIFICATION ── */}
            {step === "VERIFY_2FA" && (
              <div className="animate-in fade-in-right duration-300">
                <div className="text-center mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 text-white flex items-center justify-center mx-auto mb-3 shadow-lg shadow-primary-500/25">
                    <KeyRound size={26} />
                  </div>
                  <h1 className="text-xl font-black text-surface-900 tracking-tight">2-Step Verification</h1>
                  <p className="text-surface-500 text-xs mt-1 max-w-xs mx-auto">
                    Enter the 6-digit security code for{" "}
                    <span className="font-semibold text-surface-800">{email}</span>
                  </p>
                </div>

                {/* Dev preview notice OR production dispatch notice */}
                {demoOtpCode ? (
                  <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles size={15} className="text-emerald-600 flex-shrink-0" />
                      <span>
                        <span className="font-bold text-[10px] uppercase bg-emerald-200/60 px-1.5 py-0.5 rounded mr-1.5">Dev Preview</span>
                        OTP: <strong className="font-mono text-sm">{demoOtpCode}</strong>
                      </span>
                    </div>
                    <button
                      onClick={fillDemoCode}
                      className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[11px] font-bold hover:bg-emerald-700 transition-colors flex-shrink-0 ml-2"
                    >
                      Auto Fill
                    </button>
                  </div>
                ) : (
                  <div className="mb-5 p-3.5 bg-blue-50 border border-blue-200 rounded-2xl text-blue-800 text-xs flex items-center gap-2.5">
                    <ShieldCheck size={16} className="text-blue-600 flex-shrink-0" />
                    <span>A 6-digit code has been dispatched to your registered email address.</span>
                  </div>
                )}

                {error && (
                  <div className="mb-4 flex items-center gap-2.5 bg-rose-50 text-rose-700 text-xs font-semibold p-3.5 rounded-2xl border border-rose-200/80">
                    <AlertCircle size={15} className="flex-shrink-0" />
                    {error}
                  </div>
                )}

                <form onSubmit={handleVerify2FA} className="space-y-5">
                  {/* 6 OTP digit boxes */}
                  <div className="flex justify-center gap-2">
                    {otpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => { otpInputRefs.current[idx] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        className="w-11 h-12 text-center text-xl font-black rounded-xl border-2 border-surface-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 bg-white text-surface-900 transition-all shadow-sm font-mono"
                      />
                    ))}
                  </div>

                  <p className="text-center text-xs text-surface-400">
                    Expires in:{" "}
                    <span className="font-mono font-bold text-surface-700">
                      {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, "0")}
                    </span>
                  </p>

                  <button
                    type="submit"
                    className="btn-primary w-full py-3.5 text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20"
                    disabled={loading || otpDigits.some((d) => !d)}
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        Verify & Complete Sign In
                        <CheckCircle2 size={16} />
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-between text-xs pt-3 border-t border-surface-100">
                    <button type="button" onClick={() => setStep("LOGIN")} className="text-surface-500 hover:text-surface-800 font-semibold">
                      ← Back to Login
                    </button>
                    <button
                      type="button"
                      onClick={fillDemoCode}
                      className="text-primary-600 hover:text-primary-700 font-bold flex items-center gap-1.5"
                    >
                      <RotateCcw size={12} /> Resend Code
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          <p className="text-center text-[11px] text-surface-400 mt-5">
            Manufacturing Execution System v2.0 · Protected by TLS 1.3
          </p>
        </div>
      </div>
    </div>
  );
}
