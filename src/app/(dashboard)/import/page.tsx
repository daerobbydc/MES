"use client";

import { useState, useRef } from "react";
import {
  Upload, Download, FileSpreadsheet, CheckCircle, XCircle,
  AlertTriangle, ArrowRight, ArrowLeft, RefreshCw,
} from "lucide-react";

const IMPORT_TYPES = [
  { id: "products", name: "Products", description: "Import product catalog with SKU, pricing, and categories", icon: "📦", rows: 0 },
  { id: "customers", name: "Customers", description: "Import customer records with contact details and addresses", icon: "👥", rows: 0 },
  { id: "suppliers", name: "Suppliers", description: "Import supplier information and procurement contacts", icon: "🏭", rows: 0 },
  { id: "inventory", name: "Inventory", description: "Import stock levels, locations, and warehouse data", icon: "📊", rows: 0 },
  { id: "bom", name: "BOM", description: "Import bills of materials with components and quantities", icon: "🔧", rows: 0 },
  { id: "users", name: "Users", description: "Import user accounts with roles and permissions", icon: "👤", rows: 0 },
];

interface PreviewData {
  headers: string[];
  preview: any[];
  totalRows: number;
  validCount: number;
  errorCount: number;
  errors: { row: number; message: string; field?: string }[];
  sheetName?: string;
  imported?: boolean;
  inserted?: number;
  skipped?: number;
  insertErrors?: { row: number; message: string }[];
}

