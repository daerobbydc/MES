"use client";

import { useEffect, useState } from "react";
import {
  BarChart3, TrendingUp, TrendingDown, CheckCircle, XCircle, AlertTriangle,
  Download, Filter, FileText,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, PieChart, Pie, Cell,
} from "recharts";

export default function QualityReportsPage() {
  const [inspections, setInspections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("30");
  const [tab, setTab] = useState<"summary" | "defects" | "trends">("summary");

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/quality/inspections");
      const json = await res.json();
      if (json.success) setInspections(json.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const totalInspections = inspections.length;
  const passed = inspections.filter(i => i.status === "PASSED").length;
  const failed = inspections.filter(i => i.status === "FAILED").length;
  const pending = inspections.filter(i => i.status === "PENDING").length;
  const passRate = totalInspections > 0 ? (passed / totalInspections) * 100 : 0;

  const defectData = inspections
    .filter(i => i.status === "FAILED")
    .reduce((acc: any[], i) => {
      const details = i.defectDetails as any;
      const defectType = details?.type || details?.defectType || "Unknown";
      const existing = acc.find(a => a.type === defectType);
      if (existing) existing.count++;
      else acc.push({ type: defectType, count: 1 });
      return acc;
    }, [])
    .sort((a: any, b: any) => b.count - a.count);

  const trendData = (() => {
    const byDate: Record<string, { date: string; passed: number; failed: number; total: number }> = {};
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - parseInt(dateRange));
    inspections
      .filter(i => new Date(i.inspectedAt || i.createdAt) >= cutoff)
      .forEach(i => {
        const date = new Date(i.inspectedAt || i.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
        if (!byDate[date]) byDate[date] = { date, passed: 0, failed: 0, total: 0 };
        byDate[date].total++;
        if (i.status === "PASSED") byDate[date].passed++;
        else if (i.status === "FAILED") byDate[date].failed++;
      });
    return Object.values(byDate).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  })();

  const COLORS = ["#10B981", "#EF4444", "#F59E0B", "#3B82F6", "#8B5CF6", "#EC4899", "#06B6D4"];

  const recentFailed = inspections
    .filter(i => i.status === "FAILED")
    .slice(0, 10);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quality Reports</h1>
          <p className="text-gray-500 text-sm">Quality inspection analytics and defect tracking</p>
        </div>
        <div className="flex gap-2">
          <select value={dateRange} onChange={e => setDateRange(e.target.value)} className="input-field text-sm">
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
          <button className="btn-secondary flex items-center gap-2 text-sm">
            <Download size={16} /> Export
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-5 gap-4">
        <div className="card">
          <p className="text-sm text-gray-500">Total Inspections</p>
          <p className="text-2xl font-bold">{totalInspections}</p>
        </div>
        <div className="card border-l-4 border-l-green-500">
          <p className="text-sm text-gray-500">Passed</p>
          <p className="text-2xl font-bold text-green-600">{passed}</p>
        </div>
        <div className="card border-l-4 border-l-red-500">
          <p className="text-sm text-gray-500">Failed</p>
          <p className="text-2xl font-bold text-red-600">{failed}</p>
        </div>
        <div className="card border-l-4 border-l-yellow-500">
          <p className="text-sm text-gray-500">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">{pending}</p>
        </div>
        <div className="card border-l-4 border-l-blue-500">
          <p className="text-sm text-gray-500">Pass Rate</p>
          <p className={`text-2xl font-bold ${passRate >= 95 ? "text-green-600" : passRate >= 85 ? "text-yellow-600" : "text-red-600"}`}>
            {passRate.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2">
        {(["summary", "defects", "trends"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${tab === t ? "bg-primary-100 text-primary-700" : "bg-gray-100 text-gray-600"}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Summary Tab */}
      {tab === "summary" && (
        <div className="grid grid-cols-2 gap-6">
          <div className="card">
            <h3 className="font-semibold mb-4">Pass/Fail Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={[
                  { name: "Passed", value: passed },
                  { name: "Failed", value: failed },
                  { name: "Pending", value: pending },
                ]} cx="50%" cy="50%" outerRadius={100} dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  <Cell fill="#10B981" /><Cell fill="#EF4444" /><Cell fill="#F59E0B" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="card">
            <h3 className="font-semibold mb-4">Quality by Inspector</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={inspections.reduce((acc: any[], i) => {
                const name = i.inspector?.name || "Unknown";
                const existing = acc.find(a => a.name === name);
                if (existing) {
                  existing.total++;
                  if (i.status === "PASSED") existing.passed++;
                } else {
                  acc.push({ name, total: 1, passed: i.status === "PASSED" ? 1 : 0 });
                }
                return acc;
              }, []).map(a => ({ ...a, passRate: a.total > 0 ? (a.passed / a.total) * 100 : 0 }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
                <Bar dataKey="passRate" fill="#3B82F6" name="Pass Rate %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Defects Tab */}
      {tab === "defects" && (
        <div className="space-y-6">
          <div className="card">
            <h3 className="font-semibold mb-4">Top Defect Types</h3>
            {defectData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={defectData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#EF4444" name="Count" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-gray-500">No failed inspections - great!</div>
            )}
          </div>

          <div className="card">
            <h3 className="font-semibold mb-4">Recent Failed Inspections</h3>
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 text-sm font-medium text-gray-500">Inspection #</th>
                  <th className="text-left p-3 text-sm font-medium text-gray-500">Product</th>
                  <th className="text-left p-3 text-sm font-medium text-gray-500">Defect Type</th>
                  <th className="text-left p-3 text-sm font-medium text-gray-500">Inspector</th>
                  <th className="text-left p-3 text-sm font-medium text-gray-500">Date</th>
                  <th className="text-left p-3 text-sm font-medium text-gray-500">Notes</th>
                </tr>
              </thead>
              <tbody>
                {recentFailed.map((insp: any) => (
                  <tr key={insp.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-mono text-sm">{insp.inspectionNumber}</td>
                    <td className="p-3">{insp.order?.product?.name || "-"}</td>
                    <td className="p-3"><span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-sm">{(insp.defectDetails as any)?.type || (insp.defectDetails as any)?.defectType || "N/A"}</span></td>
                    <td className="p-3 text-sm text-gray-600">{insp.inspector?.name || "-"}</td>
                    <td className="p-3 text-sm text-gray-600">{new Date(insp.inspectedAt || insp.createdAt).toLocaleDateString()}</td>
                    <td className="p-3 text-sm text-gray-500 max-w-[200px] truncate">{insp.notes || "-"}</td>
                  </tr>
                ))}
                {recentFailed.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-8 text-gray-500">No failed inspections</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Trends Tab */}
      {tab === "trends" && (
        <div className="card">
          <h3 className="font-semibold mb-4">Quality Trend (Last {dateRange} Days)</h3>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="passed" stroke="#10B981" name="Passed" strokeWidth={2} />
              <Line type="monotone" dataKey="failed" stroke="#EF4444" name="Failed" strokeWidth={2} />
              <Line type="monotone" dataKey="total" stroke="#3B82F6" name="Total" strokeWidth={2} strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
