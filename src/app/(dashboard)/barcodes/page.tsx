"use client";

import { useEffect, useState, useRef } from "react";
import {
  Barcode,
  Plus,
  Search,
  Printer,
  Download,
  Edit,
  Trash2,
  Settings,
  ScanLine,
  Layers,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Eye,
  Grid,
  QrCode,
} from "lucide-react";
import { BarcodeRenderer } from "@/components/barcode/BarcodeRenderer";

const MODULES = ["Product", "Lot", "Location", "WorkOrder", "Machine"];
const FORMATS = ["CODE128", "CODE39", "EAN13", "QR_CODE"];

export default function BarcodeManagementPage() {
  const [activeTab, setActiveTab] = useState<"templates" | "generator" | "scanner" | "batch">("templates");
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editTemplate, setEditTemplate] = useState<any>(null);

  // Template Form State
  const [form, setForm] = useState({
    name: "",
    module: "Product",
    format: "CODE128",
    width: 240,
    height: 90,
    showLabel: true,
    showDate: false,
  });

  // Generator State
  const [selectedModule, setSelectedModule] = useState("Product");
  const [records, setRecords] = useState<any[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [recordSearch, setRecordSearch] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [customCodeInput, setCustomCodeInput] = useState("");
  const [generatedBarcode, setGeneratedBarcode] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<any>(null);

  // Scanner State
  const [scanInput, setScanInput] = useState("");
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanHistory, setScanHistory] = useState<any[]>([]);
  const [isSimulatingCamera, setIsSimulatingCamera] = useState(false);

  // Batch Print State
  const [batchModule, setBatchModule] = useState("Product");
  const [batchRecords, setBatchRecords] = useState<any[]>([]);
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
  const [batchCols, setBatchCols] = useState(3);

  // Modal Print State
  const [showPrintModal, setShowPrintModal] = useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (activeTab === "generator") {
      fetchRecords(selectedModule, recordSearch);
    }
    if (activeTab === "batch") {
      fetchBatchRecords(batchModule);
    }
  }, [activeTab, selectedModule, recordSearch, batchModule]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/barcodes/templates");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setTemplates(json.data);
        if (json.data.length > 0 && !selectedTemplate) {
          setSelectedTemplate(json.data[0]);
          setPreviewTemplate(json.data[0]);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecords = async (mod: string, query: string) => {
    setRecordsLoading(true);
    try {
      const res = await fetch(`/api/barcodes/records?module=${mod}&query=${encodeURIComponent(query)}`);
      const json = await res.json();
      if (json.success) {
        setRecords(json.data || []);
        if (json.data?.length > 0 && !selectedRecord) {
          setSelectedRecord(json.data[0]);
          setGeneratedBarcode(json.data[0].code);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRecordsLoading(false);
    }
  };

  const fetchBatchRecords = async (mod: string) => {
    try {
      const res = await fetch(`/api/barcodes/records?module=${mod}&query=`);
      const json = await res.json();
      if (json.success) {
        setBatchRecords(json.data || []);
        setSelectedBatchIds((json.data || []).slice(0, 6).map((r: any) => r.id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredTemplates = templates.filter(
    (t) =>
      !search ||
      t.name?.toLowerCase().includes(search.toLowerCase()) ||
      t.module?.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setEditTemplate(null);
    setForm({
      name: "",
      module: "Product",
      format: "CODE128",
      width: 240,
      height: 90,
      showLabel: true,
      showDate: false,
    });
    setShowModal(true);
  };

  const openEdit = (t: any) => {
    setEditTemplate(t);
    setForm({
      name: t.name,
      module: t.module,
      format: t.format,
      width: t.width,
      height: t.height,
      showLabel: t.showLabel,
      showDate: t.showDate,
    });
    setShowModal(true);
  };

  const handleSaveTemplate = async () => {
    try {
      const url = editTemplate ? `/api/barcodes/templates/${editTemplate.id}` : "/api/barcodes/templates";
      const method = editTemplate ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        setShowModal(false);
        fetchTemplates();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;
    try {
      await fetch(`/api/barcodes/templates/${id}`, { method: "DELETE" });
      fetchTemplates();
    } catch (e) {
      console.error(e);
    }
  };

  const handleGenerate = async () => {
    if (!selectedRecord) return;
    try {
      const res = await fetch("/api/barcodes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module: selectedModule,
          recordId: selectedRecord.id,
          customCode: customCodeInput || selectedRecord.code,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setGeneratedBarcode(json.data.barcode);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleScanLookup = async (codeToScan?: string) => {
    const code = codeToScan || scanInput;
    if (!code.trim()) return;

    setScanLoading(true);
    try {
      const res = await fetch("/api/barcodes/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        setScanResult(json.data);
        setScanHistory((prev) => [
          {
            code: code.trim(),
            time: new Date().toLocaleTimeString(),
            matched: json.data.matched,
            name: json.data.name || "Unknown",
            module: json.data.module || "-",
          },
          ...prev.slice(0, 9),
        ]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setScanLoading(false);
    }
  };

  const triggerPrint = () => {
    window.print();
  };

  const downloadBarcodeSVG = () => {
    const svgEl = printAreaRef.current?.querySelector("svg");
    if (!svgEl) return;

    const svgData = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `barcode-${generatedBarcode || "label"}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleBatchSelect = (id: string) => {
    setSelectedBatchIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAllBatch = () => {
    if (selectedBatchIds.length === batchRecords.length) {
      setSelectedBatchIds([]);
    } else {
      setSelectedBatchIds(batchRecords.map((r) => r.id));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-primary-200 border-t-primary-500 rounded-full animate-spin"></div>
          <p className="text-sm text-surface-500 font-medium">Loading barcode subsystem...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Barcode size={24} className="text-primary-500" />
            Barcode Management & Studio
          </h1>
          <p className="page-subtitle">Configure barcode templates, generate labels, scan barcodes, and print batch tags</p>
        </div>
        <button onClick={openAdd} className="btn-primary text-xs flex items-center gap-2 shadow-sm">
          <Plus size={16} /> New Template
        </button>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Templates", value: templates.length, sub: "Configured formats", color: "text-surface-900", bg: "bg-surface-100", iconText: "text-surface-700", icon: Barcode },
          { label: "Supported Modules", value: MODULES.length, sub: "Product, Lot, Loc, WO", color: "text-primary-600", bg: "bg-primary-50", iconText: "text-primary-600", icon: Layers },
          { label: "Supported Formats", value: FORMATS.length, sub: "CODE128, CODE39, QR", color: "text-indigo-600", bg: "bg-indigo-50", iconText: "text-indigo-600", icon: QrCode },
          { label: "Scans Today", value: scanHistory.length, sub: "Lookup queries", color: "text-emerald-600", bg: "bg-emerald-50", iconText: "text-emerald-600", icon: CheckCircle2 },
        ].map((s, i) => (
          <div key={i} className="stat-card flex items-center justify-between animate-in fade-in-up" style={{ animationDelay: `${i * 0.05}s` }}>
            <div>
              <p className="text-xs font-bold text-surface-400 uppercase tracking-wider">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
              <p className="text-[11px] text-surface-400 mt-1 font-medium">{s.sub}</p>
            </div>
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
              <s.icon size={20} className={s.iconText} />
            </div>
          </div>
        ))}
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-surface-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("templates")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            activeTab === "templates"
              ? "bg-primary-600 text-white shadow-md shadow-primary-600/20"
              : "text-surface-600 hover:bg-surface-100"
          }`}
        >
          <Layers size={16} /> Barcode Templates ({templates.length})
        </button>
        <button
          onClick={() => setActiveTab("generator")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            activeTab === "generator"
              ? "bg-primary-600 text-white shadow-md shadow-primary-600/20"
              : "text-surface-600 hover:bg-surface-100"
          }`}
        >
          <Settings size={16} /> Label Generator & Studio
        </button>
        <button
          onClick={() => setActiveTab("scanner")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            activeTab === "scanner"
              ? "bg-primary-600 text-white shadow-md shadow-primary-600/20"
              : "text-surface-600 hover:bg-surface-100"
          }`}
        >
          <ScanLine size={16} /> Barcode Scanner & Lookup
        </button>
        <button
          onClick={() => setActiveTab("batch")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            activeTab === "batch"
              ? "bg-primary-600 text-white shadow-md shadow-primary-600/20"
              : "text-surface-600 hover:bg-surface-100"
          }`}
        >
          <Grid size={16} /> Batch Print Sheet
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: TEMPLATE MANAGEMENT */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "templates" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="relative max-w-md flex-1">
                <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
                <input
                  type="text"
                  placeholder="Search templates by name or module..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input-field pl-10 w-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredTemplates.map((t, idx) => (
                <div
                  key={t.id}
                  onClick={() => setPreviewTemplate(t)}
                  className={`card-static p-5 animate-in fade-in-up group cursor-pointer border-2 transition-all ${
                    previewTemplate?.id === t.id
                      ? "border-primary-500 shadow-lg shadow-primary-500/10 bg-primary-50/20"
                      : "border-surface-200/80 hover:border-surface-300 hover:shadow-md"
                  }`}
                  style={{ animationDelay: `${idx * 0.04}s` }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center text-primary-700">
                        <Barcode size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-surface-900 text-sm leading-snug">{t.name}</h3>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-surface-100 text-surface-600 inline-block mt-0.5">
                          Module: {t.module}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(t);
                        }}
                        className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-700"
                        title="Edit template"
                      >
                        <Edit size={15} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTemplate(t.id);
                        }}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-surface-400 hover:text-red-600"
                        title="Delete template"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-b border-surface-100 py-3 my-3 bg-surface-50/60 rounded-xl flex justify-center">
                    <BarcodeRenderer
                      value={`SAMPLE-${t.module.toUpperCase().slice(0, 3)}-88`}
                      format={t.format}
                      width={t.width}
                      height={t.height}
                      showLabel={t.showLabel}
                      showDate={t.showDate}
                      module={t.module}
                      className="border border-surface-200 shadow-sm"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold px-2 py-0.5 rounded-md bg-surface-100 text-surface-700">
                        {t.format}
                      </span>
                      <span className="text-surface-500 font-medium">
                        {t.width}×{t.height}px
                      </span>
                    </div>
                    <div className="flex gap-1.5">
                      {t.showLabel && <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">LABEL</span>}
                      {t.showDate && <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">DATE</span>}
                    </div>
                  </div>
                </div>
              ))}

              {filteredTemplates.length === 0 && (
                <div className="col-span-2 text-center py-16 text-surface-400 bg-white rounded-2xl border border-dashed border-surface-200">
                  <Barcode size={44} className="mx-auto mb-3 text-surface-300" />
                  <p className="font-semibold text-surface-600">No barcode templates found</p>
                  <p className="text-xs text-surface-400 mt-1">Create a new template to get started</p>
                  <button onClick={openAdd} className="btn-primary mt-4 text-xs inline-flex items-center gap-1.5">
                    <Plus size={14} /> Add Template
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Template Details & Quick Test */}
          <div className="space-y-4">
            <div className="card-static p-5 animate-in fade-in-up">
              <h3 className="font-bold text-surface-900 text-sm mb-4 flex items-center gap-2">
                <Eye size={18} className="text-primary-600" /> Template Inspector
              </h3>
              {previewTemplate ? (
                <div className="space-y-4">
                  <div className="p-4 bg-surface-50 rounded-2xl border border-surface-200 flex flex-col items-center">
                    <BarcodeRenderer
                      value={`SAMPLE-${previewTemplate.module.toUpperCase()}-99`}
                      format={previewTemplate.format}
                      width={previewTemplate.width}
                      height={previewTemplate.height}
                      showLabel={previewTemplate.showLabel}
                      showDate={previewTemplate.showDate}
                      module={previewTemplate.module}
                      className="border border-surface-200 shadow-md"
                    />
                  </div>

                  <div className="space-y-2 text-xs divide-y divide-surface-100">
                    <div className="flex justify-between py-1.5">
                      <span className="text-surface-500 font-medium">Template Name</span>
                      <span className="font-bold text-surface-900">{previewTemplate.name}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-surface-500 font-medium">Target Module</span>
                      <span className="font-bold text-primary-600">{previewTemplate.module}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-surface-500 font-medium">Encoding Format</span>
                      <span className="font-mono font-bold text-surface-900">{previewTemplate.format}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-surface-500 font-medium">Dimensions</span>
                      <span className="font-mono text-surface-900">{previewTemplate.width}px × {previewTemplate.height}px</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => {
                        setSelectedTemplate(previewTemplate);
                        setSelectedModule(previewTemplate.module);
                        setActiveTab("generator");
                      }}
                      className="btn-primary flex-1 flex items-center justify-center gap-1.5 text-xs py-2.5"
                    >
                      <Settings size={14} /> Use in Generator
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-surface-400 text-center py-10">Click any template card to inspect parameters</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: LABEL GENERATOR & STUDIO */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "generator" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls & Record Selector */}
          <div className="card-static p-6 space-y-5 lg:col-span-1">
            <h3 className="font-bold text-surface-900 text-base flex items-center gap-2 pb-3 border-b border-surface-100">
              <Settings size={18} className="text-primary-600" /> Label Generator Setup
            </h3>

            {/* 1. Select Module */}
            <div>
              <label className="label text-xs font-bold text-surface-700">1. Target System Module</label>
              <select
                value={selectedModule}
                onChange={(e) => {
                  setSelectedModule(e.target.value);
                  setSelectedRecord(null);
                }}
                className="input-field mt-1 w-full"
              >
                {MODULES.map((m) => (
                  <option key={m} value={m}>
                    {m} Module
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Record Search & Picker */}
            <div>
              <label className="label text-xs font-bold text-surface-700">2. Select Database Record</label>
              <div className="relative mt-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                <input
                  type="text"
                  placeholder={`Search ${selectedModule}...`}
                  value={recordSearch}
                  onChange={(e) => setRecordSearch(e.target.value)}
                  className="input-field pl-9 text-xs w-full"
                />
              </div>

              <div className="mt-2 max-h-48 overflow-y-auto border border-surface-200 rounded-xl divide-y divide-surface-100 bg-surface-50/50">
                {recordsLoading ? (
                  <div className="p-4 text-center text-xs text-surface-400">Loading {selectedModule} records...</div>
                ) : records.length > 0 ? (
                  records.map((r) => (
                    <div
                      key={r.id}
                      onClick={() => {
                        setSelectedRecord(r);
                        setCustomCodeInput(r.code);
                        setGeneratedBarcode(r.code);
                      }}
                      className={`p-2.5 text-xs cursor-pointer transition-colors flex items-center justify-between ${
                        selectedRecord?.id === r.id ? "bg-primary-50 text-primary-900 font-medium" : "hover:bg-surface-100 text-surface-700"
                      }`}
                    >
                      <div>
                        <p className="font-bold text-surface-900">{r.name}</p>
                        <p className="text-[11px] text-surface-500">{r.code} • {r.subtitle}</p>
                      </div>
                      {selectedRecord?.id === r.id && <CheckCircle2 size={16} className="text-primary-600 shrink-0" />}
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-xs text-surface-400">No records found for {selectedModule}</div>
                )}
              </div>
            </div>

            {/* 3. Code Customizer */}
            <div>
              <label className="label text-xs font-bold text-surface-700">3. Barcode Value Code</label>
              <input
                type="text"
                placeholder="e.g. PROD-SKU-001"
                value={customCodeInput}
                onChange={(e) => setCustomCodeInput(e.target.value)}
                className="input-field mt-1 text-xs font-mono w-full"
              />
            </div>

            {/* 4. Select Template */}
            <div>
              <label className="label text-xs font-bold text-surface-700">4. Applied Template Format</label>
              <select
                value={selectedTemplate?.id || ""}
                onChange={(e) => {
                  const t = templates.find((tmp) => tmp.id === e.target.value);
                  if (t) setSelectedTemplate(t);
                }}
                className="input-field mt-1 text-xs w-full"
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.format})
                  </option>
                ))}
              </select>
            </div>

            <button onClick={handleGenerate} className="btn-primary w-full flex items-center justify-center gap-2 py-3">
              <RefreshCw size={16} /> Generate Barcode Label
            </button>
          </div>

          {/* Live Studio Preview & Print Card */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card-static p-6 bg-surface-50/50">
              <div className="flex items-center justify-between pb-4 border-b border-surface-200">
                <div>
                  <h3 className="font-bold text-surface-900 text-base">Live Label Preview Studio</h3>
                  <p className="text-xs text-surface-500">Vector SVG barcode label formatted for physical printing</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={downloadBarcodeSVG} className="btn-secondary flex items-center gap-1.5 text-xs py-2">
                    <Download size={14} /> Download SVG
                  </button>
                  <button
                    onClick={() => setShowPrintModal(true)}
                    className="btn-primary flex items-center gap-1.5 text-xs py-2 shadow-sm"
                  >
                    <Printer size={14} /> Print Label Sheet
                  </button>
                </div>
              </div>

              {/* Label Canvas Container */}
              <div ref={printAreaRef} className="py-12 flex items-center justify-center">
                <div className="bg-white rounded-2xl p-8 border-2 border-surface-200 shadow-xl max-w-md w-full flex flex-col items-center text-center space-y-4">
                  <div className="w-full flex items-center justify-between border-b border-surface-100 pb-2">
                    <span className="text-[10px] font-bold tracking-wider text-surface-400 uppercase">
                      MES SYSTEM • {selectedModule}
                    </span>
                    <span className="text-[10px] font-mono text-surface-400">{new Date().toLocaleDateString()}</span>
                  </div>

                  <BarcodeRenderer
                    value={generatedBarcode || selectedRecord?.code || "MES-DEMO-001"}
                    format={selectedTemplate?.format || "CODE128"}
                    width={selectedTemplate?.width || 240}
                    height={selectedTemplate?.height || 90}
                    showLabel={selectedTemplate?.showLabel ?? true}
                    showDate={selectedTemplate?.showDate ?? false}
                    module={selectedModule}
                    recordName={selectedRecord?.name}
                    className="my-2"
                  />

                  {selectedRecord && (
                    <div className="w-full text-xs text-surface-600 bg-surface-50 p-3 rounded-xl border border-surface-100 text-left space-y-1">
                      <p className="font-bold text-surface-900">{selectedRecord.name}</p>
                      <p className="text-[11px] text-surface-500">{selectedRecord.subtitle}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* TAB 3: BARCODE SCANNER & LOOKUP */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "scanner" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <div className="card-static p-6 space-y-4">
              <h3 className="font-bold text-surface-900 text-base flex items-center gap-2 pb-3 border-b border-surface-100">
                <ScanLine size={18} className="text-primary-600" /> Barcode Reader / Query
              </h3>

              <div className="p-4 bg-primary-50/60 rounded-xl border border-primary-100 text-xs text-primary-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 size={15} className="text-primary-600" /> USB HID / Handheld Ready
                </p>
                <p className="text-surface-600">Scan any barcode using your scanner hardware or enter code string manually below.</p>
              </div>

              <div>
                <label className="label text-xs font-bold text-surface-700">Scan Barcode String</label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="text"
                    placeholder="Enter or scan barcode..."
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleScanLookup();
                    }}
                    className="input-field text-sm font-mono flex-1"
                    autoFocus
                  />
                  <button onClick={() => handleScanLookup()} disabled={scanLoading} className="btn-primary">
                    {scanLoading ? "..." : "Scan"}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setIsSimulatingCamera(!isSimulatingCamera)}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-2 ${
                    isSimulatingCamera ? "bg-amber-50 text-amber-800 border-amber-300" : "bg-surface-100 text-surface-700 hover:bg-surface-200 border-surface-200"
                  }`}
                >
                  <Eye size={16} /> {isSimulatingCamera ? "Stop Camera Simulator" : "Simulate Camera Scanner"}
                </button>
              </div>

              {isSimulatingCamera && (
                <div className="p-4 bg-surface-900 text-white rounded-2xl flex flex-col items-center justify-center text-center space-y-3 relative overflow-hidden">
                  <div className="w-full h-32 border-2 border-dashed border-emerald-400/60 rounded-xl flex items-center justify-center relative">
                    <div className="w-full h-0.5 bg-emerald-500 animate-pulse absolute"></div>
                    <span className="text-xs text-emerald-400 font-mono">SCANNING VIEWPORT...</span>
                  </div>
                  <p className="text-[11px] text-surface-400">Position barcode inside camera frame</p>
                  <button
                    onClick={() => {
                      setScanInput("PROD-001");
                      handleScanLookup("PROD-001");
                    }}
                    className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700"
                  >
                    Simulate Sample Match
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Result Inspector & History */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card-static p-6">
              <h3 className="font-bold text-surface-900 text-base mb-4 pb-3 border-b border-surface-100 flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-600" /> Matched Entity Information
              </h3>

              {scanResult ? (
                scanResult.matched ? (
                  <div className="space-y-6 animate-in fade-in">
                    <div className="flex items-start justify-between bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200">
                      <div className="space-y-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 px-2 py-0.5 rounded-full bg-emerald-100">
                          {scanResult.module} Matched
                        </span>
                        <h2 className="text-xl font-bold text-surface-900 mt-1">{scanResult.name}</h2>
                        <p className="text-xs font-mono text-surface-600">Code: {scanResult.code}</p>
                      </div>
                      {scanResult.link && (
                        <a
                          href={scanResult.link}
                          className="btn-secondary text-xs flex items-center gap-1.5 py-2 px-3 hover:bg-white"
                        >
                          View Module <ExternalLink size={14} />
                        </a>
                      )}
                    </div>

                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-surface-400 mb-3">Attributes & Inventory Status</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {Object.entries(scanResult.details || {}).map(([key, val]) => (
                          <div key={key} className="p-3 bg-surface-50 rounded-xl border border-surface-100">
                            <p className="text-[11px] font-medium text-surface-400">{key}</p>
                            <p className="text-sm font-bold text-surface-900 mt-0.5">{String(val)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 bg-red-50/60 rounded-2xl border border-red-200 text-center space-y-2">
                    <AlertCircle size={36} className="mx-auto text-red-500" />
                    <h4 className="font-bold text-red-900 text-base">Barcode Not Found</h4>
                    <p className="text-xs text-red-700 max-w-md mx-auto">{scanResult.message}</p>
                  </div>
                )
              ) : (
                <div className="text-center py-16 text-surface-400">
                  <ScanLine size={44} className="mx-auto mb-3 text-surface-300" />
                  <p className="font-medium text-surface-600">No active barcode scan</p>
                  <p className="text-xs text-surface-400 mt-1">Scan or type a barcode above to query the database</p>
                </div>
              )}
            </div>

            {/* Recent Scan Audit Log */}
            {scanHistory.length > 0 && (
              <div className="card-static p-6 space-y-3">
                <h4 className="font-bold text-surface-900 text-sm">Recent Scan History</h4>
                <div className="divide-y divide-surface-100 border border-surface-200 rounded-xl overflow-hidden">
                  {scanHistory.map((item, idx) => (
                    <div key={idx} className="p-3 text-xs flex items-center justify-between hover:bg-surface-50">
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            item.matched ? "bg-emerald-500" : "bg-red-500"
                          }`}
                        />
                        <span className="font-mono font-bold text-surface-900">{item.code}</span>
                        <span className="text-surface-500">• {item.name}</span>
                      </div>
                      <span className="text-[11px] text-surface-400">{item.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* TAB 4: BATCH PRINT SHEET */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "batch" && (
        <div className="space-y-6">
          <div className="card-static p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="font-bold text-surface-900 text-base">Batch Label Sheet Generator</h3>
              <p className="text-xs text-surface-500">Generate and print multi-label grid sheets for warehouse shelf tagging</p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={batchModule}
                onChange={(e) => setBatchModule(e.target.value)}
                className="input-field text-xs"
              >
                {MODULES.map((m) => (
                  <option key={m} value={m}>
                    Module: {m}
                  </option>
                ))}
              </select>
              <button onClick={selectAllBatch} className="btn-secondary text-xs">
                {selectedBatchIds.length === batchRecords.length ? "Deselect All" : "Select All"}
              </button>
              <button
                onClick={triggerPrint}
                disabled={selectedBatchIds.length === 0}
                className="btn-primary text-xs flex items-center gap-1.5 py-2 disabled:opacity-40"
              >
                <Printer size={14} /> Print Sheet ({selectedBatchIds.length})
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {batchRecords.map((r) => {
              const isSelected = selectedBatchIds.includes(r.id);
              return (
                <div
                  key={r.id}
                  onClick={() => toggleBatchSelect(r.id)}
                  className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex flex-col items-center text-center bg-white ${
                    isSelected ? "border-primary-500 shadow-md bg-primary-50/20" : "border-surface-200 hover:border-surface-300"
                  }`}
                >
                  <BarcodeRenderer
                    value={r.code}
                    format="CODE128"
                    width={160}
                    height={60}
                    showLabel={true}
                    showDate={false}
                    className="mb-2"
                  />
                  <p className="text-xs font-bold text-surface-900 max-w-full truncate">{r.name}</p>
                  <p className="text-[10px] font-mono text-surface-500 mt-0.5">{r.code}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: ADD / EDIT TEMPLATE */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {showModal && (
        <div className="fixed inset-0 bg-surface-900/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-float w-full max-w-md p-7 animate-in scale-in duration-300 border border-white/60">
            <h3 className="text-lg font-bold text-surface-900 mb-5">
              {editTemplate ? "Edit Barcode Template" : "New Barcode Template"}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="label">Template Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Product SKU Tag"
                  className="input-field"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Target Module</label>
                  <select
                    value={form.module}
                    onChange={(e) => setForm({ ...form, module: e.target.value })}
                    className="input-field"
                  >
                    {MODULES.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Encoding Format</label>
                  <select
                    value={form.format}
                    onChange={(e) => setForm({ ...form, format: e.target.value })}
                    className="input-field"
                  >
                    {FORMATS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Width (px)</label>
                  <input
                    type="number"
                    value={form.width}
                    onChange={(e) => setForm({ ...form, width: parseInt(e.target.value) || 200 })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">Height (px)</label>
                  <input
                    type="number"
                    value={form.height}
                    onChange={(e) => setForm({ ...form, height: parseInt(e.target.value) || 100 })}
                    className="input-field"
                  />
                </div>
              </div>
              <div className="flex gap-6 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.showLabel}
                    onChange={(e) => setForm({ ...form, showLabel: e.target.checked })}
                    className="w-4 h-4 text-primary-600 rounded"
                  />
                  <span className="text-sm font-medium text-surface-700">Show Text Label</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.showDate}
                    onChange={(e) => setForm({ ...form, showDate: e.target.checked })}
                    className="w-4 h-4 text-primary-600 rounded"
                  />
                  <span className="text-sm font-medium text-surface-700">Show Date</span>
                </label>
              </div>

              <div className="bg-surface-50 rounded-xl p-4 border border-surface-200">
                <p className="text-xs text-surface-400 mb-2 font-medium text-center">Live Preview</p>
                <div className="flex items-center justify-center">
                  <BarcodeRenderer
                    value="SAMPLE-PREVIEW-123"
                    format={form.format}
                    width={form.width}
                    height={form.height}
                    showLabel={form.showLabel}
                    showDate={form.showDate}
                    module={form.module}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="btn-secondary">
                Cancel
              </button>
              <button onClick={handleSaveTemplate} disabled={!form.name} className="btn-primary disabled:opacity-40">
                {editTemplate ? "Save Changes" : "Create Template"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: PRINT LABEL MODAL */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-surface-900/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl p-6 border border-surface-200 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-surface-100">
              <h3 className="font-bold text-surface-900 text-lg flex items-center gap-2">
                <Printer className="text-primary-600" size={20} /> Print Barcode Label Preview
              </h3>
              <button onClick={() => setShowPrintModal(false)} className="text-surface-400 hover:text-surface-700">
                ✕
              </button>
            </div>

            <div className="p-6 bg-surface-50 rounded-2xl border border-surface-200 flex flex-col items-center text-center space-y-3">
              <BarcodeRenderer
                value={generatedBarcode || selectedRecord?.code || "MES-001"}
                format={selectedTemplate?.format || "CODE128"}
                width={selectedTemplate?.width || 240}
                height={selectedTemplate?.height || 90}
                showLabel={selectedTemplate?.showLabel ?? true}
                showDate={selectedTemplate?.showDate ?? false}
                module={selectedModule}
                recordName={selectedRecord?.name}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowPrintModal(false)} className="btn-secondary text-xs">
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowPrintModal(false);
                  triggerPrint();
                }}
                className="btn-primary text-xs flex items-center gap-1.5"
              >
                <Printer size={14} /> Send to Printer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
