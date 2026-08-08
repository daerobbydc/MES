"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Clock, AlertTriangle } from "lucide-react";

// Configurable inactivity timeout (e.g., 15 minutes = 900 seconds)
const INACTIVITY_TIMEOUT_SEC = 15 * 60;
const WARNING_THRESHOLD_SEC = 60; // Show warning 60 seconds before auto-logout

export default function InactivityGuard() {
  const [secondsLeft, setSecondsLeft] = useState<number>(INACTIVITY_TIMEOUT_SEC);
  const [showWarning, setShowWarning] = useState<boolean>(false);
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const resetTimer = () => {
    lastActivityRef.current = Date.now();
    setSecondsLeft(INACTIVITY_TIMEOUT_SEC);
    setShowWarning(false);
  };

  useEffect(() => {
    // Listen for user activity
    const activityEvents = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    const handleActivity = () => {
      // Throttle activity updates to once per 5 seconds to prevent spam
      if (Date.now() - lastActivityRef.current > 5000) {
        resetTimer();
      }
    };

    activityEvents.forEach((evt) => window.addEventListener(evt, handleActivity, { passive: true }));

    // Tick interval every second
    timerRef.current = setInterval(() => {
      const elapsedSec = Math.floor((Date.now() - lastActivityRef.current) / 1000);
      const remaining = INACTIVITY_TIMEOUT_SEC - elapsedSec;

      if (remaining <= 0) {
        // Auto logout due to inactivity
        if (timerRef.current) clearInterval(timerRef.current);
        fetch("/api/auth/logout", { method: "POST" })
          .then(() => {
            router.push("/login?reason=inactivity");
          })
          .catch(() => {
            window.location.href = "/login?reason=inactivity";
          });
      } else {
        setSecondsLeft(remaining);
        if (remaining <= WARNING_THRESHOLD_SEC) {
          setShowWarning(true);
        } else {
          setShowWarning(false);
        }
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      activityEvents.forEach((evt) => window.removeEventListener(evt, handleActivity));
    };
  }, [router]);

  if (!showWarning) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in fade-in-up duration-300">
      <div className="bg-amber-500 text-white p-4 rounded-2xl shadow-2xl border border-amber-400 max-w-sm flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
          <Clock size={20} className="animate-spin" />
        </div>
        <div className="flex-1">
          <p className="font-bold text-sm">Peringatan Sesi Inaktif</p>
          <p className="text-xs text-amber-100 mt-0.5">
            Sesi Anda akan berakhir dalam <span className="font-bold text-white underline">{secondsLeft} detik</span> karena tidak ada aktivitas.
          </p>
        </div>
        <button
          onClick={resetTimer}
          className="px-3 py-1.5 rounded-xl bg-white text-amber-800 font-bold text-xs hover:bg-amber-50 transition-colors"
        >
          Lanjutkan
        </button>
      </div>
    </div>
  );
}
