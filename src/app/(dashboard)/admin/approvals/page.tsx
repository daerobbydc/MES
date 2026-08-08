"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Filter,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  User,
  MessageSquare,
  AlertCircle,
  X,
} from "lucide-react";

type Approval = {
  id: string;
  type: string;
  recordId: string;
  requesterName: string;
  status: string;
  createdAt: string;
  notes?: string;
};

export default function ApprovalQueuePage() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [actionTarget, setActionTarget] = useState<Approval | null>(null);
  const [actionType, setActionType] = useState<"APPROVE" | "REJECT" | null>(null);
  const [actionNotes, setActionNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchApprovals();
  }, []);

  const fetchApprovals = async () => {
    try {
      const res = await fetch("/api/approvals");
      const json = await res.json();
      if (json.success) setApprovals(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const openAction = (approval: Approval, type: "APPROVE" | "REJECT") => {
    setActionTarget(approval);
    setActionType(type);
    setActionNotes("");
  };

  const submitAction = async () => {
    if (!actionTarget || !actionType) return;
    if (actionType === "REJECT" && !actionNotes.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/approvals/${actionTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: actionType === "APPROVE" ? "APPROVED" : "REJECTED",
          notes: actionNotes,
        }),
      });
      if (res.ok) fetchApprovals();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
      setActionTarget(null);
      setActionType(null);
    }
  };

  const pending = approvals.filter((a) => a.status === "PENDING");
  const approvedToday = approvals.filter((a) => {
    if (a.status !== "APPROVED") return false;
    const d = new Date(a.createdAt);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });
  const rejectedToday = approvals.filter((a) => {
    if (a.status !== "REJECTED") return false;
    const d = new Date(a.createdAt);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const totalThisWeek = approvals.filter(
    (a) => new Date(a.createdAt) >= weekAgo
  ).length;

  const filtered =
    filter === "ALL"
      ? approvals
      : approvals.filter((a) => a.status === filter);

  const stats = [
    {
      label: "Pending Approvals",
      value: pending.length,
      color: "text-amber-600",
      bg: "bg-amber-50",
      iconText: "text-amber-600",
      icon: Clock,
    },
    {
      label: "Approved Today",
      value: approvedToday.length,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      iconText: "text-emerald-600",
      icon: CheckCircle2,
    },
    {
      label: "Rejected Today",
      value: rejectedToday.length,
      color: "text-rose-600",
      bg: "bg-rose-50",
      iconText: "text-rose-600",
      icon: XCircle,
    },
    {
      label: "Total This Week",
      value: totalThisWeek,
      color: "text-primary-600",
      bg: "bg-primary-50",
      iconText: "text-primary-600",
      icon: Calendar,
    },
  ];

  const filters = [
    { key: "ALL", label: "All Requests", count: approvals.length },
    { key: "PENDING", label: "Pending", count: pending.length },
    { key: "APPROVED", label: "Approved", count: approvals.filter((a) => a.status === "APPROVED").length },
    { key: "REJECTED", label: "Rejected", count: approvals.filter((a) => a.status === "REJECTED").length },
  ];

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-primary-200 border-t-primary-500 rounded-full animate-spin"></div>
          <p className="text-sm text-surface-500 font-medium">
            Loading approval queue...
          </p>
        </div>
      </div>
    );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <ShieldCheck size={22} className="text-primary-500" />
            Approval Queue
          </h1>
          <p className="page-subtitle">
            Review, verify, and process pending authorization requests across modules
          </p>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div
            key={i}
            className="stat-card flex items-center justify-between animate-in fade-in-up"
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <div>
              <p className="text-xs font-bold text-surface-400 uppercase tracking-wider">
                {s.label}
              </p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>
                {s.value}
              </p>
            </div>
            <div
              className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}
            >
              <s.icon size={20} className={s.iconText} />
            </div>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <Filter size={16} className="text-surface-400 mr-1 flex-shrink-0" />
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-2 flex-shrink-0 ${
              filter === f.key ? "tab-active" : "tab-inactive"
            }`}
          >
            {f.label}
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                filter === f.key
                  ? "bg-primary-600 text-white"
                  : "bg-surface-200 text-surface-600"
              }`}
            >
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {/* Approval List */}
      <div className="space-y-3">
        {filtered.map((a, idx) => (
          <div
            key={a.id}
            className="card-static p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in-up hover:border-surface-300/80 transition-all duration-200"
            style={{ animationDelay: `${idx * 0.03}s` }}
          >
            <div className="flex items-start sm:items-center gap-4">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                  a.status === "APPROVED"
                    ? "bg-emerald-50 text-emerald-600"
                    : a.status === "REJECTED"
                    ? "bg-rose-50 text-rose-600"
                    : "bg-primary-50 text-primary-600"
                }`}
              >
                <FileText size={20} />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-surface-100 text-surface-700 tracking-wide">
                    {a.type}
                  </span>
                  <span className="text-sm font-mono font-bold text-primary-600">
                    {a.recordId}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-surface-500 mt-1.5 flex-wrap">
                  <span className="flex items-center gap-1 font-medium text-surface-700">
                    <User size={13} className="text-surface-400" />
                    {a.requesterName}
                  </span>
                  <span className="text-surface-300">·</span>
                  <span className="flex items-center gap-1">
                    <Clock size={13} className="text-surface-400" />
                    {new Date(a.createdAt).toLocaleString("id-ID", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </div>

                {a.notes && (
                  <p className="text-xs text-surface-500 bg-surface-50 rounded-lg px-3 py-1.5 mt-2 flex items-center gap-1.5 border border-surface-100">
                    <MessageSquare size={12} className="text-surface-400 flex-shrink-0" />
                    <span className="italic">"{a.notes}"</span>
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-center">
              <span
                className={`status-badge ${
                  a.status === "APPROVED"
                    ? "status-done"
                    : a.status === "REJECTED"
                    ? "status-error"
                    : a.status === "PENDING"
                    ? "status-idle"
                    : "status-planned"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                {a.status}
              </span>

              {a.status === "PENDING" && (
                <div className="flex items-center gap-2 ml-2">
                  <button
                    onClick={() => openAction(a, "APPROVE")}
                    className="btn-primary text-xs flex items-center gap-1.5 !py-2 !px-3.5"
                  >
                    <CheckCircle size={14} /> Approve
                  </button>
                  <button
                    onClick={() => openAction(a, "REJECT")}
                    className="btn-secondary text-xs flex items-center gap-1.5 !py-2 !px-3.5 text-rose-600 hover:bg-rose-50 hover:border-rose-200"
                  >
                    <XCircle size={14} /> Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="card-static p-16 text-center animate-in fade-in">
            <Clock size={44} className="mx-auto mb-3 text-surface-300" />
            <p className="font-medium text-surface-600">No approval requests found</p>
            <p className="text-sm text-surface-400 mt-1">
              No items match the selected filter criteria
            </p>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {actionTarget && actionType && (
        <div className="fixed inset-0 bg-surface-900/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in scale-in duration-200 border border-surface-200">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                {actionType === "APPROVE" ? (
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-50 text-emerald-600 flex-shrink-0">
                    <CheckCircle size={20} />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-rose-50 text-rose-600 flex-shrink-0">
                    <XCircle size={20} />
                  </div>
                )}
                <div>
                  <h3 className="text-base font-bold text-surface-900">
                    {actionType === "APPROVE" ? "Approve Request" : "Reject Request"}
                  </h3>
                  <p className="text-xs text-surface-500">
                    {actionTarget.type} · {actionTarget.recordId}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setActionTarget(null);
                  setActionType(null);
                }}
                className="p-1 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-surface-50 rounded-xl p-3.5 border border-surface-100">
                <p className="text-xs text-surface-400 uppercase font-bold tracking-wider">Requester</p>
                <p className="text-sm font-semibold text-surface-800 mt-0.5">
                  {actionTarget.requesterName}
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-surface-700 uppercase tracking-wider block mb-1.5">
                  {actionType === "REJECT" ? "Reason for Rejection *" : "Notes (Optional)"}
                </label>
                <textarea
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  className="input-field w-full text-sm"
                  rows={3}
                  placeholder={
                    actionType === "REJECT"
                      ? "Provide a clear reason for rejecting this request..."
                      : "Add optional notes or instructions..."
                  }
                  required={actionType === "REJECT"}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 mt-6">
              <button
                onClick={() => {
                  setActionTarget(null);
                  setActionType(null);
                }}
                className="btn-secondary text-xs"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={submitAction}
                className={`text-xs ${
                  actionType === "APPROVE"
                    ? "btn-primary"
                    : "px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 transition-all shadow-sm"
                }`}
                disabled={
                  submitting ||
                  (actionType === "REJECT" && !actionNotes.trim())
                }
              >
                {submitting
                  ? "Processing..."
                  : actionType === "APPROVE"
                  ? "Confirm Approval"
                  : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
