"use client";

import { useEffect, useState } from "react";
import {
  Calendar, Plus, Play, CheckCircle, Clock, AlertTriangle,
  Package, BarChart3, TrendingUp, Layers, RefreshCw, X,
  Filter, Search, ChevronRight, CheckCircle2, DollarSign,
  Building2, ArrowRight, ShieldCheck, Box
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from "recharts";

const COLORS = ["#3366ff", "#10b981", "#f59e0b", "#f43f5e", "#8b5cf6", "#06b6d4"];

function fmt(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
}

export default function PlanningPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [tab, setTab] = useState<"schedule" | "gantt" | "mrp" | "forecast">("schedule");
  const [filterStatus, setFilterStatus] = useState("");

  useEffect(() => { fetchPlans(); }, [filterStatus]);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set("status", filterStatus);
      const res = await fetch(`/api/planning/plans?${params}`);
      const json = await res.json();
      if (json.success) setPlans(json.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const totalPlanned = plans.reduce((s, p) => s + (p.plannedQty || 0), 0);
  const totalScheduled = plans.filter((p) => p.status === "SCHEDULED" || p.status === "IN_PROGRESS").length;
  const completedPlans = plans.filter((p) => p.status === "COMPLETED").length;

  return (
    <div className="space-y-6 page-enter">
      
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Calendar size={22} className="text-primary-500" />
            Production Planning (PPIC)
          </h1>
          <p className="page-subtitle">Master Scheduling, Demand Forecasting & Material Requirements Planning (MRP)</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchPlans} className="btn-secondary text-xs flex items-center gap-1.5">
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={() => setShowForm(true)} className="btn-primary text-xs flex items-center gap-1.5">
            <Plus size={15} /> New Production Plan
          </button>
        </div>
      </div>

      {/* KPI Cards with Icons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Plans", value: plans.length, icon: Layers, color: "text-primary-600", bg: "bg-primary-50" },
          { label: "Scheduled", value: totalScheduled, icon: Clock, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Completed", value: completedPlans, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Planned Volume", value: `${totalPlanned.toLocaleString()} pcs`, icon: Package, color: "text-orange-600", bg: "bg-orange-50" },
        ].map((kpi, i) => (
          <div key={i} className="stat-card flex items-center justify-between animate-in fade-in-up">
            <div>
              <p className="text-xs font-bold text-surface-400 uppercase tracking-wider">{kpi.label}</p>
              <p className={`text-2xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
            </div>
            <div className={`w-11 h-11 rounded-xl ${kpi.bg} flex items-center justify-center flex-shrink-0`}>
              <kpi.icon size={22} className={kpi.color} />
            </div>
          </div>
        ))}
      </div>

      {/* Main Tab Pills & Status Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex gap-1 p-1 bg-surface-100/80 rounded-2xl w-fit">
          {[
            { key: "schedule", label: "Schedule Board", icon: Calendar },
            { key: "gantt", label: "Gantt Timeline", icon: BarChart3 },
            { key: "mrp", label: "Material Requirements (MRP)", icon: Package },
            { key: "forecast", label: "Demand Forecast", icon: TrendingUp },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                tab === t.key
                  ? "bg-white text-primary-700 shadow-xs border border-surface-200/60"
                  : "text-surface-500 hover:text-surface-800"
              }`}
            >
              <t.icon size={14} />
              {t.label}
            </button>
          ))}
        </div>

        {/* Status Filter Badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <span className="text-xs font-bold text-surface-400 mr-1">Status:</span>
          {["", "DRAFT", "PLANNED", "SCHEDULED", "IN_PROGRESS", "COMPLETED"].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1 text-xs rounded-lg font-semibold transition-all ${
                filterStatus === s
                  ? "bg-surface-800 text-white"
                  : "bg-white border border-surface-200/80 text-surface-600 hover:border-surface-300"
              }`}
            >
              {s || "All Status"}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {tab === "schedule" && <ScheduleBoard plans={plans} onSelect={setSelectedPlan} />}
      {tab === "gantt" && <GanttChart plans={plans} />}
      {tab === "mrp" && <MRPView plans={plans} />}
      {tab === "forecast" && <ForecastView />}

      {/* Modals */}
      {showForm && <CreatePlanForm onClose={() => setShowForm(false)} onSuccess={fetchPlans} />}
      {selectedPlan && <PlanDetail plan={selectedPlan} onClose={() => setSelectedPlan(null)} onRefresh={fetchPlans} />}
    </div>
  );
}

