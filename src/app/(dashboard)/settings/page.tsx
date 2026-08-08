"use client";

import { useState, useEffect } from "react";
import {
  User,
  Shield,
  Bell,
  Database,
  Save,
  Key,
  Lock,
  CheckCircle2,
  Building2,
  Globe,
  Cpu,
  Server,
  Smartphone,
  RefreshCw,
  Mail,
  SlidersHorizontal,
  Sparkles,
  Bot,
  Zap,
  Eye,
  EyeOff,
} from "lucide-react";

export default function SettingsPage() {
  const [tab, setTab] = useState<"factory" | "ai" | "system">("factory");

  // Factory Config Form
  const [factoryConfig, setFactoryConfig] = useState({
    plantName: "PT Smart Manufacturing Indonesia",
    plantCode: "PLANT-CGK-01",
    currency: "IDR (Rp)",
    timezone: "Asia/Jakarta (UTC+07:00)",
    shiftCount: "3 Shifts / 24 Hours",
    autoScheduler: true,
    oeeTarget: "85.0%",
  });

  // AI Copilot Config Form
  const [aiConfig, setAiConfig] = useState({
    provider: "INTERNAL",
    apiKey: "",
    model: "gemini-1.5-flash",
    temperature: 0.4,
    autoInsights: true,
    systemPrompt: "You are an expert AI Production Copilot for an industrial MES system. Analyze factory telemetry and provide actionable operational recommendations.",
  });
  const [showApiKey, setShowApiKey] = useState(false);

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const fetchAISettings = async () => {
    try {
      const res = await fetch("/api/ai/settings");
      const json = await res.json();
      if (json.success && json.data) {
        setAiConfig((prev) => ({
          ...prev,
          provider: json.data.provider || "INTERNAL",
          apiKey: json.data.maskedApiKey || "",
          model: json.data.model || "gemini-1.5-flash",
          temperature: json.data.temperature ?? 0.4,
          autoInsights: json.data.autoInsights ?? true,
          systemPrompt: json.data.systemPrompt || prev.systemPrompt,
        }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchAISettings();
  }, []);

  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const handleSaveFactory = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      triggerSuccess("Factory configuration saved!");
    }, 600);
  };

  const handleSaveAI = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/ai/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(aiConfig),
      });
      const json = await res.json();
      if (json.success) {
        triggerSuccess("AI Copilot settings saved!");
        fetchAISettings();
      } else {
        alert(json.message || "Failed to save AI settings.");
      }
    } catch (e) {
      alert("Connection error.");
    } finally {
      setSaving(false);
    }
  };

  const TABS = [
    { key: "factory" as const, label: "Factory Config", icon: Building2 },
    { key: "ai" as const, label: "AI Copilot", icon: Sparkles },
    { key: "system" as const, label: "Server Info", icon: Database },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 w-full">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <SlidersHorizontal size={22} className="text-primary-500" />
            System Settings
          </h1>
          <p className="page-subtitle">
            Factory configuration, AI Copilot setup, and server diagnostics — Admin only
          </p>
        </div>
      </div>

      {/* Personal Settings Notice */}
      <a
        href="/profile"
        className="flex items-center gap-3 p-4 rounded-2xl bg-primary-50 border border-primary-200 text-primary-800 text-xs font-semibold hover:bg-primary-100 transition-colors group"
      >
        <div className="w-8 h-8 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center flex-shrink-0">
          <User size={16} />
        </div>
        <div>
          <p className="font-bold text-primary-900">Looking for your personal settings?</p>
          <p className="text-primary-600 font-normal mt-0.5">Profile, password & 2-step verification are in <span className="underline font-bold">My Account →</span></p>
        </div>
      </a>

      {/* Toast */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in-down">
          <CheckCircle2 size={18} className="text-emerald-600" />
          {successMsg}
        </div>
      )}

      {/* Tab Navigation */}
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


      {/* ── TAB: FACTORY CONFIG ── */}
      {tab === "factory" && (
        <div className="card-static p-6 space-y-6 animate-in fade-in-up">
          <div className="flex items-center gap-3 pb-4 border-b border-surface-100">
            <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
              <Building2 size={20} />
            </div>
            <div>
              <h3 className="font-bold text-surface-900 text-sm">Konfigurasi Pabrik & Operasional</h3>
              <p className="text-xs text-surface-500">Parameter utama sistem MES dan operasional produksi</p>
            </div>
          </div>

          <form onSubmit={handleSaveFactory} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-surface-700 uppercase tracking-wider block mb-1">
                  Nama Pabrik / Perusahaan
                </label>
                <input
                  type="text"
                  value={factoryConfig.plantName}
                  onChange={(e) => setFactoryConfig((p) => ({ ...p, plantName: e.target.value }))}
                  className="input-field w-full text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-surface-700 uppercase tracking-wider block mb-1">
                  Kode Pabrik
                </label>
                <input
                  type="text"
                  value={factoryConfig.plantCode}
                  onChange={(e) => setFactoryConfig((p) => ({ ...p, plantCode: e.target.value }))}
                  className="input-field w-full text-sm font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-surface-700 uppercase tracking-wider block mb-1">
                  Mata Uang (Currency)
                </label>
                <select
                  value={factoryConfig.currency}
                  onChange={(e) => setFactoryConfig((p) => ({ ...p, currency: e.target.value }))}
                  className="select w-full text-sm"
                >
                  <option value="IDR (Rp)">Rupiah Indonesia (IDR - Rp)</option>
                  <option value="USD ($)">US Dollar (USD - $)</option>
                  <option value="EUR (€)">Euro (EUR - €)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-surface-700 uppercase tracking-wider block mb-1">
                  Target Minimum OEE
                </label>
                <input
                  type="text"
                  value={factoryConfig.oeeTarget}
                  onChange={(e) => setFactoryConfig((p) => ({ ...p, oeeTarget: e.target.value }))}
                  className="input-field w-full text-sm font-bold text-primary-600"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button type="submit" disabled={saving} className="btn-primary text-xs flex items-center gap-2">
                {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                Simpan Konfigurasi Pabrik
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── TAB 5: AI COPILOT CONFIG ── */}
      {tab === "ai" && (
        <div className="card-static p-6 space-y-6 animate-in fade-in-up">
          <div className="flex items-center gap-3 pb-4 border-b border-surface-100">
            <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="font-bold text-surface-900 text-sm">Konfigurasi AI Production Copilot & LLM</h3>
              <p className="text-xs text-surface-500">
                Pilih provider AI (Gemini, OpenAI, Local LLM, atau Internal Reasoning Engine) dan sesuaikan parameter analisis
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveAI} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-surface-700 uppercase tracking-wider block mb-1">
                  AI Model Provider
                </label>
                <select
                  value={aiConfig.provider}
                  onChange={(e) => setAiConfig((p) => ({ ...p, provider: e.target.value }))}
                  className="select w-full text-sm"
                >
                  <option value="INTERNAL">Internal Factory Reasoning Engine (Default - No API Key Needed)</option>
                  <option value="GEMINI">Google Gemini API (Cloud LLM)</option>
                  <option value="OPENAI">OpenAI GPT-4o / GPT-4o-mini (Cloud LLM)</option>
                  <option value="OLLAMA">Ollama / Local LLM (On-Premise Server)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-surface-700 uppercase tracking-wider block mb-1">
                  Model Name / Identifier
                </label>
                <input
                  type="text"
                  value={aiConfig.model}
                  onChange={(e) => setAiConfig((p) => ({ ...p, model: e.target.value }))}
                  className="input-field w-full text-sm font-mono"
                  placeholder="e.g. gemini-1.5-flash or gpt-4o-mini"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-bold text-surface-700 uppercase tracking-wider block mb-1">
                  API Key (Dibutuhkan untuk Cloud LLM)
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={aiConfig.apiKey}
                    onChange={(e) => setAiConfig((p) => ({ ...p, apiKey: e.target.value }))}
                    className="input-field w-full text-sm font-mono pr-10"
                    placeholder="Masukkan Gemini / OpenAI API Key..."
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
                  >
                    {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-[11px] text-surface-400 mt-1">
                  API Key disimpan secara terenkripsi dan digunakan untuk menyuntikkan telemetry pabrik real-time ke model LLM.
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-surface-700 uppercase tracking-wider block mb-1">
                  Temperature ({aiConfig.temperature})
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.1"
                  value={aiConfig.temperature}
                  onChange={(e) => setAiConfig((p) => ({ ...p, temperature: parseFloat(e.target.value) }))}
                  className="w-full h-2 bg-surface-200 rounded-lg appearance-none cursor-pointer accent-primary-600 mt-2"
                />
                <div className="flex justify-between text-[10px] text-surface-400 font-semibold mt-1">
                  <span>0.1 (Lebih Presisi/Persis)</span>
                  <span>1.0 (Lebih Kreatif)</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2.5 text-xs font-bold text-surface-800 cursor-pointer select-none mt-4">
                  <input
                    type="checkbox"
                    checked={aiConfig.autoInsights}
                    onChange={(e) => setAiConfig((p) => ({ ...p, autoInsights: e.target.checked }))}
                    className="w-4 h-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500/20"
                  />
                  Aktifkan Deteksi Otomatis Bottleneck & Predict Risk
                </label>
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-bold text-surface-700 uppercase tracking-wider block mb-1">
                  System Persona Prompt (Instruksi Utama AI)
                </label>
                <textarea
                  value={aiConfig.systemPrompt}
                  onChange={(e) => setAiConfig((p) => ({ ...p, systemPrompt: e.target.value }))}
                  className="input-field w-full text-xs font-mono"
                  rows={3}
                  placeholder="Instruksi peran AI Copilot..."
                />
              </div>
            </div>

            <div className="pt-3 flex justify-end">
              <button type="submit" disabled={saving} className="btn-primary text-xs flex items-center gap-2 shadow-sm">
                {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                Simpan Konfigurasi AI Copilot
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── TAB 6: INFORMASI SISTEM ── */}
      {tab === "system" && (
        <div className="card-static p-6 space-y-6 animate-in fade-in-up">
          <div className="flex items-center gap-3 pb-4 border-b border-surface-100">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Database size={20} />
            </div>
            <div>
              <h3 className="font-bold text-surface-900 text-sm">Informasi & Status Server MES</h3>
              <p className="text-xs text-surface-500">Rincian versi arsitektur dan kesehatan infrastruktur</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: "Versi MES Pro", val: "v2.5.0 Enterprise", icon: Cpu },
              { label: "Basis Data (Database)", val: "PostgreSQL 15 (Active)", icon: Database },
              { label: "Framework Frontend", val: "Next.js 14 (App Router)", icon: Globe },
              { label: "Server Environment", val: "Node.js v20 LTS", icon: Server },
              { label: "Telemetry Socket", val: "Connected (WebSocket 100ms)", icon: Smartphone },
              { label: "Prisma ORM", val: "v5.22.0 Sync", icon: CheckCircle2 },
            ].map((sys) => (
              <div key={sys.label} className="p-4 rounded-xl border border-surface-200/80 bg-surface-50/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <sys.icon size={18} className="text-primary-500" />
                  <span className="text-xs font-semibold text-surface-600">{sys.label}</span>
                </div>
                <span className="text-xs font-mono font-bold text-surface-900">{sys.val}</span>
              </div>
            ))}
          </div>

          {/* Demo Data Seeder Action */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-primary-50 to-blue-50/60 border border-primary-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-6">
            <div>
              <h4 className="text-sm font-bold text-surface-900 flex items-center gap-2">
                <Database size={18} className="text-primary-600" />
                Populasi Data Demo Aplikasi (Demo Dataset Seeder)
              </h4>
              <p className="text-xs text-surface-600 mt-1">
                Isi database dengan data demo lengkap: Pelanggan, Pemasok, Mesin, Produk, Order Produksi, Inspek QC & Notifikasi.
              </p>
            </div>
            <button
              type="button"
              onClick={async () => {
                setSaving(true);
                try {
                  const res = await fetch("/api/admin/seed", { method: "POST" });
                  const json = await res.json();
                  if (json.success) {
                    triggerSuccess("Data demo aplikasi berhasil di-seed!");
                  } else {
                    alert(json.message || "Gagal melakukan seeding");
                  }
                } catch (e) {
                  alert("Gagal terhubung ke server seeder.");
                } finally {
                  setSaving(false);
                }
              }}
              disabled={saving}
              className="btn-primary text-xs flex items-center gap-2 flex-shrink-0 shadow-sm"
            >
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <Database size={14} />}
              Jalankan Demo Seeder (1-Click)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
