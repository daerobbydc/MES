"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Search, Package, GitBranch, AlertTriangle, Plus, X,
  ChevronRight, CheckCircle, Clock, RefreshCw, ArrowRight,
  BarChart3, Shield, QrCode, FileText, Layers, Building2,
  Calendar, Tag, Hash, MapPin, Truck, RotateCcw,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Lot {
  id: string;
  lotNumber: string;
  materialCode?: string;
  type: string;
  quantity: number;
  availableQty: number;
  unit: string;
  status: string;
  qcStatus: string;
  manufacturingDate: string | null;
  expiryDate: string | null;
  suppliersLotNo?: string;
  location?: string;
  notes?: string;
  recallReason?: string;
  createdAt: string;
  product: { name: string; sku: string; unit: string } | null;
  supplier: { name: string; code: string } | null;
  warehouse: { name: string; code: string } | null;
  _count: { serialItems: number; childLots: number; movements: number };
}

interface Serial {
  id: string;
  serialNumber: string;
  status: string;
  soldDate: string | null;
  warrantyExpiry: string | null;
  createdAt: string;
  product: { name: string; sku: string } | null;
  lot: { lotNumber: string } | null;
  customer: { name: string; code: string } | null;
}

interface TraceResult {
  type: "LOT" | "SERIAL";
  found: boolean;
  data: any;
  chain: ChainNode[];
}

