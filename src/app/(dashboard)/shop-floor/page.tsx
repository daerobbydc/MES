"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Factory, Play, Pause, AlertTriangle, CheckCircle, Clock, Activity,
  TrendingUp, TrendingDown, Package, Users, Cog, Zap, RefreshCw, Bell,
  Monitor, Plus, X, Save,
} from "lucide-react";

export default function ShopFloorPage() {
  const [data, setData] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Log Output Modal State
  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [logForm, setLogForm] = useState({
    goodCount: 10,
    scrapCount: 0,
    downtimeMinutes: 0,
    downtimeReason: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [statusRes, alertRes] = await Promise.all([
        fetch("/api/shop-floor/logs"),
        fetch("/api/shop-floor/andon"),
      ]);
      const statusJson = await statusRes.json();
      const alertJson = await alertRes.json();
      if (statusJson.success) setData(statusJson.data);
      if (alertJson.success) setAlerts(alertJson.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData, autoRefresh]);

  const handleOpenLogModal = (order: any) => {
    setSelectedOrder(order);
    setLogForm({ goodCount: 10, scrapCount: 0, downtimeMinutes: 0, downtimeReason: "" });
    setShowLogModal(true);
  };

  const handleSubmitLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/shop-floor/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          logType: "OUTPUT",
          goodCount: Number(logForm.goodCount) || 0,
          scrapCount: Number(logForm.scrapCount) || 0,
          downtimeMinutes: Number(logForm.downtimeMinutes) || 0,
          downtimeReason: logForm.downtimeReason || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowLogModal(false);
        fetchData();
      } else {
        alert(json.error || "Gagal menyimpan log produksi");
      }
    } catch (err) {
      alert("Gagal terhubung ke server");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-primary-200 border-t-primary-500 rounded-full animate-spin"></div>
          <p className="text-sm text-surface-500 font-medium">Loading shop floor...</p>
        </div>
      </div>
    );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 tracking-tight">Shop Floor Control</h1>
          <p className="text-surface-500 text-sm mt-0.5">Real-time production monitoring & station telemetry</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
              autoRefresh
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200/50 shadow-sm shadow-emerald-500/10"
                : "bg-surface-100/60 text-surface-500 border border-surface-200/50"
            }`}
          >
            <RefreshCw size={15} className={autoRefresh ? "animate-spin" : ""} />
            {autoRefresh ? "Live" : "Paused"}
          </button>
          <button onClick={fetchData} className="btn-secondary flex items-center gap-2 text-sm">
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Active Orders", value: data?.activeOrders?.length || 0, icon: Factory, color: "from-blue-500 to-blue-600", iconBg: "bg-blue-50", iconText: "text-blue-600" },
          { label: "Today Output", value: (data?.todayOutput || 0).toLocaleString(), icon: Package, color: "from-emerald-500 to-emerald-600", iconBg: "bg-emerald-50", iconText: "text-emerald-600" },
          { label: "Scrap", value: data?.todayScrap || 0, icon: AlertTriangle, color: "from-rose-500 to-rose-600", iconBg: "bg-rose-50", iconText: "text-rose-600", sub: `${data?.scrapRate || 0}% rate` },
          { label: "Downtime", value: `${data?.todayDowntime || 0}m`, icon: Clock, color: "from-amber-500 to-amber-600", iconBg: "bg-amber-50", iconText: "text-amber-600" },
          { label: "Alerts", value: alerts.length, icon: Bell, color: "from-violet-500 to-violet-600", iconBg: "bg-violet-50", iconText: "text-violet-600" },
        ].map((kpi, i) => (
          <div key={i} className="stat-card group animate-in fade-in-up" style={{ animationDelay: `${i * 0.05}s` }}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">{kpi.label}</p>
                <p className={`text-2xl font-bold mt-1 ${kpi.iconText}`}>{kpi.value}</p>
                {kpi.sub && <p className="text-xs text-surface-400 mt-0.5">{kpi.sub}</p>}
              </div>
              <div className={`w-10 h-10 rounded-xl ${kpi.iconBg} flex items-center justify-center transition-transform duration-300 group-hover:scale-110`}>
                <kpi.icon size={20} className={kpi.iconText} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Active Alerts Banner */}
      {alerts.length > 0 && (
        <div className="card-static border-l-4 border-l-rose-500 bg-rose-50/50 animate-in fade-in-up" style={{ animationDelay: "0.3s" }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center">
              <Bell size={16} className="text-rose-600" />
            </div>
            <h3 className="font-semibold text-rose-800">Active Alerts ({alerts.length})</h3>
          </div>
          <div className="space-y-2">
            {alerts.map((alert: any) => (
              <div key={alert.id} className="flex items-center gap-3 p-3 rounded-xl bg-white border border-rose-100">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${alert.severity === "CRITICAL" ? "bg-rose-500 animate-pulse" : "bg-amber-500"}`}></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`status-badge text-[10px] ${alert.severity === "CRITICAL" ? "status-down" : "status-idle"}`}>{alert.severity}</span>
                    <span className="text-[10px] text-surface-400 font-mono">{alert.alertNumber}</span>
                  </div>
                  <p className="text-sm font-medium text-surface-800 truncate">{alert.message}</p>
                  <p className="text-xs text-surface-400">{alert.machine?.name || alert.line?.name || alert.order?.orderNumber}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Production Orders */}
      <div className="card-static animate-in fade-in-up" style={{ animationDelay: "0.4s" }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-surface-900">Active Production Orders</h3>
          <span className="text-xs bg-primary-50 text-primary-600 px-2.5 py-0.5 rounded-full font-semibold">
            {data?.activeOrders?.length || 0} active
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.activeOrders?.length === 0 && (
            <div className="col-span-full text-center py-12 text-surface-400">
              <Factory size={40} className="mx-auto mb-3 text-surface-300" />
              <p className="text-sm font-medium">No active orders</p>
            </div>
          )}
          {data?.activeOrders?.map((order: any, idx: number) => {
            const progress = order.quantity > 0 ? (order.completedQty / order.quantity) * 100 : 0;
            return (
              <div
                key={order.id}
                className="group p-4 rounded-xl bg-surface-50/80 border border-surface-100 hover:border-primary-200/50 hover:bg-white transition-all duration-300 animate-in fade-in-up flex flex-col justify-between"
                style={{ animationDelay: `${0.5 + idx * 0.05}s` }}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-sm font-bold text-surface-800">{order.orderNumber}</span>
                    <span className={`status-badge text-[10px] ${order.status === "IN_PROGRESS" ? "status-running" : "status-in-progress"}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                      {order.status}
                    </span>
                  </div>
                  <p className="font-semibold text-surface-900 mb-0.5">{order.product?.name}</p>
                  <p className="text-xs text-surface-400 mb-3">{order.line?.name || "No line assigned"}</p>
                  <div className="mb-4">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-surface-500 font-medium">Progress</span>
                      <span className="font-bold text-surface-700">{order.completedQty}/{order.quantity} ({progress.toFixed(0)}%)</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-bar-fill bg-gradient-to-r from-primary-400 to-primary-500" style={{ width: `${Math.min(progress, 100)}%` }}></div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-surface-200/60 flex items-center justify-between">
                  <span className="text-[11px] text-surface-400 font-mono">Unit: {order.product?.unit || "PCS"}</span>
                  <button
                    onClick={() => handleOpenLogModal(order)}
                    className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1 shadow-sm"
                  >
                    <Plus size={13} /> Input Hasil Produksi
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Activity Log */}
      <div className="card-static animate-in fade-in-up" style={{ animationDelay: "0.6s" }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-surface-900">Today&apos;s Activity</h3>
          <span className="text-xs text-surface-400 font-medium">{data?.todayLogs?.length || 0} entries</span>
        </div>
        <div className="max-h-80 overflow-y-auto space-y-2">
          {data?.todayLogs?.length === 0 && (
            <div className="text-center py-8 text-surface-400">
              <Activity size={32} className="mx-auto mb-2 text-surface-300" />
              <p className="text-sm">No activity today</p>
            </div>
          )}
          {data?.todayLogs?.map((log: any, idx: number) => (
            <div key={log.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-50/80 transition-colors animate-in fade-in" style={{ animationDelay: `${idx * 0.03}s` }}>
              <div
                className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                  log.logType === "OUTPUT" ? "bg-emerald-500" : log.logType === "SCRAP" ? "bg-rose-500" : log.logType === "DOWNTIME" ? "bg-amber-500" : "bg-primary-500"
                }`}
              ></div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-surface-800">
                  {log.order?.orderNumber} - {log.order?.product?.name}
                </p>
                <p className="text-xs text-surface-500">
                  {log.logType}: {log.goodCount > 0 ? `+${log.goodCount} pcs bagus` : ""} {log.scrapCount > 0 ? `, ${log.scrapCount} cacing/cacat` : ""}{" "}
                  {log.downtimeMinutes > 0 ? `, ${log.downtimeMinutes}m downtime (${log.downtimeReason || "kendala"})` : ""}
                </p>
              </div>
              <span className="text-xs text-surface-400 font-mono flex-shrink-0">{new Date(log.timestamp).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Input Hasil Produksi */}
      {showLogModal && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="card-static max-w-md w-full p-6 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-surface-100">
              <div>
                <h3 className="font-bold text-surface-900 text-base">Input Hasil Produksi Stasion</h3>
                <p className="text-xs text-surface-500 font-mono mt-0.5">{selectedOrder.orderNumber} · {selectedOrder.product?.name}</p>
              </div>
              <button onClick={() => setShowLogModal(false)} className="text-surface-400 hover:text-surface-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitLog} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-surface-700 uppercase tracking-wider block mb-1">
                  Jumlah Produk Bagus (Good Output)
                </label>
                <input
                  type="number"
                  min="1"
                  value={logForm.goodCount}
                  onChange={(e) => setLogForm((f) => ({ ...f, goodCount: Number(e.target.value) }))}
                  className="input-field w-full text-base font-bold text-emerald-600"
                  required
                />
                <p className="text-[11px] text-surface-400 mt-1">
                  Saat ini: {selectedOrder.completedQty} / {selectedOrder.quantity} PCS
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-surface-700 uppercase tracking-wider block mb-1">
                    Cacat / Scrap (Pcs)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={logForm.scrapCount}
                    onChange={(e) => setLogForm((f) => ({ ...f, scrapCount: Number(e.target.value) }))}
                    className="input-field w-full text-sm font-semibold text-rose-600"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-surface-700 uppercase tracking-wider block mb-1">
                    Downtime (Menit)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={logForm.downtimeMinutes}
                    onChange={(e) => setLogForm((f) => ({ ...f, downtimeMinutes: Number(e.target.value) }))}
                    className="input-field w-full text-sm font-semibold text-amber-600"
                  />
                </div>
              </div>

              {Number(logForm.downtimeMinutes) > 0 && (
                <div>
                  <label className="text-xs font-bold text-surface-700 uppercase tracking-wider block mb-1">
                    Alasan Downtime / Kendala Mesin
                  </label>
                  <input
                    type="text"
                    value={logForm.downtimeReason}
                    onChange={(e) => setLogForm((f) => ({ ...f, downtimeReason: e.target.value }))}
                    className="input-field w-full text-xs"
                    placeholder="Contoh: Sensor macet, ganti cetakan..."
                  />
                </div>
              )}

              <div className="pt-3 flex justify-end gap-2">
                <button type="button" onClick={() => setShowLogModal(false)} className="btn-secondary text-xs">
                  Batal
                </button>
                <button type="submit" disabled={submitting} className="btn-primary text-xs flex items-center gap-1.5 shadow-sm">
                  {submitting ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                  Simpan Log Output
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
