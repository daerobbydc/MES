"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Users, TrendingUp, TrendingDown, Minus, Award, RefreshCw,
  Star, Clock, CheckCircle2, BarChart3, ChevronUp, ChevronDown
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from "recharts";

interface Scorecard {
  id: string;
  name: string;
  email: string;
  department: string;
  totalShifts: number;
  attendedShifts: number;
  attendanceRate: number;
  punctualityRate: number;
  totalOutput: number;
  qualityRate: number;
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  trend: "UP" | "STABLE" | "DOWN";
}

interface Summary {
  totalOperators: number;
  avgScore: number;
  topPerformer: string;
  gradeDistribution: Record<string, number>;
}

const GRADE_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  A: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  B: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  C: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  D: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  F: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
};

export default function ScorecardPage() {
  const [scorecards, setScorecards] = useState<Scorecard[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("month");
  const [sortBy, setSortBy] = useState<"score" | "attendance" | "output">("score");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/shifts/scorecard?range=${range}`);
      const json = await res.json();
      if (json.success) {
        setScorecards(json.data.scorecards || []);
        setSummary(json.data.summary);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [range]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const sorted = [...scorecards].sort((a, b) => {
    if (sortBy === "score") return b.score - a.score;
    if (sortBy === "attendance") return b.attendanceRate - a.attendanceRate;
    return b.totalOutput - a.totalOutput;
  });

  const gradeData = summary ? Object.entries(summary.gradeDistribution).map(([grade, count]) => ({ grade, count })) : [];
  const topChartData = sorted.slice(0, 8).map(s => ({ name: s.name.split(" ")[0], score: s.score }));

  const initials = (name: string) => {
    const words = name.split(" ");
    return words.length >= 2 ? `${words[0][0]}${words[1][0]}` : name.slice(0, 2);
  };

  const gradeBg = ["#10b981", "#3b82f6", "#f59e0b", "#f97316", "#f43f5e"];

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Operator Performance Scorecard</h1>
          <p className="page-subtitle">Operator KPI & performance evaluation — attendance, productivity & quality</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={range} onChange={e => setRange(e.target.value)} className="select text-xs w-auto">
            <option value="week">7 Days</option>
            <option value="month">30 Days</option>
            <option value="quarter">3 Months</option>
          </select>
          <button onClick={fetchData} className="btn-secondary text-xs flex items-center gap-2">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card-gradient">
            <p className="text-xs font-bold text-primary-200 uppercase tracking-widest">Avg Score</p>
            <p className="text-3xl font-black text-white mt-1">{summary.avgScore}<span className="text-lg">/100</span></p>
            <p className="text-xs text-primary-100 mt-2">Fleet Average</p>
          </div>
          <div className="stat-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="stat-label">Total Operators</p>
                <p className="stat-value">{summary.totalOperators}</p>
                <p className="text-xs text-surface-400 mt-0.5">Active in system</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                <Users size={20} className="text-primary-500" />
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="stat-label">Top Performer</p>
                <p className="text-base font-bold text-surface-900 mt-1 truncate max-w-[130px]">{summary.topPerformer}</p>
                <p className="text-xs text-emerald-500 font-semibold mt-0.5 flex items-center gap-1"><Star size={10} /> Grade A</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                <Award size={20} className="text-amber-500" />
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="stat-label">Grade A Operators</p>
                <p className="stat-value text-emerald-600">{summary.gradeDistribution.A || 0}</p>
                <p className="text-xs text-surface-400 mt-0.5">Score ≥ 90</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 size={20} className="text-emerald-500" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Score Chart */}
        <div className="chart-card lg:col-span-2">
          <div className="chart-card-header">
            <div>
              <h3 className="chart-card-title">Performance Score per Operator</h3>
              <p className="text-xs text-surface-400">Top 8 operators by overall performance score</p>
            </div>
            <BarChart3 size={18} className="text-surface-400" />
          </div>
          {topChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: any) => [`${v}`, "Score"]} contentStyle={{ borderRadius: "10px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", fontSize: "12px" }} />
                <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                  {topChartData.map((entry, i) => (
                    <Cell key={i} fill={entry.score >= 90 ? "#10b981" : entry.score >= 80 ? "#3b82f6" : entry.score >= 70 ? "#f59e0b" : "#f43f5e"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-surface-400 text-sm">No operator data available</div>
          )}
        </div>

        {/* Grade Distribution */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <h3 className="chart-card-title">Grade Distribution</h3>
              <p className="text-xs text-surface-400">Breakdown of grades A–F</p>
            </div>
          </div>
          {gradeData.some(g => g.count > 0) ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={gradeData} dataKey="count" nameKey="grade" cx="50%" cy="50%" outerRadius={70} label={({ grade, count }) => count > 0 ? `${grade}: ${count}` : ""} labelLine={false} fontSize={11}>
                  {gradeData.map((entry, i) => (
                    <Cell key={i} fill={gradeBg[i]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center text-surface-400 text-sm">No data available</div>
          )}
        </div>
      </div>

      {/* Sort Controls */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-surface-500 font-semibold">Sort By:</span>
        {(["score", "attendance", "output"] as const).map(key => (
          <button key={key} onClick={() => setSortBy(key)} className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${sortBy === key ? "bg-primary-500 text-white shadow-sm" : "bg-surface-100 text-surface-600 hover:bg-surface-200"}`}>
            {key === "score" ? "Overall Score" : key === "attendance" ? "Attendance" : "Output Qty"}
          </button>
        ))}
      </div>

      {/* Scorecard Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-surface-400">
          <Users size={36} className="mb-3 opacity-40" />
          <p className="font-semibold text-sm">No operator data available</p>
          <p className="text-xs mt-1">Data will appear once operators complete their shift logs</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map((op, rank) => {
            const gs = GRADE_STYLE[op.grade];
            return (
              <div key={op.id} className="card-static hover:shadow-float transition-all duration-300 hover:-translate-y-0.5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm text-white`}
                      style={{ background: `linear-gradient(135deg, ${op.score >= 90 ? "#10b981, #059669" : op.score >= 80 ? "#3b82f6, #2563eb" : op.score >= 70 ? "#f59e0b, #d97706" : "#f43f5e, #e11d48"})` }}>
                      {initials(op.name).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-surface-900 text-sm">{op.name}</p>
                      <p className="text-[11px] text-surface-400">{op.department}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`px-2.5 py-0.5 rounded-xl text-xs font-black border ${gs.bg} ${gs.text} ${gs.border}`}>
                      Grade {op.grade}
                    </span>
                    {op.trend === "UP" && <ChevronUp size={14} className="text-emerald-500" />}
                    {op.trend === "DOWN" && <ChevronDown size={14} className="text-rose-500" />}
                    {op.trend === "STABLE" && <Minus size={14} className="text-surface-400" />}
                  </div>
                </div>

                {/* Score progress */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-surface-500">Overall Score</span>
                    <span className="text-lg font-black text-surface-900">{op.score}</span>
                  </div>
                  <div className="h-2.5 bg-surface-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${op.score}%`, background: `linear-gradient(90deg, ${op.score >= 90 ? "#10b981, #059669" : op.score >= 80 ? "#3b82f6, #2563eb" : op.score >= 70 ? "#f59e0b, #d97706" : "#f43f5e, #e11d48"})` }} />
                  </div>
                </div>

                {/* KPI Grid */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2 bg-surface-50 rounded-xl text-center">
                    <p className="text-[11px] text-surface-400 font-medium">Attendance</p>
                    <p className="text-sm font-bold text-surface-900">{op.attendanceRate}%</p>
                  </div>
                  <div className="p-2 bg-surface-50 rounded-xl text-center">
                    <p className="text-[11px] text-surface-400 font-medium">Punctuality</p>
                    <p className="text-sm font-bold text-surface-900">{op.punctualityRate}%</p>
                  </div>
                  <div className="p-2 bg-surface-50 rounded-xl text-center">
                    <p className="text-[11px] text-surface-400 font-medium">Quality</p>
                    <p className="text-sm font-bold text-surface-900">{op.qualityRate}%</p>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-surface-100 flex items-center justify-between text-xs text-surface-400">
                  <span>{op.attendedShifts}/{op.totalShifts} shifts</span>
                  <span className="font-semibold">Output: {op.totalOutput.toLocaleString()} pcs</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