interface ChainNode {
  level: number;
  label: string;
  lotNumber?: string;
  serialNumber?: string;
  product?: string;
  sku?: string;
  supplier?: string;
  customer?: string;
  status?: string;
  type?: string;
  quantity?: number;
  availableQty?: number;
  qcStatus?: string;
  serialCount?: number;
  warehouse?: string;
  soldDate?: string;
  warrantyExpiry?: string;
  manufacturingDate?: string;
  expiryDate?: string;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const LOT_TYPE_BADGE: Record<string, string> = {
  RAW_MATERIAL:     "bg-amber-50 text-amber-700 border border-amber-200",
  WORK_IN_PROGRESS: "bg-blue-50 text-blue-700 border border-blue-200",
  FINISHED_GOOD:    "bg-emerald-50 text-emerald-700 border border-emerald-200",
  PACKAGING:        "bg-purple-50 text-purple-700 border border-purple-200",
};

const LOT_STATUS_BADGE: Record<string, string> = {
  ACTIVE:     "bg-emerald-50 text-emerald-700 border border-emerald-200",
  QUARANTINE: "bg-amber-50 text-amber-700 border border-amber-200",
  RECALLED:   "bg-rose-50 text-rose-700 border border-rose-200",
  CONSUMED:   "bg-surface-100 text-surface-600 border border-surface-200",
  EXPIRED:    "bg-orange-50 text-orange-700 border border-orange-200",
  DISPOSED:   "bg-surface-100 text-surface-500 border border-surface-200",
  SOLD:       "bg-sky-50 text-sky-700 border border-sky-200",
};

const QC_BADGE: Record<string, string> = {
  PENDING:     "bg-surface-100 text-surface-600 border border-surface-200",
  APPROVED:    "bg-emerald-50 text-emerald-700 border border-emerald-200",
  REJECTED:    "bg-rose-50 text-rose-700 border border-rose-200",
  CONDITIONAL: "bg-amber-50 text-amber-700 border border-amber-200",
};

const CHAIN_COLORS: Record<number, { line: string; dot: string; card: string }> = {
  [-2]: { line: "border-amber-300", dot: "bg-amber-400", card: "border-amber-200 bg-amber-50/50" },
  [-1]: { line: "border-orange-300", dot: "bg-orange-400", card: "border-orange-200 bg-orange-50/50" },
  [0]:  { line: "border-primary-400", dot: "bg-primary-500", card: "border-primary-200 bg-primary-50/60 shadow-sm" },
  [1]:  { line: "border-emerald-300", dot: "bg-emerald-500", card: "border-emerald-200 bg-emerald-50/50" },
  [2]:  { line: "border-blue-300", dot: "bg-blue-400", card: "border-blue-200 bg-blue-50/50" },
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TraceabilityPage() {
  const [tab, setTab] = useState<"trace" | "lots" | "serials" | "recall">("trace");

  // Trace
  const [traceQuery, setTraceQuery]   = useState("");
  const [traceResult, setTraceResult] = useState<TraceResult | null>(null);
  const [tracing, setTracing]         = useState(false);

  // Lots
  const [lots, setLots]             = useState<Lot[]>([]);
  const [lotsTotal, setLotsTotal]   = useState(0);
  const [lotsSearch, setLotsSearch] = useState("");
  const [lotsType, setLotsType]     = useState("");
  const [lotsStatus, setLotsStatus] = useState("");
  const [lotsLoading, setLotsLoading] = useState(false);

  // Serials
  const [serials, setSerials]         = useState<Serial[]>([]);
  const [serialSearch, setSerialSearch] = useState("");
  const [serialStatus, setSerialStatus] = useState("");
  const [serialsLoading, setSerialsLoading] = useState(false);

  // Modals
  const [showNewLot, setShowNewLot]     = useState(false);
  const [showNewSerial, setShowNewSerial] = useState(false);
  const [selectedLot, setSelectedLot]   = useState<Lot | null>(null);
  const [showRecallModal, setShowRecallModal] = useState(false);
  const [recallTarget, setRecallTarget] = useState<Lot | null>(null);
  const [saving, setSaving]             = useState(false);
  const [products, setProducts]         = useState<any[]>([]);

  // New lot form
  const [lotForm, setLotForm] = useState({
    lotNumber: "", productId: "", supplierId: "", type: "FINISHED_GOOD",
    quantity: "", unit: "PCS", manufacturingDate: "", expiryDate: "",
    suppliersLotNo: "", location: "", notes: "",
  });

  // New serial form
  const [serialForm, setSerialForm] = useState({
    bulk: true, prefix: "", count: "10", productId: "", lotId: "",
    warrantyMonths: "12", notes: "",
  });

  // Recall form
  const [recallForm, setRecallForm] = useState({ recallReason: "" });

  const fetchLots = useCallback(async () => {
    setLotsLoading(true);
    try {
      const params = new URLSearchParams({ search: lotsSearch, type: lotsType, status: lotsStatus });
      const res = await fetch(`/api/traceability/lots?${params}`);
      const json = await res.json();
      if (json.success) { setLots(json.data.lots); setLotsTotal(json.data.total); }
    } catch (e) { console.error(e); }
    finally { setLotsLoading(false); }
  }, [lotsSearch, lotsType, lotsStatus]);

  const fetchSerials = useCallback(async () => {
    setSerialsLoading(true);
    try {
      const params = new URLSearchParams({ search: serialSearch, status: serialStatus });
      const res = await fetch(`/api/traceability/serials?${params}`);
      const json = await res.json();
      if (json.success) setSerials(json.data);
    } catch (e) { console.error(e); }
    finally { setSerialsLoading(false); }
  }, [serialSearch, serialStatus]);

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products/catalog");
      const json = await res.json();
      if (json.success) setProducts(json.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchLots(); }, [fetchLots]);
  useEffect(() => { if (tab === "serials") fetchSerials(); }, [tab, fetchSerials]);
  useEffect(() => { fetchProducts(); }, []);

  const handleTrace = async () => {
    if (!traceQuery.trim()) return;
    setTracing(true);
    setTraceResult(null);
    try {
      const res = await fetch(`/api/traceability/trace?q=${encodeURIComponent(traceQuery)}`);
      const json = await res.json();
      if (json.success) setTraceResult(json.data);
    } catch (e) { console.error(e); }
    finally { setTracing(false); }
  };

  const handleCreateLot = async () => {
    if (!lotForm.lotNumber || !lotForm.productId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/traceability/lots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lotForm),
      });
      const json = await res.json();
      if (json.success) { setShowNewLot(false); setLotForm({ lotNumber: "", productId: "", supplierId: "", type: "FINISHED_GOOD", quantity: "", unit: "PCS", manufacturingDate: "", expiryDate: "", suppliersLotNo: "", location: "", notes: "" }); fetchLots(); }
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const handleCreateSerial = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/traceability/serials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...serialForm, bulk: true }),
      });
      const json = await res.json();
      if (json.success) { setShowNewSerial(false); fetchSerials(); }
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const handleRecall = async () => {
    if (!recallTarget || !recallForm.recallReason) return;
    setSaving(true);
    try {
      await fetch(`/api/traceability/lots/${recallTarget.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "RECALLED", recallReason: recallForm.recallReason }),
      });
      setShowRecallModal(false);
      setRecallTarget(null);
      fetchLots();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const handleQuarantine = async (lot: Lot) => {
    await fetch(`/api/traceability/lots/${lot.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "QUARANTINE" }),
    });
    fetchLots();
  };

  const TABS = [
    { key: "trace",  label: "Trace Search",     icon: Search },
    { key: "lots",   label: "Lot Register",      icon: Layers },
    { key: "serials",label: "Serial Numbers",    icon: Hash },
    { key: "recall", label: "Recall Management", icon: AlertTriangle },
  ] as const;

  const recalledLots = lots.filter(l => l.status === "RECALLED");
  const quarantineLots = lots.filter(l => l.status === "QUARANTINE");

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 tracking-tight">Product Genealogy & Traceability</h1>
          <p className="text-sm text-surface-500 mt-0.5">Lot tracking · Serial numbers · Product recall management</p>
        </div>
        <div className="flex gap-2">
          {tab === "lots" && (
            <button onClick={() => setShowNewLot(true)} className="btn-primary flex items-center gap-2 text-sm">
              <Plus size={15} /> New Lot
            </button>
          )}
          {tab === "serials" && (
            <button onClick={() => setShowNewSerial(true)} className="btn-primary flex items-center gap-2 text-sm">
              <Plus size={15} /> Register Serials
            </button>
          )}
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Lots", value: lotsTotal, icon: Layers, color: "text-primary-600", bg: "bg-primary-50" },
          { label: "Active Lots", value: lots.filter(l => l.status === "ACTIVE").length, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Quarantine", value: quarantineLots.length, icon: Shield, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Recalled", value: recalledLots.length, icon: AlertTriangle, color: "text-rose-600", bg: "bg-rose-50" },
        ].map(k => (
          <div key={k.label} className="card flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl ${k.bg} flex items-center justify-center flex-shrink-0`}>
              <k.icon size={20} className={k.color} />
            </div>
            <div>
              <p className="text-2xl font-bold text-surface-900">{k.value}</p>
              <p className="text-xs text-surface-500">{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 p-1 bg-surface-100/80 rounded-2xl w-fit">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              tab === t.key
                ? "bg-white text-primary-700 shadow-sm border border-surface-200/60"
                : "text-surface-500 hover:text-surface-700"
            }`}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: TRACE SEARCH ── */}
      {tab === "trace" && (
        <div className="space-y-6">
          <div className="card">
            <h2 className="font-semibold text-surface-900 mb-4">Trace a Lot or Serial Number</h2>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
                <input
                  type="text"
                  placeholder="Enter lot number (e.g. LOT-2024-001) or serial number..."
                  value={traceQuery}
                  onChange={e => setTraceQuery(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleTrace()}
                  className="input-field pl-10"
                />
              </div>
              <button
                onClick={handleTrace}
                disabled={tracing || !traceQuery.trim()}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                {tracing ? <RefreshCw size={15} className="animate-spin" /> : <GitBranch size={15} />}
                Trace
              </button>
            </div>
          </div>

          {/* Trace Result */}
          {traceResult !== null && (
            <div className="space-y-4">
              {!traceResult.found ? (
                <div className="card text-center py-12">
                  <Search size={32} className="mx-auto text-surface-300 mb-3" />
                  <p className="font-semibold text-surface-700">No results found</p>
                  <p className="text-sm text-surface-400 mt-1">No lot or serial matching <span className="font-mono bg-surface-100 px-2 py-0.5 rounded">{traceQuery}</span></p>
                </div>
              ) : (
                <>
                  {/* Genealogy Chain */}
                  <div className="card">
                    <div className="flex items-center gap-2 mb-6">
                      <GitBranch size={16} className="text-primary-500" />
                      <h3 className="font-semibold text-surface-900">Genealogy Chain</h3>
                      <span className="text-xs text-surface-400 ml-auto">
                        {traceResult.type === "LOT" ? "Lot" : "Serial"} trace result
                      </span>
                    </div>

                    <div className="flex flex-col gap-0">
                      {traceResult.chain.map((node, i) => {
                        const col = CHAIN_COLORS[node.level] || CHAIN_COLORS[1];
                        return (
                          <div key={i} className="flex gap-4">
                            {/* Left timeline */}
                            <div className="flex flex-col items-center w-8 flex-shrink-0">
                              <div className={`w-3.5 h-3.5 rounded-full border-2 border-white flex-shrink-0 ${col.dot} shadow-sm`} />
                              {i < traceResult.chain.length - 1 && (
                                <div className={`w-0.5 flex-1 mt-1 border-l-2 border-dashed ${col.line} min-h-[20px]`} />
                              )}
                            </div>

                            {/* Node card */}
                            <div className={`flex-1 mb-4 p-4 rounded-xl border ${col.card}`}>
                              <div className="flex items-start justify-between gap-2 flex-wrap">
                                <div>
                                  <span className="text-[10px] font-bold uppercase tracking-widest text-surface-400">{node.label}</span>
                                  <p className="font-bold text-surface-900 text-sm mt-0.5">
                                    {node.lotNumber || node.serialNumber}
                                  </p>
                                  {node.product && <p className="text-xs text-surface-600">{node.product} {node.sku ? `· ${node.sku}` : ""}</p>}
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  {node.type && (
                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${LOT_TYPE_BADGE[node.type] || "bg-surface-100 text-surface-600"}`}>
                                      {node.type.replace("_", " ")}
                                    </span>
                                  )}
                                  {node.status && (
                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${LOT_STATUS_BADGE[node.status] || "bg-surface-100 text-surface-600"}`}>
                                      {node.status}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-surface-500">
                                {node.supplier  && <span><Building2 size={10} className="inline mr-0.5" />{node.supplier}</span>}
                                {node.customer  && <span><Truck size={10} className="inline mr-0.5" />{node.customer}</span>}
                                {node.warehouse && <span><MapPin size={10} className="inline mr-0.5" />{node.warehouse}</span>}
                                {node.quantity !== undefined && <span><Package size={10} className="inline mr-0.5" />{node.quantity} units</span>}
                                {node.serialCount !== undefined && <span><Hash size={10} className="inline mr-0.5" />{node.serialCount} serials</span>}
                                {node.manufacturingDate && <span><Calendar size={10} className="inline mr-0.5" />Mfg: {fmtDate(node.manufacturingDate)}</span>}
                                {node.expiryDate && <span><Clock size={10} className="inline mr-0.5" />Exp: {fmtDate(node.expiryDate)}</span>}
                                {node.soldDate && <span><Truck size={10} className="inline mr-0.5" />Sold: {fmtDate(node.soldDate)}</span>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Movement Timeline */}
                  {traceResult.type === "LOT" && traceResult.data.movements?.length > 0 && (
                    <div className="card">
                      <h3 className="font-semibold text-surface-900 mb-4 flex items-center gap-2">
                        <Clock size={15} className="text-surface-400" />
                        Movement History
                      </h3>
                      <div className="space-y-2">
                        {traceResult.data.movements.map((m: any, i: number) => (
                          <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-surface-50 border border-surface-100">
                            <div className="w-2 h-2 rounded-full bg-primary-400 mt-1.5 flex-shrink-0" />
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-surface-800">{m.movementType.replace("_", " ")}</span>
                                <span className="text-[11px] text-surface-400">{fmtDate(m.createdAt)}</span>
                              </div>
                              <p className="text-[11px] text-surface-500 mt-0.5">
                                Qty: {m.quantity}
                                {m.fromLocation && ` · From: ${m.fromLocation}`}
                                {m.toLocation && ` · To: ${m.toLocation}`}
                                {m.referenceNumber && ` · Ref: ${m.referenceNumber}`}
                              </p>
                              {m.notes && <p className="text-[11px] text-surface-400 italic mt-0.5">{m.notes}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: LOT REGISTER ── */}
      {tab === "lots" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
              <input type="text" placeholder="Search lot number, product..." value={lotsSearch} onChange={e => setLotsSearch(e.target.value)} className="input-field pl-9 text-sm" />
            </div>
            <select value={lotsType} onChange={e => setLotsType(e.target.value)} className="select w-auto text-sm">
              <option value="">All Types</option>
              <option value="RAW_MATERIAL">Raw Material</option>
              <option value="WORK_IN_PROGRESS">WIP</option>
              <option value="FINISHED_GOOD">Finished Good</option>
              <option value="PACKAGING">Packaging</option>
            </select>
            <select value={lotsStatus} onChange={e => setLotsStatus(e.target.value)} className="select w-auto text-sm">
              <option value="">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="QUARANTINE">Quarantine</option>
              <option value="RECALLED">Recalled</option>
              <option value="CONSUMED">Consumed</option>
              <option value="EXPIRED">Expired</option>
            </select>
          </div>

          {lotsLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-7 h-7 border-2 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
            </div>
          ) : lots.length === 0 ? (
            <div className="card-static text-center py-16">
              <Layers size={36} className="mx-auto text-surface-300 mb-3" />
              <p className="font-medium text-surface-500">No lots found</p>
              <button onClick={() => setShowNewLot(true)} className="mt-4 btn-primary text-sm flex items-center gap-2 mx-auto">
                <Plus size={14} /> Create First Lot
              </button>
            </div>
          ) : (
            <div className="card-static p-0 overflow-hidden">
              <table className="w-full">
                <thead className="table-header">
                  <tr>
                    {["Lot Number", "Product", "Type", "Qty / Available", "Status", "QC", "Mfg Date", "Expiry", "Actions"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {lots.map(lot => (
                    <tr key={lot.id} className="hover:bg-surface-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <button onClick={() => { setTraceQuery(lot.lotNumber); setTab("trace"); }} className="font-semibold text-sm text-primary-600 hover:text-primary-800 font-mono">
                            {lot.lotNumber}
                          </button>
                          {lot.suppliersLotNo && <p className="text-[10px] text-surface-400">{lot.suppliersLotNo}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-surface-800">{lot.product?.name || "—"}</p>
                        <p className="text-[11px] text-surface-400">{lot.product?.sku}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${LOT_TYPE_BADGE[lot.type] || "bg-surface-100 text-surface-600"}`}>
                          {lot.type.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-surface-700">
                        {lot.quantity} / <span className="text-emerald-600 font-medium">{lot.availableQty}</span> {lot.unit}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${LOT_STATUS_BADGE[lot.status] || "bg-surface-100 text-surface-600"}`}>
                          {lot.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${QC_BADGE[lot.qcStatus] || "bg-surface-100 text-surface-600"}`}>
                          {lot.qcStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-surface-500">{fmtDate(lot.manufacturingDate)}</td>
                      <td className="px-4 py-3 text-xs">
                        <span className={lot.expiryDate && new Date(lot.expiryDate) < new Date() ? "text-rose-600 font-semibold" : "text-surface-500"}>
                          {fmtDate(lot.expiryDate)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => { setTraceQuery(lot.lotNumber); setTab("trace"); handleTrace(); }} title="Trace" className="btn-icon w-7 h-7 text-primary-500 hover:text-primary-700 hover:bg-primary-50">
                            <GitBranch size={13} />
                          </button>
                          {lot.status === "ACTIVE" && (
                            <>
                              <button onClick={() => handleQuarantine(lot)} title="Quarantine" className="btn-icon w-7 h-7 text-amber-500 hover:text-amber-700 hover:bg-amber-50">
                                <Shield size={13} />
                              </button>
                              <button onClick={() => { setRecallTarget(lot); setShowRecallModal(true); }} title="Recall" className="btn-icon w-7 h-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50">
                                <AlertTriangle size={13} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: SERIAL NUMBERS ── */}
      {tab === "serials" && (
        <div className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
              <input type="text" placeholder="Search serial number or product..." value={serialSearch} onChange={e => setSerialSearch(e.target.value)} className="input-field pl-9 text-sm" />
            </div>
            <select value={serialStatus} onChange={e => setSerialStatus(e.target.value)} className="select w-auto text-sm">
              <option value="">All Status</option>
              <option value="AVAILABLE">Available</option>
              <option value="IN_STOCK">In Stock</option>
              <option value="SOLD">Sold</option>
              <option value="IN_TRANSIT">In Transit</option>
              <option value="RETURNED">Returned</option>
              <option value="RECALLED">Recalled</option>
            </select>
          </div>
          {serialsLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-7 h-7 border-2 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
            </div>
          ) : serials.length === 0 ? (
            <div className="card-static text-center py-16">
              <Hash size={36} className="mx-auto text-surface-300 mb-3" />
              <p className="font-medium text-surface-500">No serial numbers registered</p>
              <button onClick={() => setShowNewSerial(true)} className="mt-4 btn-primary text-sm flex items-center gap-2 mx-auto">
                <Plus size={14} /> Register Serials
              </button>
            </div>
          ) : (
            <div className="card-static p-0 overflow-hidden">
              <table className="w-full">
                <thead className="table-header">
                  <tr>
                    {["Serial Number", "Product", "Lot", "Status", "Customer", "Sold Date", "Warranty Expiry"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {serials.map(s => (
                    <tr key={s.id} className="hover:bg-surface-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm font-semibold text-surface-800">{s.serialNumber}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-surface-700">{s.product?.name || "—"}</td>
                      <td className="px-4 py-3">
                        {s.lot ? (
                          <button onClick={() => { setTraceQuery(s.lot!.lotNumber); setTab("trace"); }} className="text-xs font-mono text-primary-600 hover:underline">
                            {s.lot.lotNumber}
                          </button>
                        ) : <span className="text-surface-400 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          s.status === "SOLD" ? "bg-sky-50 text-sky-700 border border-sky-200" :
                          s.status === "RECALLED" ? "bg-rose-50 text-rose-700 border border-rose-200" :
                          "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-surface-600">{s.customer?.name || "—"}</td>
                      <td className="px-4 py-3 text-xs text-surface-500">{fmtDate(s.soldDate)}</td>
                      <td className="px-4 py-3 text-xs">
                        <span className={s.warrantyExpiry && new Date(s.warrantyExpiry) < new Date() ? "text-rose-600 font-semibold" : "text-surface-500"}>
                          {fmtDate(s.warrantyExpiry)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: RECALL MANAGEMENT ── */}
      {tab === "recall" && (
        <div className="space-y-4">
          {recalledLots.length === 0 && quarantineLots.length === 0 ? (
            <div className="card text-center py-16">
              <CheckCircle size={36} className="mx-auto text-emerald-400 mb-3" />
              <p className="font-semibold text-surface-700">No Active Recalls or Quarantines</p>
              <p className="text-sm text-surface-400 mt-1">All lots are in normal status</p>
            </div>
          ) : (
            <>
              {quarantineLots.length > 0 && (
                <div className="card">
                  <h3 className="font-semibold text-amber-700 flex items-center gap-2 mb-4">
                    <Shield size={16} className="text-amber-500" />
                    Quarantined Lots ({quarantineLots.length})
                  </h3>
                  <div className="space-y-3">
                    {quarantineLots.map(lot => (
                      <div key={lot.id} className="p-4 rounded-xl border border-amber-200 bg-amber-50/50">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-mono font-bold text-surface-900">{lot.lotNumber}</p>
                            <p className="text-sm text-surface-600">{lot.product?.name} · {lot.quantity} {lot.unit}</p>
                            <p className="text-xs text-surface-400 mt-0.5">Quarantined on {fmtDate(lot.createdAt)}</p>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => { setRecallTarget(lot); setShowRecallModal(true); }} className="text-xs px-3 py-1.5 rounded-lg bg-rose-500 text-white font-medium hover:bg-rose-600 transition-all flex items-center gap-1">
                              <AlertTriangle size={12} /> Escalate to Recall
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {recalledLots.length > 0 && (
                <div className="card">
                  <h3 className="font-semibold text-rose-700 flex items-center gap-2 mb-4">
                    <AlertTriangle size={16} className="text-rose-500" />
                    Active Recalls ({recalledLots.length})
                  </h3>
                  <div className="space-y-3">
                    {recalledLots.map(lot => (
                      <div key={lot.id} className="p-4 rounded-xl border border-rose-200 bg-rose-50/50">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-mono font-bold text-surface-900">{lot.lotNumber}</p>
                            <p className="text-sm text-surface-600">{lot.product?.name} · {lot.quantity} {lot.unit}</p>
                            {lot.recallReason && <p className="text-xs text-rose-700 mt-1 font-medium">Reason: {lot.recallReason}</p>}
                            <p className="text-xs text-surface-400 mt-0.5">
                              Serials: {lot._count.serialItems} · Child lots: {lot._count.childLots}
                            </p>
                          </div>
                          <button onClick={() => { setTraceQuery(lot.lotNumber); setTab("trace"); }} className="text-xs px-3 py-1.5 rounded-lg bg-surface-800 text-white font-medium hover:bg-surface-700 transition-all flex items-center gap-1">
                            <GitBranch size={12} /> Trace Impact
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Modal: New Lot ── */}
      {showNewLot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-900/40 backdrop-blur-sm">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/60 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-surface-100">
              <h2 className="text-lg font-bold text-surface-900">New Lot Number</h2>
              <button onClick={() => setShowNewLot(false)} className="btn-icon"><X size={18} /></button>
            </div>
            <div className="px-6 py-5 grid grid-cols-2 gap-4">
              {[
                { label: "Lot Number *", key: "lotNumber", type: "text", span: 1 },
                { label: "Type *", key: "type", type: "select", span: 1, opts: [["RAW_MATERIAL","Raw Material"],["WORK_IN_PROGRESS","Work In Progress"],["FINISHED_GOOD","Finished Good"],["PACKAGING","Packaging"]] },
                { label: "Quantity *", key: "quantity", type: "number", span: 1 },
                { label: "Unit", key: "unit", type: "text", span: 1 },
                { label: "Manufacturing Date", key: "manufacturingDate", type: "date", span: 1 },
                { label: "Expiry Date", key: "expiryDate", type: "date", span: 1 },
                { label: "Supplier Lot No.", key: "suppliersLotNo", type: "text", span: 1 },
                { label: "Location", key: "location", type: "text", span: 1 },
                { label: "Notes", key: "notes", type: "text", span: 2 },
              ].map(f => (
                <div key={f.key} className={f.span === 2 ? "col-span-2" : ""}>
                  <label className="label">{f.label}</label>
                  {f.type === "select" ? (
                    <select className="select" value={(lotForm as any)[f.key]} onChange={e => setLotForm(p => ({ ...p, [f.key]: e.target.value }))}>
                      {(f.opts || []).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  ) : (
                    <input type={f.type} className="input-field" value={(lotForm as any)[f.key]} onChange={e => setLotForm(p => ({ ...p, [f.key]: e.target.value }))} />
                  )}
                </div>
              ))}
              <div className="col-span-2">
                <label className="label">Product *</label>
                <select className="select" value={lotForm.productId} onChange={e => setLotForm(p => ({ ...p, productId: e.target.value }))}>
                  <option value="">Select product…</option>
                  {products.map((p: any) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-surface-100">
              <button onClick={() => setShowNewLot(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleCreateLot} disabled={saving || !lotForm.lotNumber || !lotForm.productId} className="btn-primary flex-1 disabled:opacity-50">
                {saving ? <RefreshCw size={14} className="animate-spin inline mr-2" /> : null}Create Lot
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Register Serials ── */}
      {showNewSerial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-900/40 backdrop-blur-sm">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/60 w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-surface-100">
              <h2 className="text-lg font-bold text-surface-900">Register Serial Numbers</h2>
              <button onClick={() => setShowNewSerial(false)} className="btn-icon"><X size={18} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="label">Product *</label>
                <select className="select" value={serialForm.productId} onChange={e => setSerialForm(p => ({ ...p, productId: e.target.value }))}>
                  <option value="">Select product…</option>
                  {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Lot Number (optional)</label>
                <input type="text" className="input-field" placeholder="LOT-2024-001" value={serialForm.lotId} onChange={e => setSerialForm(p => ({ ...p, lotId: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Serial Prefix *</label>
                  <input type="text" className="input-field" placeholder="SN-PROD-A" value={serialForm.prefix} onChange={e => setSerialForm(p => ({ ...p, prefix: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Count *</label>
                  <input type="number" className="input-field" min="1" max="500" value={serialForm.count} onChange={e => setSerialForm(p => ({ ...p, count: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label">Warranty (months)</label>
                <input type="number" className="input-field" value={serialForm.warrantyMonths} onChange={e => setSerialForm(p => ({ ...p, warrantyMonths: e.target.value }))} />
              </div>
              <div className="p-3 rounded-xl bg-primary-50 border border-primary-100 text-xs text-primary-700">
                Will generate serials: <strong>{serialForm.prefix || "PREFIX"}-0001</strong> to <strong>{serialForm.prefix || "PREFIX"}-{String(parseInt(serialForm.count) || 0).padStart(4, "0")}</strong>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-surface-100">
              <button onClick={() => setShowNewSerial(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleCreateSerial} disabled={saving || !serialForm.prefix || !serialForm.productId} className="btn-primary flex-1 disabled:opacity-50">
                {saving ? <RefreshCw size={14} className="animate-spin inline mr-2" /> : null}Generate Serials
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Recall ── */}
      {showRecallModal && recallTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-900/40 backdrop-blur-sm">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/60 w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-surface-100">
              <h2 className="text-lg font-bold text-rose-700 flex items-center gap-2">
                <AlertTriangle size={18} className="text-rose-500" />
                Initiate Product Recall
              </h2>
              <button onClick={() => setShowRecallModal(false)} className="btn-icon"><X size={18} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200">
                <p className="text-sm font-semibold text-rose-800">{recallTarget.lotNumber}</p>
                <p className="text-xs text-rose-600">{recallTarget.product?.name} · {recallTarget.quantity} {recallTarget.unit}</p>
                <p className="text-xs text-rose-500 mt-1">
                  {recallTarget._count.serialItems} serial units affected · {recallTarget._count.childLots} child lots
                </p>
              </div>
              <div>
                <label className="label">Recall Reason *</label>
                <textarea
                  className="input-field min-h-[80px] resize-none"
                  placeholder="Describe the defect or safety issue requiring the recall..."
                  value={recallForm.recallReason}
                  onChange={e => setRecallForm({ recallReason: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-surface-100">
              <button onClick={() => setShowRecallModal(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleRecall} disabled={saving || !recallForm.recallReason} className="btn-danger flex-1 disabled:opacity-50">
                {saving ? <RefreshCw size={14} className="animate-spin inline mr-2" /> : null}Confirm Recall
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
