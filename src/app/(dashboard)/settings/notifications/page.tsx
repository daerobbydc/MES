"use client";

import { useEffect, useState } from "react";
import { Bell, Mail, Smartphone, Save, ToggleLeft, ToggleRight } from "lucide-react";

type Prefs = {
  emailOrder: boolean;
  emailDelivery: boolean;
  emailQuality: boolean;
  emailLowStock: boolean;
  emailMaintenance: boolean;
  inAppOrder: boolean;
  inAppDelivery: boolean;
  inAppQuality: boolean;
  inAppLowStock: boolean;
  inAppMaintenance: boolean;
  soundEnabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
};

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

const emailItems: { key: keyof Prefs; label: string }[] = [
  { key: "emailOrder", label: "Order Confirmations" },
  { key: "emailDelivery", label: "Delivery Updates" },
  { key: "emailQuality", label: "Quality Alerts" },
  { key: "emailLowStock", label: "Low Stock Warnings" },
  { key: "emailMaintenance", label: "Maintenance Reminders" },
];

const inAppItems: { key: keyof Prefs; label: string }[] = [
  { key: "inAppOrder", label: "Order Updates" },
  { key: "inAppDelivery", label: "Delivery Updates" },
  { key: "inAppQuality", label: "Quality Alerts" },
  { key: "inAppLowStock", label: "Low Stock Warnings" },
  { key: "inAppMaintenance", label: "Maintenance Reminders" },
];

function Toggle({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button onClick={onToggle} className="flex items-center">
      {enabled ? (
        <ToggleRight size={28} className="text-primary-500" />
      ) : (
        <ToggleLeft size={28} className="text-surface-300" />
      )}
    </button>
  );
}

export default function NotificationPreferencesPage() {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/notifications/preferences").then((r) => r.json()),
      fetch("/api/notifications").then((r) => r.json()),
    ]).then(([prefRes, notifRes]) => {
      if (prefRes.success) setPrefs(prefRes.data);
      if (notifRes.success) setNotifications(notifRes.data);
    }).finally(() => setLoading(false));
  }, []);

  const toggle = (key: keyof Prefs) => {
    if (!prefs) return;
    setPrefs({ ...prefs, [key]: !prefs[key] });
    setSaved(false);
  };

  const handleSave = async () => {
    if (!prefs) return;
    setSaving(true);
    try {
      const res = await fetch("/api/notifications/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading || !prefs) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
          <p className="text-sm text-surface-500 font-medium">Loading preferences...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 tracking-tight">Notification Preferences</h1>
          <p className="text-surface-500 text-sm mt-0.5">Manage how and when you receive notifications</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
          <Save size={16} />
          {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card-static p-6 animate-in fade-in-up">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-50">
                <Mail size={20} className="text-blue-500" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-surface-900">Email Notifications</h2>
                <p className="text-sm text-surface-500">Receive email alerts for these events</p>
              </div>
            </div>
            <div className="divide-y divide-surface-100">
              {emailItems.map((item) => (
                <div key={item.key} className="flex items-center justify-between py-3">
                  <span className="text-sm font-medium text-surface-700">{item.label}</span>
                  <Toggle enabled={!!prefs[item.key]} onToggle={() => toggle(item.key)} />
                </div>
              ))}
            </div>
          </div>

          <div className="card-static p-6 animate-in fade-in-up" style={{ animationDelay: "0.05s" }}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-violet-50">
                <Smartphone size={20} className="text-violet-500" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-surface-900">In-App Notifications</h2>
                <p className="text-sm text-surface-500">Show notifications inside the application</p>
              </div>
            </div>
            <div className="divide-y divide-surface-100">
              {inAppItems.map((item) => (
                <div key={item.key} className="flex items-center justify-between py-3">
                  <span className="text-sm font-medium text-surface-700">{item.label}</span>
                  <Toggle enabled={!!prefs[item.key]} onToggle={() => toggle(item.key)} />
                </div>
              ))}
            </div>
          </div>

          <div className="card-static p-6 animate-in fade-in-up" style={{ animationDelay: "0.1s" }}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-50">
                <Bell size={20} className="text-amber-500" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-surface-900">General</h2>
                <p className="text-sm text-surface-500">Sound and quiet hours settings</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-surface-700">Notification Sound</span>
                <Toggle enabled={prefs.soundEnabled} onToggle={() => toggle("soundEnabled")} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Quiet Hours Start</label>
                  <input
                    type="time"
                    className="input-field"
                    value={prefs.quietHoursStart || ""}
                    onChange={(e) => setPrefs({ ...prefs, quietHoursStart: e.target.value || null })}
                  />
                </div>
                <div>
                  <label className="label">Quiet Hours End</label>
                  <input
                    type="time"
                    className="input-field"
                    value={prefs.quietHoursEnd || ""}
                    onChange={(e) => setPrefs({ ...prefs, quietHoursEnd: e.target.value || null })}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card-static p-6 animate-in fade-in-up" style={{ animationDelay: "0.15s" }}>
            <h3 className="text-lg font-semibold text-surface-900 mb-4">Recent Notifications</h3>
            {notifications.length === 0 ? (
              <p className="text-sm text-surface-400 text-center py-8">No notifications yet</p>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-3 rounded-xl border transition-colors ${
                      n.isRead
                        ? "bg-white border-surface-100"
                        : "bg-primary-50/50 border-primary-100"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-medium ${n.isRead ? "text-surface-600" : "text-surface-900"}`}>
                        {n.title}
                      </p>
                      {!n.isRead && (
                        <span className="w-2 h-2 rounded-full bg-primary-500 mt-1.5 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-surface-400 mt-1 line-clamp-2">{n.message}</p>
                    <p className="text-xs text-surface-300 mt-2">
                      {new Date(n.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
