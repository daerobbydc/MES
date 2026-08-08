"use client";

import { Bell, Search, User, LogOut, ChevronDown, Sparkles, ChevronRight, Home, Check } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export default function Header() {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [search, setSearch] = useState("");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [currentUser, setCurrentUser] = useState<{ name: string; role: string; initials: string } | null>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  const fetchNotifs = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setNotifications(json.data);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifs]);

  // Fetch current user session for avatar
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data) {
          const { name, role } = json.data;
          const words = (name || "User").split(" ");
          const initials = words.length >= 2
            ? `${words[0][0]}${words[1][0]}`.toUpperCase()
            : (name || "U").slice(0, 2).toUpperCase();
          const roleLabels: Record<string, string> = {
            ADMIN: "Plant Manager",
            SUPERVISOR: "Plant Supervisor",
            PLANNER: "Production Planner",
            QUALITY_INSPECTOR: "Quality Inspector",
            OPERATOR: "Machine Operator",
          };
          setCurrentUser({ name: name || "User", role: roleLabels[role] || role, initials });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const handleMarkRead = async (id: string) => {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "read", id }),
    });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const pathSegments = pathname.split("/").filter(Boolean);
  const formatSegment = (seg: string) =>
    seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const unreadNotifications = notifications.filter(n => !n.isRead);

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-surface-200/60 px-6 py-3 transition-all">
      <div className="flex items-center justify-between gap-4">
        {/* Breadcrumb */}
        <div className="hidden md:flex items-center gap-2 text-xs text-surface-500">
          <Link href="/" className="flex items-center gap-1 hover:text-primary-600 font-medium transition-colors">
            <Home size={14} />
            <span>Dashboard</span>
          </Link>
          {pathSegments.map((seg, idx) => {
            const href = "/" + pathSegments.slice(0, idx + 1).join("/");
            const isLast = idx === pathSegments.length - 1;
            return (
              <div key={href} className="flex items-center gap-2">
                <ChevronRight size={12} className="text-surface-300" />
                {isLast ? (
                  <span className="font-semibold text-surface-900">{formatSegment(seg)}</span>
                ) : (
                  <Link href={href} className="hover:text-primary-600 transition-colors">
                    {formatSegment(seg)}
                  </Link>
                )}
              </div>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search 
            size={16} 
            className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200 ${
              searchFocused ? "text-primary-500" : "text-surface-400"
            }`} 
          />
          <input
            type="text"
            placeholder="Search orders, machines, products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className={`w-full pl-10 pr-4 py-2 bg-surface-50/80 border rounded-xl text-xs text-surface-900 
              placeholder:text-surface-400 focus:outline-none transition-all duration-200 ${
              searchFocused 
                ? "bg-white border-primary-400 ring-2 ring-primary-500/15 shadow-sm" 
                : "border-surface-200/70 hover:border-surface-300"
            }`}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* Live Status */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50/80 border border-emerald-200/60 text-xs font-semibold text-emerald-700">
            <span className="pulse-dot pulse-dot-green"></span>
            <span>Factory Online</span>
          </div>

          {/* Notifications */}
          <div ref={notifRef} className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2.5 rounded-xl text-surface-500 hover:text-surface-800 hover:bg-surface-100/80 transition-all duration-200 active:scale-95"
            >
              <Bell size={18} />
              {unreadNotifications.length > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white animate-pulse"></span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white/95 backdrop-blur-2xl rounded-2xl shadow-xl border border-surface-200/80 overflow-hidden animate-in fade-in-down duration-200 z-50">
                <div className="px-5 py-4 border-b border-surface-100 flex items-center justify-between">
                  <h3 className="font-semibold text-surface-900 text-sm">Notifications</h3>
                  {unreadNotifications.length > 0 && (
                    <span className="text-[10px] bg-rose-50 text-rose-600 px-2.5 py-0.5 rounded-full font-bold">
                      {unreadNotifications.length} unread
                    </span>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-surface-50">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-surface-400">
                      No notifications
                    </div>
                  ) : (
                    notifications.slice(0, 5).map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => handleMarkRead(notif.id)}
                        className={`px-4 py-3 hover:bg-surface-50 transition-colors cursor-pointer ${
                          !notif.isRead ? "bg-primary-50/30" : ""
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                            notif.type === "QUALITY" ? "bg-rose-500" :
                            notif.type === "MAINTENANCE" ? "bg-amber-500" : "bg-emerald-500"
                          }`}></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-surface-800 font-medium leading-snug">{notif.title}</p>
                            <p className="text-[10px] text-surface-400 mt-0.5 truncate">{notif.message}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="px-4 py-2.5 bg-surface-50/60 border-t border-surface-100 text-center">
                  <button
                    onClick={() => {
                      setShowNotifications(false);
                      router.push("/notifications");
                    }}
                    className="text-xs text-primary-600 hover:text-primary-700 font-semibold w-full"
                  >
                    View all notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="w-px h-6 bg-surface-200/80"></div>

          {/* Profile */}
          <div ref={profileRef} className="relative">
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-surface-100/80 transition-all duration-200"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-md shadow-primary-500/20 text-white font-bold text-xs">
                {currentUser?.initials || "ME"}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-bold text-surface-900 leading-tight">{currentUser?.name || "Loading..."}</p>
                <p className="text-[10px] text-surface-400">{currentUser?.role || ""}</p>
              </div>
              <ChevronDown size={14} className={`text-surface-400 transition-transform duration-200 ${showProfile ? "rotate-180" : ""}`} />
            </button>

            {showProfile && (
              <div className="absolute right-0 mt-2 w-56 bg-white/95 backdrop-blur-2xl rounded-2xl shadow-xl border border-surface-200/80 overflow-hidden animate-in fade-in-down duration-200 z-50 p-1.5">
                {/* User info card */}
                <div className="px-3 py-2.5 mb-1">
                  <p className="text-xs font-bold text-surface-900 truncate">{currentUser?.name || "Loading..."}</p>
                  <p className="text-[10px] text-surface-400 truncate">{currentUser?.role || ""}</p>
                </div>
                <div className="my-1 border-t border-surface-100" />
                <button
                  onClick={() => { setShowProfile(false); router.push("/profile"); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-surface-600 hover:bg-surface-50 hover:text-surface-900 transition-colors text-xs font-medium"
                >
                  <User size={14} />
                  My Account
                </button>
                <button
                  onClick={() => { setShowProfile(false); router.push("/notifications"); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-surface-600 hover:bg-surface-50 hover:text-surface-900 transition-colors text-xs font-medium"
                >
                  <Bell size={14} />
                  Notifications
                </button>
                <div className="my-1 border-t border-surface-100" />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-500 hover:bg-rose-50 transition-colors text-xs font-semibold"
                >
                  <LogOut size={14} />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