export default function ImportDataPage() {
  const [step, setStep] = useState(1);
  const [importType, setImportType] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [importResults, setImportResults] = useState<PreviewData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedType = IMPORT_TYPES.find(t => t.id === importType);

  const handleSelectType = (typeId: string) => {
    setImportType(typeId);
    setStep(2);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) validateAndSetFile(droppedFile);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) validateAndSetFile(selectedFile);
  };

  const validateAndSetFile = (f: File) => {
    const ext = f.name.split(".").pop()?.toLowerCase();
    if (ext && ["xlsx", "xls", "csv"].includes(ext)) {
      setFile(f);
    } else {
      alert("Unsupported file format. Please use .xlsx, .xls, or .csv files.");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleUploadAndPreview = async () => {
    if (!file || !importType) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/import/${importType}`, { method: "POST", body: formData });
      const json = await res.json();
      if (json.success) {
        setPreviewData(json.data);
        setStep(3);
      } else {
        alert(json.error || "Failed to parse file");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred while uploading the file");
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!file || !importType) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/import/${importType}?confirm=true`, { method: "POST", body: formData });
      const json = await res.json();
      if (json.success) {
        setImportResults(json.data);
        setStep(4);
      } else {
        alert(json.error || "Import failed");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred during import");
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadTemplate = () => {
    window.open(`/api/import/${importType}/template`, "_blank");
  };

  const handleImportMore = () => {
    setStep(1);
    setImportType("");
    setFile(null);
    setPreviewData(null);
    setImportResults(null);
  };

  const goBack = () => {
    if (step === 2) { setStep(1); setImportType(""); setFile(null); }
    if (step === 3) { setStep(2); setPreviewData(null); }
  };

  const steps = [
    { num: 1, label: "Select Type" },
    { num: 2, label: "Upload File" },
    { num: 3, label: "Preview" },
    { num: 4, label: "Results" },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 tracking-tight">Import Data</h1>
        <p className="text-surface-500 text-sm mt-0.5">Bulk import records from spreadsheet files</p>
      </div>

      {/* Steps Indicator */}
      <div className="card-static p-5 animate-in fade-in-up">
        <div className="flex items-center justify-between">
          {steps.map((s, i) => (
            <div key={s.num} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                  step > s.num ? "bg-emerald-500 text-white" :
                  step === s.num ? "bg-primary-500 text-white ring-4 ring-primary-100" :
                  "bg-surface-100 text-surface-400"
                }`}>
                  {step > s.num ? <CheckCircle size={18} /> : s.num}
                </div>
                <span className={`text-xs font-medium mt-2 whitespace-nowrap ${
                  step >= s.num ? "text-surface-900" : "text-surface-400"
                }`}>{s.label}</span>
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-3 mt-[-20px] rounded-full transition-all duration-500 ${
                  step > s.num ? "bg-emerald-400" : "bg-surface-200"
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Select Import Type */}
      {step === 1 && (
        <div className="animate-in fade-in-up" style={{ animationDelay: "0.1s" }}>
          <h2 className="text-lg font-bold text-surface-900 mb-4">Choose Import Type</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {IMPORT_TYPES.map((type, idx) => (
              <button
                key={type.id}
                onClick={() => handleSelectType(type.id)}
                className="card-static p-5 text-left hover:shadow-md hover:border-primary-300 transition-all duration-200 group animate-in fade-in-up"
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center text-xl shrink-0 group-hover:bg-primary-100 transition-colors">
                    {type.icon}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-surface-900 text-sm group-hover:text-primary-600 transition-colors">{type.name}</h3>
                    <p className="text-xs text-surface-500 mt-1 leading-relaxed">{type.description}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-surface-100">
                  <span className="text-xs text-surface-400">Supported: .xlsx, .xls, .csv</span>
                  <ArrowRight size={16} className="text-surface-300 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Upload File */}
      {step === 2 && (
        <div className="animate-in fade-in-up" style={{ animationDelay: "0.1s" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-surface-900">
              Upload <span className="text-primary-600">{selectedType?.name}</span> File
            </h2>
            <button onClick={goBack} className="btn-secondary flex items-center gap-1.5 text-sm">
              <ArrowLeft size={16} /> Back
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div
                className={`card-static p-8 border-2 border-dashed transition-all duration-200 cursor-pointer ${
                  dragOver ? "border-primary-400 bg-primary-50/50" : file ? "border-emerald-300 bg-emerald-50/30" : "border-surface-300 hover:border-primary-300 hover:bg-surface-50"
                }`}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileInput}
                  className="hidden"
                />
                <div className="flex flex-col items-center text-center">
                  {file ? (
                    <>
                      <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mb-4">
                        <FileSpreadsheet size={32} className="text-emerald-600" />
                      </div>
                      <p className="font-bold text-surface-900 text-lg">{file.name}</p>
                      <p className="text-sm text-surface-500 mt-1">{formatFileSize(file.size)}</p>
                      <p className="text-xs text-emerald-600 mt-3 font-medium">File ready for upload</p>
                      <button
                        onClick={e => { e.stopPropagation(); setFile(null); }}
                        className="mt-3 text-xs text-surface-400 hover:text-red-500 transition-colors"
                      >
                        Remove file
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 rounded-2xl bg-surface-100 flex items-center justify-center mb-4">
                        <Upload size={32} className="text-surface-400" />
                      </div>
                      <p className="font-bold text-surface-900 text-lg">Drop your file here</p>
                      <p className="text-sm text-surface-500 mt-1">or click to browse</p>
                      <p className="text-xs text-surface-400 mt-3">Supports .xlsx, .xls, .csv files</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="card-static p-5">
                <h3 className="font-bold text-surface-900 text-sm mb-3 flex items-center gap-2">
                  <Download size={16} className="text-surface-400" /> Download Template
                </h3>
                <p className="text-xs text-surface-500 mb-4 leading-relaxed">
                  Download the official template with correct column headers and sample data.
                </p>
                <button onClick={handleDownloadTemplate} className="btn-secondary w-full flex items-center justify-center gap-2">
                  <Download size={16} /> Get Template
                </button>
              </div>

              <div className="card-static p-5">
                <h3 className="font-bold text-surface-900 text-sm mb-3">Guidelines</h3>
                <ul className="space-y-2 text-xs text-surface-500">
                  <li className="flex items-start gap-2">
                    <CheckCircle size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                    Use the provided template format
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                    Ensure required fields are filled
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertTriangle size={14} className="text-amber-500 mt-0.5 shrink-0" />
                    Duplicate codes may be skipped
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertTriangle size={14} className="text-amber-500 mt-0.5 shrink-0" />
                    Date format: YYYY-MM-DD
                  </li>
                </ul>
              </div>

              <button
                onClick={handleUploadAndPreview}
                disabled={!file || uploading}
                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <ArrowRight size={16} /> Upload & Preview
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Preview & Validate */}
      {step === 3 && previewData && (
        <div className="animate-in fade-in-up" style={{ animationDelay: "0.1s" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-surface-900">Preview & Validate</h2>
            <button onClick={goBack} className="btn-secondary flex items-center gap-1.5 text-sm">
              <ArrowLeft size={16} /> Back
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Total Rows", value: previewData.totalRows, color: "text-surface-900", bg: "bg-surface-50" },
              { label: "Valid Rows", value: previewData.validCount, color: "text-emerald-600", bg: "bg-emerald-50" },
              { label: "Errors", value: previewData.errorCount, color: "text-red-600", bg: "bg-red-50" },
              { label: "Sheet", value: previewData.sheetName || "-", color: "text-surface-700", bg: "bg-surface-50" },
            ].map((s, i) => (
              <div key={i} className={`stat-card ${s.bg} animate-in fade-in-up`} style={{ animationDelay: `${i * 0.05}s` }}>
                <p className="text-xs font-bold text-surface-400 uppercase tracking-wider">{s.label}</p>
                <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Errors summary */}
          {previewData.errors.length > 0 && (
            <div className="card-static p-5 mb-6 border-l-4 border-red-400 animate-in fade-in-up">
              <h3 className="font-bold text-red-700 text-sm mb-3 flex items-center gap-2">
                <XCircle size={16} /> Validation Errors ({previewData.errors.length})
              </h3>
              <div className="max-h-40 overflow-y-auto space-y-1.5">
                {previewData.errors.slice(0, 20).map((err, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <span className="font-mono font-bold text-red-600 shrink-0">Row {err.row}:</span>
                    <span className="text-surface-600">{err.message}</span>
                  </div>
                ))}
                {previewData.errors.length > 20 && (
                  <p className="text-xs text-surface-400 mt-2">...and {previewData.errors.length - 20} more errors</p>
                )}
              </div>
            </div>
          )}

          {/* Preview Table */}
          <div className="card-static overflow-hidden mb-6 animate-in fade-in-up" style={{ animationDelay: "0.15s" }}>
            <div className="px-5 py-3 bg-surface-50 border-b border-surface-100">
              <p className="text-xs font-bold text-surface-500 uppercase tracking-wider">
                Preview (first {previewData.preview.length} rows)
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="table-header">
                    <th className="px-4 py-3 text-center text-xs w-12">#</th>
                    <th className="px-4 py-3 text-center text-xs w-16">Status</th>
                    {previewData.headers.map((h, i) => (
                      <th key={i} className="px-4 py-3 text-left text-xs">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.preview.map((row, idx) => {
                    const rowErrors = previewData.errors.filter(e => e.row === idx + 1);
                    const hasError = rowErrors.length > 0;
                    return (
                      <tr
                        key={idx}
                        className={`border-b border-surface-100/50 transition-colors ${
                          hasError ? "bg-red-50/60 hover:bg-red-50" : "bg-emerald-50/30 hover:bg-emerald-50/60"
                        } animate-in fade-in`}
                        style={{ animationDelay: `${idx * 0.02}s` }}
                      >
                        <td className="px-4 py-3 text-xs text-surface-400 text-center font-mono">{idx + 1}</td>
                        <td className="px-4 py-3 text-center">
                          {hasError ? (
                            <XCircle size={16} className="text-red-500 mx-auto" />
                          ) : (
                            <CheckCircle size={16} className="text-emerald-500 mx-auto" />
                          )}
                        </td>
                        {previewData.headers.map((h, ci) => (
                          <td key={ci} className="px-4 py-3 text-xs text-surface-700 max-w-[180px] truncate">
                            {row[h] ?? row[ci] ?? "-"}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button onClick={goBack} className="btn-secondary flex items-center gap-2">
              <ArrowLeft size={16} /> Change File
            </button>
            <button
              onClick={handleConfirmImport}
              disabled={previewData.validCount === 0 || uploading}
              className="btn-primary flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Importing...
                </>
              ) : (
                <>
                  <CheckCircle size={16} /> Import {previewData.validCount} Records
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Import Results */}
      {step === 4 && importResults && (
        <div className="animate-in fade-in-up" style={{ animationDelay: "0.1s" }}>
          <h2 className="text-lg font-bold text-surface-900 mb-4">Import Results</h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Imported", value: importResults.inserted ?? 0, color: "text-emerald-600", bg: "bg-emerald-50" },
              { label: "Skipped", value: importResults.skipped ?? 0, color: "text-amber-600", bg: "bg-amber-50" },
              { label: "Errors", value: importResults.insertErrors?.length ?? 0, color: "text-red-600", bg: "bg-red-50" },
              { label: "Total", value: importResults.totalRows, color: "text-surface-900", bg: "bg-surface-50" },
            ].map((s, i) => (
              <div key={i} className={`stat-card ${s.bg} animate-in fade-in-up`} style={{ animationDelay: `${i * 0.05}s` }}>
                <p className="text-xs font-bold text-surface-400 uppercase tracking-wider">{s.label}</p>
                <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Success message */}
          {(importResults.inserted ?? 0) > 0 && (
            <div className="card-static p-6 mb-6 border-l-4 border-emerald-400 animate-in fade-in-up">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center">
                  <CheckCircle size={24} className="text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-bold text-emerald-800">Import Successful</h3>
                  <p className="text-sm text-emerald-600 mt-0.5">
                    {importResults.inserted} record{importResults.inserted !== 1 ? "s" : ""} imported successfully
                    {(importResults.skipped ?? 0) > 0 && `, ${importResults.skipped} skipped`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Insert Errors */}
          {(importResults.insertErrors?.length ?? 0) > 0 && (
            <div className="card-static p-5 mb-6 border-l-4 border-red-400 animate-in fade-in-up">
              <h3 className="font-bold text-red-700 text-sm mb-3 flex items-center gap-2">
                <XCircle size={16} /> Import Errors ({importResults.insertErrors!.length})
              </h3>
              <div className="max-h-40 overflow-y-auto space-y-1.5">
                {importResults.insertErrors!.slice(0, 20).map((err, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <span className="font-mono font-bold text-red-600 shrink-0">Row {err.row}:</span>
                    <span className="text-surface-600">{err.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Imported Data Preview */}
          {importResults.preview.length > 0 && (
            <div className="card-static overflow-hidden mb-6 animate-in fade-in-up" style={{ animationDelay: "0.15s" }}>
              <div className="px-5 py-3 bg-surface-50 border-b border-surface-100">
                <p className="text-xs font-bold text-surface-500 uppercase tracking-wider">
                  Imported Records (sample)
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="table-header">
                      {importResults.headers.map((h, i) => (
                        <th key={i} className="px-4 py-3 text-left text-xs">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {importResults.preview.map((row, idx) => (
                      <tr key={idx} className="border-b border-surface-100/50 hover:bg-surface-50/60 transition-colors">
                        {importResults.headers.map((h, ci) => (
                          <td key={ci} className="px-4 py-3 text-xs text-surface-700 max-w-[180px] truncate">
                            {row[h] ?? row[ci] ?? "-"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-center">
            <button
              onClick={handleImportMore}
              className="btn-primary flex items-center gap-2"
            >
              <RefreshCw size={16} /> Import More
            </button>
          </div>
        </div>
      )}
    </div>
  );
}