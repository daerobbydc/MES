"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Bell,
  Check,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  ShoppingCart,
  Wrench,
  Truck,
  Package,
  RefreshCw,
  Clock,
  ExternalLink,
  PlusCircle,
} from "lucide-react";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  module?: string;
  recordId?: string;
  isRead: boolean;
  createdAt: string;
}

const TYPE_ICONS: Record<string, { icon: any; color: string; bg: string }> = {
  QUALITY: { icon: ShieldCheck, color: "text-rose-600", bg: "bg-rose-50" },
  MAINTENANCE: { icon: Wrench, color: "text-amber-600", bg: "bg-amber-50" },
  ORDER: { icon: ShoppingCart, color: "text-blue-600", bg: "bg-blue-50" },
  DELIVERY: { icon: Truck, color: "text-violet-600", bg: "bg-violet-50" },
  LOW_STOCK: { icon: Package, color: "text-orange-600", bg: "bg-orange-50" },
  SYSTEM: { icon: Bell, color: "text-primary-600", bg: "bg-primary-50" },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("ALL");
  const [filterUnreadOnly, setFilterUnreadOnly] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications");
      const json = await res.json();
      if (json.success) {
        setNotifications(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = async (id: string) => {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "read", id }),
    });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const handleMarkAllRead = async () => {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "readAll" }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const filtered = notifications.filter((n) => {
    const matchType = filterType === "ALL" || n.type === filterType;
    const matchUnread = !filterUnreadOnly || !n.isRead;
    return matchType && matchUnread;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const qualityCount = notifications.filter((n) => n.type === "QUALITY" || n.type === "LOW_STOCK").length;
  const orderCount = notifications.filter((n) => n.type === "ORDER" || n.type === "DELIVERY").length;

  const typeTabs = [
    { key: "ALL", label: "All Notifications", count: notifications.length },
    { key: "QUALITY", label: "Quality", count: notifications.filter((n) => n.type === "QUALITY").length },
    { key: "LOW_STOCK", label: "Low Stock", count: notifications.filter((n) => n.type === "LOW_STOCK").length },
    { key: "MAINTENANCE", label: "Maintenance", count: notifications.filter((n) => n.type === "MAINTENANCE").length },
    { key: "ORDER", label: "Orders", count: notifications.filter((n) => n.type === "ORDER").length },
    { key: "DELIVERY", label: "Delivery", count: notifications.filter((n) => n.type === "DELIVERY").length },
    { key: "SYSTEM", label: "System", count: notifications.filter((n) => n.type === "SYSTEM").length },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 w-full">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="page-title flex items-center gap-2">
              <Bell size={22} className="text-primary-500" />
              Notifications Center
            </h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-600 border border-rose-200 animate-pulse">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="page-subtitle">
            Real-time alerts, operational events, and system notifications
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="btn-secondary text-xs flex items-center gap-1.5"
            >
              <CheckCircle2 size={14} className="text-emerald-600" /> Mark All as Read
            </button>
          )}
          <button
            onClick={fetchNotifications}
            className="btn-secondary text-xs flex items-center gap-1.5"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card flex items-center justify-between animate-in fade-in-up">
          <div>
            <p className="text-xs font-bold text-surface-400 uppercase tracking-wider">
              Total Notifications
            </p>
            <p className="text-2xl font-bold text-surface-900 mt-1">
              {notifications.length}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
            <Bell size={20} className="text-primary-600" />
          </div>
        </div>

        <div
          className="stat-card flex items-center justify-between animate-in fade-in-up"
          style={{ animationDelay: "0.05s" }}
        >
          <div>
            <p className="text-xs font-bold text-surface-400 uppercase tracking-wider">
              Unread Alerts
            </p>
            <p className="text-2xl font-bold text-amber-600 mt-1">
              {unreadCount}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={20} className="text-amber-600" />
          </div>
        </div>

        <div
          className="stat-card flex items-center justify-between animate-in fade-in-up"
          style={{ animationDelay: "0.1s" }}
        >
          <div>
            <p className="text-xs font-bold text-surface-400 uppercase tracking-wider">
              Quality & Stock Alerts
            </p>
            <p className="text-2xl font-bold text-rose-600 mt-1">
              {qualityCount}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center flex-shrink-0">
            <ShieldCheck size={20} className="text-rose-600" />
          </div>
        </div>

        <div
          className="stat-card flex items-center justify-between animate-in fade-in-up"
          style={{ animationDelay: "0.15s" }}
        >
          <div>
            <p className="text-xs font-bold text-surface-400 uppercase tracking-wider">
              Order & Delivery
            </p>
            <p className="text-2xl font-bold text-blue-600 mt-1">
              {orderCount}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <ShoppingCart size={20} className="text-blue-600" />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="card-static p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {typeTabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setFilterType(t.key)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 flex-shrink-0 ${
                filterType === t.key ? "tab-active" : "tab-inactive"
              }`}
            >
              {t.label}
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  filterType === t.key
                    ? "bg-primary-600 text-white"
                    : "bg-surface-200 text-surface-600"
                }`}
              >
                {t.count}
              </span>
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-xs font-bold text-surface-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={filterUnreadOnly}
            onChange={(e) => setFilterUnreadOnly(e.target.checked)}
            className="rounded border-surface-300 text-primary-600 focus:ring-primary-500/20 w-4 h-4"
          />
          Show Unread Only
        </label>
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-500 rounded-full animate-spin"></div>
            <p className="text-xs text-surface-500 font-medium">
              Loading notifications...
            </p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card-static p-16 text-center animate-in fade-in">
          <Bell size={44} className="mx-auto mb-3 text-surface-300" />
          <p className="font-semibold text-surface-700">No Notifications Found</p>
          <p className="text-xs text-surface-400 mt-1">
            No notifications match your current filter settings
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item, idx) => {
            const conf = TYPE_ICONS[item.type] || TYPE_ICONS.SYSTEM;
            const IconComponent = conf.icon;

            return (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border transition-all duration-200 flex items-start gap-4 animate-in fade-in-up ${
                  item.isRead
                    ? "bg-white border-surface-200/80 hover:border-surface-300 shadow-2xs"
                    : "bg-primary-50/30 border-primary-200 shadow-sm"
                }`}
                style={{ animationDelay: `${idx * 0.02}s` }}
              >
                <div
                  className={`w-11 h-11 rounded-2xl ${conf.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}
                >
                  <IconComponent size={20} className={conf.color} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4
                          className={`text-sm font-bold ${
                            item.isRead ? "text-surface-800" : "text-surface-900"
                          }`}
                        >
                          {item.title}
                        </h4>
                        {!item.isRead && (
                          <span className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0 animate-pulse" />
                        )}
                      </div>
                      <p className="text-xs text-surface-600 mt-1 leading-relaxed">
                        {item.message}
                      </p>
                    </div>
                    <span className="text-[11px] text-surface-400 font-medium flex-shrink-0 flex items-center gap-1">
                      <Clock size={11} /> {fmtDate(item.createdAt)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3 mt-3 pt-2 border-t border-surface-100/60">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-lg uppercase tracking-wider ${conf.bg} ${conf.color}`}
                      >
                        {item.type}
                      </span>
                      {item.module && (
                        <span className="text-[10px] font-semibold text-surface-400 uppercase tracking-wider">
                          • {item.module}
                        </span>
                      )}
                    </div>

                    {!item.isRead && (
                      <button
                        onClick={() => handleMarkAsRead(item.id)}
                        className="text-xs text-primary-600 hover:text-primary-800 font-semibold flex items-center gap-1 transition-colors"
                      >
                        <Check size={13} /> Mark as Read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