// ─── SCHEDULE BOARD ──────────────────────────────────
function ScheduleBoard({ plans, onSelect }: { plans: any[]; onSelect: (p: any) => void }) {
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const getPlansForDate = (date: Date) => {
    return plans.filter((p) => {
      const start = new Date(p.startDate);
      const end = new Date(p.endDate);
      return date >= start && date <= end;
    });
  };

  return (
    <div className="card-static p-0 overflow-hidden">
      <div className="p-4 border-b border-surface-100 flex items-center justify-between bg-surface-50/50">
        <h3 className="font-bold text-surface-900 text-sm flex items-center gap-2">
          <Calendar size={16} className="text-primary-500" /> Weekly Master Schedule
        </h3>
        <span className="text-xs text-surface-400 font-medium">Click plan cards to view MRP details</span>
      </div>

      <div className="grid grid-cols-7 divide-x divide-surface-100 min-h-[380px] bg-white">
        {days.map((day, i) => {
          const dayPlans = getPlansForDate(day);
          const isToday = day.toDateString() === today.toDateString();
          return (
            <div key={i} className={`p-2.5 ${isToday ? "bg-primary-50/30" : ""}`}>
              <div className={`text-center mb-3 pb-2 border-b ${isToday ? "border-primary-200" : "border-surface-100"}`}>
                <p className={`text-[11px] font-bold uppercase tracking-wider ${isToday ? "text-primary-600" : "text-surface-400"}`}>
                  {day.toLocaleDateString("en-ID", { weekday: "short" })}
                </p>
                <p className={`text-base font-extrabold mt-0.5 ${isToday ? "text-primary-700" : "text-surface-800"}`}>
                  {day.getDate()}
                </p>
              </div>

              <div className="space-y-2">
                {dayPlans.map((plan) => (
                  <div
                    key={plan.id}
                    onClick={() => onSelect(plan)}
                    className="p-2.5 rounded-xl text-xs cursor-pointer hover:shadow-md transition-all bg-white border border-surface-200 hover:border-primary-300 shadow-xs"
                  >
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-primary-50 text-primary-700 border border-primary-100 block w-fit mb-1">
                      {plan.planNumber}
                    </span>
                    <p className="font-bold text-surface-900 truncate">{plan.product?.name}</p>
                    <p className="text-[11px] text-surface-500 font-medium mt-0.5">{plan.plannedQty} pcs</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── GANTT CHART ─────────────────────────────────────
function GanttChart({ plans }: { plans: any[] }) {
  const sortedPlans = [...plans].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  const allDates = plans.flatMap((p) => [new Date(p.startDate), new Date(p.endDate)]);
  const minDate = allDates.length > 0 ? new Date(Math.min(...allDates.map((d) => d.getTime()))) : new Date();
  const maxDate = allDates.length > 0 ? new Date(Math.max(...allDates.map((d) => d.getTime()))) : new Date();
  maxDate.setDate(maxDate.getDate() + 7);

  const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / 86400000);
  const dayWidth = 100 / Math.max(totalDays, 1);

  const getBarStyle = (plan: any) => {
    const start = new Date(plan.startDate).getTime();
    const end = new Date(plan.endDate).getTime();
    const offset = (start - minDate.getTime()) / 86400000;
    const width = Math.max(1, (end - start) / 86400000);
    return {
      left: `${offset * dayWidth}%`,
      width: `${width * dayWidth}%`,
    };
  };

  const barColor = (status: string) => {
    switch (status) {
      case "COMPLETED": return "bg-emerald-500 text-white";
      case "IN_PROGRESS": return "bg-blue-500 text-white";
      case "SCHEDULED": return "bg-amber-500 text-white";
      default: return "bg-surface-400 text-white";
    }
  };

  return (
    <div className="card-static p-0 overflow-hidden">
      <div className="p-4 border-b border-surface-100 bg-surface-50/50">
        <h3 className="font-bold text-surface-900 text-sm">Gantt Timeline Chart</h3>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          <div className="flex border-b border-surface-100 bg-surface-50 text-xs font-bold text-surface-500 uppercase tracking-wider">
            <div className="w-56 p-3 border-r border-surface-100 flex-shrink-0">Plan / Product</div>
            <div className="flex-1 p-3">Timeline Schedule</div>
          </div>

          <div className="divide-y divide-surface-100">
            {sortedPlans.map((plan) => (
              <div key={plan.id} className="flex hover:bg-surface-50/50 transition-colors">
                <div className="w-56 flex-shrink-0 p-3 border-r border-surface-100">
                  <p className="text-xs font-bold text-surface-900 truncate">{plan.product?.name}</p>
                  <p className="text-[11px] font-mono text-surface-400 mt-0.5">{plan.planNumber}</p>
                </div>
                <div className="flex-1 relative h-12 p-2">
                  <div
                    className={`absolute top-2.5 h-7 rounded-xl shadow-xs flex items-center px-3 text-xs font-bold ${barColor(plan.status)}`}
                    style={getBarStyle(plan)}
                  >
                    <span className="truncate">{plan.plannedQty} pcs</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {sortedPlans.length === 0 && (
            <div className="p-12 text-center text-surface-400 text-sm">No production plans to display</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MRP VIEW ────────────────────────────────────────
function MRPView({ plans }: { plans: any[] }) {
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [mrp, setMrp] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const calculateMRP = async () => {
    if (!selectedPlanId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/planning/mrp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "calculateMRP", planId: selectedPlanId }),
      });
      const json = await res.json();
      if (json.success) setMrp(json.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const totalRequired = mrp.reduce((s, r) => s + (r.totalCost || 0), 0);
  const totalShortage = mrp.filter((r) => r.status === "SHORTAGE").length;
  const fulfilled = mrp.filter((r) => r.status === "FULFILLED").length;

  return (
    <div className="space-y-4">
      <div className="card flex items-center gap-4">
        <div className="flex-1">
          <label className="label">Select Production Plan</label>
          <select className="select" value={selectedPlanId} onChange={(e) => setSelectedPlanId(e.target.value)}>
            <option value="">Select a production plan for MRP calculation...</option>
            {plans.filter((p) => p.status !== "COMPLETED").map((p) => (
              <option key={p.id} value={p.id}>{p.planNumber} - {p.product?.name} ({p.plannedQty} pcs)</option>
            ))}
          </select>
        </div>
        <div className="pt-6">
          <button onClick={calculateMRP} className="btn-primary text-xs flex items-center gap-2" disabled={!selectedPlanId || loading}>
            {loading ? <RefreshCw size={14} className="animate-spin" /> : <Package size={15} />}
            {loading ? "Calculating..." : "Calculate Material Requirements"}
          </button>
        </div>
      </div>

      {mrp.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="stat-card">
              <p className="text-xs font-bold text-surface-400 uppercase tracking-wider">Total Required Cost</p>
              <p className="text-2xl font-bold text-surface-900 mt-1">{fmt(totalRequired)}</p>
              <p className="text-xs text-surface-500 mt-1">{mrp.length} material items</p>
            </div>
            <div className="stat-card">
              <p className="text-xs font-bold text-surface-400 uppercase tracking-wider">Stock Available</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{fulfilled}</p>
              <p className="text-xs text-surface-500 mt-1">items fully in stock</p>
            </div>
            <div className="stat-card">
              <p className="text-xs font-bold text-surface-400 uppercase tracking-wider">Material Shortage</p>
              <p className="text-2xl font-bold text-rose-600 mt-1">{totalShortage}</p>
              <p className="text-xs text-surface-500 mt-1">items need procurement</p>
            </div>
          </div>

          <div className="card-static p-0 overflow-hidden">
            <table className="w-full">
              <thead className="table-header">
                <tr>
                  {["Material", "Code", "Required Qty", "Available Qty", "Shortage", "Unit Cost", "Total Cost", "Status"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {mrp.map((r) => (
                  <tr key={r.id} className={`hover:bg-surface-50/50 ${r.status === "SHORTAGE" ? "bg-rose-50/40" : ""}`}>
                    <td className="px-4 py-3 text-xs font-bold text-surface-900">{r.materialName}</td>
                    <td className="px-4 py-3 text-xs font-mono text-surface-500">{r.materialCode}</td>
                    <td className="px-4 py-3 text-xs text-right font-mono">{r.requiredQty?.toFixed(1)}</td>
                    <td className="px-4 py-3 text-xs text-right font-mono">{r.availableQty?.toFixed(1)}</td>
                    <td className={`px-4 py-3 text-xs text-right font-mono font-bold ${r.shortageQty > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                      {r.shortageQty > 0 ? r.shortageQty.toFixed(1) : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-right font-mono">{fmt(r.unitCost || 0)}</td>
                    <td className="px-4 py-3 text-xs text-right font-mono font-bold">{fmt(r.totalCost || 0)}</td>
                    <td className="px-4 py-3">
                      <span className={`status-badge ${r.status === "FULFILLED" ? "status-completed" : "status-down"}`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ─── FORECAST VIEW ───────────────────────────────────
function ForecastView() {
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [forecastData, setForecastData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/products/catalog").then((r) => r.json()).then((d) => {
      if (d.success) setProducts(d.data || []);
    });
  }, []);

  const fetchForecast = async () => {
    if (!selectedProductId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/planning/forecast?productId=${selectedProductId}`);
      const json = await res.json();
      if (json.success) setForecastData(json.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="card flex items-center gap-4">
        <div className="flex-1">
          <label className="label">Select Product for Demand Forecast</label>
          <select className="select" value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)}>
            <option value="">Select product to analyze...</option>
            {products.map((p: any) => (
              <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
            ))}
          </select>
        </div>
        <div className="pt-6">
          <button onClick={fetchForecast} className="btn-primary text-xs flex items-center gap-2" disabled={!selectedProductId || loading}>
            {loading ? <RefreshCw size={14} className="animate-spin" /> : <TrendingUp size={15} />}
            {loading ? "Analyzing..." : "Generate AI Forecast"}
          </button>
        </div>
      </div>

      {forecastData && (
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <h3 className="chart-card-title">6-Month Demand Projection</h3>
              <p className="text-xs text-surface-400">Predictive sales trend for production capacity allocation</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={forecastData.forecasts || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="forecastPeriod" tick={{ fontSize: 11, fill: "#64748b" }} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
              <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 8px 32px rgba(0,0,0,0.08)" }} />
              <Area type="monotone" dataKey="forecastedQty" stroke="#3366ff" fill="#3366ff" fillOpacity={0.15} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ─── CREATE PLAN FORM MODAL ──────────────────────────
function CreatePlanForm({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    productId: "", plannedQty: "", startDate: "", endDate: "",
    lineId: "", priority: "MEDIUM", notes: "",
  });
  const [formError, setFormError] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/products/catalog").then((r) => r.json()).then((d) => setProducts(d.data || []));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");
    try {
      const res = await fetch("/api/planning/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          plannedQty: parseInt(form.plannedQty),
          priority: form.priority,
          startDate: new Date(form.startDate),
          endDate: new Date(form.endDate),
        }),
      });
      const json = await res.json();
      if (json.success) { onSuccess(); onClose(); }
      else { setFormError(json.error || "Failed to create plan"); }
    } catch (e) { setFormError("Failed to create plan. Please try again."); } finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-surface-900/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-3xl shadow-2xl border border-surface-200/80 p-6 w-full max-w-lg">
        <div className="flex items-center justify-between pb-4 border-b border-surface-100 mb-4">
          <h2 className="text-lg font-bold text-surface-900">New Production Plan</h2>
          <button onClick={onClose} className="btn-icon"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-600 font-semibold">{formError}</div>
          )}

          <div>
            <label className="label">Target Product *</label>
            <select className="select" value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })} required>
              <option value="">Select product...</option>
              {products.map((p: any) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Planned Quantity *</label>
              <input type="number" className="input-field" value={form.plannedQty} onChange={(e) => setForm({ ...form, plannedQty: e.target.value })} required />
            </div>
            <div>
              <label className="label">Priority</label>
              <select className="select" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Start Date *</label>
              <input type="date" className="input-field" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
            </div>
            <div>
              <label className="label">End Date *</label>
              <input type="date" className="input-field" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required />
            </div>
          </div>

          <div>
            <label className="label">Notes / Instructions</label>
            <textarea className="input-field" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>

          <div className="flex gap-3 pt-3 border-t border-surface-100">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 text-xs" disabled={submitting}>Cancel</button>
            <button type="submit" className="btn-primary flex-1 text-xs" disabled={submitting}>
              {submitting ? "Creating..." : "Create Plan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── PLAN DETAIL MODAL ───────────────────────────────
function PlanDetail({ plan, onClose, onRefresh }: { plan: any; onClose: () => void; onRefresh: () => void }) {
  return (
    <div className="fixed inset-0 bg-surface-900/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-3xl shadow-2xl border border-surface-200/80 p-6 w-full max-w-lg space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-surface-100">
          <div>
            <h2 className="text-lg font-bold text-surface-900">{plan.planNumber}</h2>
            <p className="text-xs text-surface-500">{plan.product?.name} · {plan.plannedQty} pcs</p>
          </div>
          <button onClick={onClose} className="btn-icon"><X size={18} /></button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-surface-50 rounded-xl border border-surface-100">
            <span className="text-surface-400">Status</span>
            <p className="font-bold text-surface-800 mt-0.5">{plan.status}</p>
          </div>
          <div className="p-3 bg-surface-50 rounded-xl border border-surface-100">
            <span className="text-surface-400">Priority</span>
            <p className="font-bold text-surface-800 mt-0.5">{plan.priority}</p>
          </div>
          <div className="p-3 bg-surface-50 rounded-xl border border-surface-100">
            <span className="text-surface-400">Start Date</span>
            <p className="font-bold text-surface-800 mt-0.5">{new Date(plan.startDate).toLocaleDateString("id-ID")}</p>
          </div>
          <div className="p-3 bg-surface-50 rounded-xl border border-surface-100">
            <span className="text-surface-400">End Date</span>
            <p className="font-bold text-surface-800 mt-0.5">{new Date(plan.endDate).toLocaleDateString("id-ID")}</p>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button onClick={onClose} className="btn-secondary text-xs">Close</button>
        </div>
      </div>
    </div>
  );
}
