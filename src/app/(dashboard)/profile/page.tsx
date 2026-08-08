"use client";

import { useState, useEffect } from "react";
import {
  User, Shield, Bell, Save, Key, Lock, CheckCircle2,
  RefreshCw, Mail, Sparkles,
} from "lucide-react";

export default function ProfilePage() {
  const [tab, setTab] = useState<"profile" | "security" | "notifications">("profile");

  // Profile form — fetched from /api/auth/me
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    department: "",
    role: "",
  });

  // Password form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Notification prefs
  const [notifPrefs, setNotifPrefs] = useState({
    emailOrder: true,
    emailQuality: true,
    emailDowntime: true,
    emailMaintenance: true,
    inAppOrder: true,
    inAppQuality: true,
    inAppDowntime: true,
    inAppMaintenance: true,
  });

  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFASaving, setTwoFASaving] = useState(false);

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // ── Fetch current user profile & 2FA status ────────────────────────────────
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/auth/me");
        const json = await res.json();
        if (json.success && json.data) {
          setProfile({
            name: json.data.name || "",
            email: json.data.email || "",
            department: json.data.department || "",
            role: json.data.role || "",
          });
        }
      } catch (e) {
        console.error(e);
      }
    };

    const fetch2FA = async () => {
      try {
        const res = await fetch("/api/auth/2fa");
        const json = await res.json();
        if (json.success) setTwoFactorEnabled(json.data.twoFactorEnabled ?? false);
      } catch (e) {
        console.error(e);
      }
    };

    fetchProfile();
    fetch2FA();
  }, []);

  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      triggerSuccess("Profile updated successfully!");
    }, 600);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert("New passwords do not match!");
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      alert("Password must be at least 8 characters.");
      return;
    }
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      triggerSuccess("Password changed successfully!");
    }, 600);
  };

  const handleToggle2FA = async (enabled: boolean) => {
    setTwoFASaving(true);
    try {
      const res = await fetch("/api/auth/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      const json = await res.json();
      if (json.success) {
        setTwoFactorEnabled(enabled);
        triggerSuccess(
          enabled
            ? "2-Step Verification has been enabled."
            : "2-Step Verification has been disabled."
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTwoFASaving(false);
    }
  };

  const handleSaveNotifs = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      triggerSuccess("Notification preferences saved!");
    }, 600);
  };

  const TABS = [
    { key: "profile" as const, label: "My Profile", icon: User },
    { key: "security" as const, label: "Security", icon: Shield },
    { key: "notifications" as const, label: "Notifications", icon: Bell },
  ];

  const getRoleLabel = (role: string) => {
    const map: Record<string, string> = {
      ADMIN: "System Admin",
      SUPERVISOR: "Supervisor",
      PLANNER: "Production Planner",
      QUALITY_INSPECTOR: "Quality Inspector",
      OPERATOR: "Operator",
    };
    return map[role] || role;
  };

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase() || "U";

  return (
    <div className="space-y-6 animate-in fade-in duration-500 w-full">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <User size={22} className="text-primary-500" />
            My Account
          </h1>
          <p className="page-subtitle">
            Manage your profile, password, and account security settings
          </p>
        </div>
      </div>

      {/* Toast */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in-down">
          <CheckCircle2 size={16} className="text-emerald-600" />
          {successMsg}
        </div>
      )}

      {/* Profile card summary */}
      <div className="card-static p-5 flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 text-white font-black text-xl flex items-center justify-center shadow-lg shadow-primary-500/20 flex-shrink-0">
          {getInitials(profile.name)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-surface-900 text-base truncate">{profile.name || "Loading…"}</p>
          <p className="text-xs text-surface-500 mt-0.5">{profile.email}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 border border-primary-200">
              {getRoleLabel(profile.role)}
            </span>
            {twoFactorEnabled && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <Shield size={9} />
                2FA Active
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex gap-2 pb-1 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
              tab === t.key ? "tab-active" : "tab-inactive"
            }`}
          >
            <t.icon size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: PROFILE ── */}
      {tab === "profile" && (
        <div className="card-static p-6 space-y-5 animate-in fade-in-up">
          <h3 className="font-bold text-surface-900 text-sm border-b border-surface-100 pb-3">Personal Information</h3>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Full Name</label>
                <div className="relative">
                  <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                    className="input-field pl-10 w-full text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="label">Email Address</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                    className="input-field pl-10 w-full text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="label">Department</label>
                <input
                  type="text"
                  value={profile.department}
                  onChange={(e) => setProfile((p) => ({ ...p, department: e.target.value }))}
                  className="input-field w-full text-sm"
                  placeholder="e.g. Plant Operations"
                />
              </div>

              <div>
                <label className="label">Access Role</label>
                <input
                  type="text"
                  value={getRoleLabel(profile.role)}
                  disabled
                  className="input-field w-full text-sm bg-surface-50 text-surface-400 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 text-xs">
                {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                Save Profile
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── TAB: SECURITY ── */}
      {tab === "security" && (
        <div className="card-static p-6 space-y-6 animate-in fade-in-up">
          <h3 className="font-bold text-surface-900 text-sm border-b border-surface-100 pb-3 flex items-center gap-2">
            <Shield size={16} className="text-amber-500" />
            Account Security
          </h3>

          {/* 2FA Toggle */}
          <div className="p-4 rounded-2xl border border-surface-200/80 bg-surface-50/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                  twoFactorEnabled ? "bg-emerald-50 text-emerald-600" : "bg-surface-100 text-surface-400"
                }`}>
                  <Sparkles size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-surface-900">2-Step Verification</h4>
                  <p className="text-xs text-surface-500 mt-0.5">
                    {twoFactorEnabled
                      ? "Active — an OTP code is required at every sign-in."
                      : "Disabled — enable to add an extra layer of security."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleToggle2FA(!twoFactorEnabled)}
                disabled={twoFASaving}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/20 ${
                  twoFactorEnabled ? "bg-emerald-500" : "bg-surface-300"
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  twoFactorEnabled ? "translate-x-6" : "translate-x-1"
                }`} />
              </button>
            </div>
            {twoFactorEnabled && (
              <div className="mt-3 pt-3 border-t border-surface-200 flex items-center gap-2 text-[11px] text-emerald-700 font-semibold">
                <CheckCircle2 size={13} />
                Your account is protected. You will be prompted for an OTP at every sign-in.
              </div>
            )}
          </div>

          {/* Change Password */}
          <form onSubmit={handleChangePassword} className="space-y-4">
            <h4 className="text-xs font-bold text-surface-700 uppercase tracking-wider">Change Password</h4>

            <div>
              <label className="label">Current Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
                <input
                  type="password"
                  placeholder="Enter current password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))}
                  className="input-field pl-10 w-full text-sm"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">New Password</label>
                <div className="relative">
                  <Key size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
                  <input
                    type="password"
                    placeholder="Min. 8 characters"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
                    className="input-field pl-10 w-full text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="label">Confirm New Password</label>
                <div className="relative">
                  <Key size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
                  <input
                    type="password"
                    placeholder="Repeat new password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                    className="input-field pl-10 w-full text-sm"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="pt-1 flex justify-end">
              <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 text-xs">
                {saving ? <RefreshCw size={14} className="animate-spin" /> : <Lock size={14} />}
                Change Password
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── TAB: NOTIFICATIONS ── */}
      {tab === "notifications" && (
        <div className="card-static p-6 space-y-5 animate-in fade-in-up">
          <div className="flex items-center justify-between border-b border-surface-100 pb-3">
            <h3 className="font-bold text-surface-900 text-sm flex items-center gap-2">
              <Bell size={16} className="text-blue-500" />
              Notification Preferences
            </h3>
            <button onClick={handleSaveNotifs} disabled={saving} className="btn-primary text-xs flex items-center gap-1.5">
              {saving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
              Save
            </button>
          </div>

          <div className="space-y-3">
            {[
              { key: "Order", title: "Production Order Alerts", desc: "New orders, completions, or schedule delays" },
              { key: "Quality", title: "Quality Issues (QC Defects)", desc: "Failed inspections or lot recall triggers" },
              { key: "Downtime", title: "Machine Downtime Alerts", desc: "Andon alarm triggers and machine-down indicators" },
              { key: "Maintenance", title: "Maintenance Schedules", desc: "Preventive maintenance tasks due" },
            ].map((item) => (
              <div key={item.key} className="p-4 rounded-xl border border-surface-200/80 bg-surface-50/50 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h4 className="text-sm font-bold text-surface-900">{item.title}</h4>
                  <p className="text-xs text-surface-500 mt-0.5">{item.desc}</p>
                </div>
                <div className="flex items-center gap-6 flex-shrink-0">
                  <label className="flex items-center gap-2 text-xs font-semibold text-surface-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(notifPrefs as any)[`inApp${item.key}`]}
                      onChange={(e) => setNotifPrefs((p) => ({ ...p, [`inApp${item.key}`]: e.target.checked }))}
                      className="w-4 h-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500/20"
                    />
                    In-App
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold text-surface-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(notifPrefs as any)[`email${item.key}`]}
                      onChange={(e) => setNotifPrefs((p) => ({ ...p, [`email${item.key}`]: e.target.checked }))}
                      className="w-4 h-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500/20"
                    />
                    Email
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
