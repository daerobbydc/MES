"use client";

import { useEffect, useState } from "react";
import {
  Wrench, Calendar, AlertTriangle, CheckCircle, Clock, Plus, Filter, Play, Pause,
} from "lucide-react";

export default function MaintenancePage() {
  const [tab, setTab] = useState<"schedules" | "tasks">("schedules");
  const [schedules, setSchedules] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [machines, setMachines] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(true);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [savingTask, setSavingTask] = useState(false);
  const [scheduleError, setScheduleError] = useState("");
  const [taskError, setTaskError] = useState("");
  const [scheduleForm, setScheduleForm] = useState({
    machineId: "", type: "PREVENTIVE", intervalDays: "", nextDueDate: "", priority: "MEDIUM", notes: "",
  });
  const [taskForm, setTaskForm] = useState({
    machineId: "", type: "CORRECTIVE", title: "", description: "", assignedTo: "", dueDate: "",
  });

  useEffect(() => { fetchAll(); loadDropdowns(); }, []);

  const fetchAll = async () => {
    try {
      const [sRes, tRes, dRes] = await Promise.all([
        fetch("/api/maintenance/schedules"),
        fetch("/api/maintenance/tasks"),
        fetch("/api/maintenance/dashboard"),
      ]);
      const sJson = await sRes.json();
      const tJson = await tRes.json();
      const dJson = await dRes.json();
      if (sJson.success) setSchedules(sJson.data);
      if (tJson.success) setTasks(tJson.data);
      if (dJson.success) setDashboard(dJson.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const loadDropdowns = async () => {
    try {
      const [mRes, uRes] = await Promise.all([
        fetch("/api/machine?limit=100"),
        fetch("/api/users?limit=1000"),
      ]);
      const mJson = await mRes.json();
      const uJson = await uRes.json();
      if (mJson.success) setMachines(mJson.data);
      if (uJson.success) setUsers(uJson.data);
    } catch (e) { console.error(e); } finally { setLoadingDropdowns(false); }
  };

  const stats = [
    { label: "Overdue", value: dashboard.overdue ?? 0, color: "text-red-600", bg: "bg-red-50", icon: AlertTriangle },
    { label: "Due This Week", value: dashboard.dueThisWeek ?? 0, color: "text-amber-600", bg: "bg-amber-50", icon: Clock },
    { label: "Completed", value: dashboard.completed ?? 0, color: "text-emerald-600", bg: "bg-emerald-50", icon: CheckCircle },
    { label: "Total Cost", value: `Rp ${(dashboard.totalCost ?? 0).toLocaleString()}`, color: "text-surface-900", bg: "bg-surface-50", icon: Wrench },
  ];

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      PENDING: "bg-surface-100 text-surface-600",
      IN_PROGRESS: "bg-blue-100 text-blue-700",
      COMPLETED: "bg-emerald-100 text-emerald-700",
      OVERDUE: "bg-red-100 text-red-700",
      CANCELLED: "bg-surface-100 text-surface-500",
    };
    return map[s] || "bg-surface-100 text-surface-600";
  };

  const priorityBadge = (p: string) => {
    const map: Record<string, string> = {
      LOW: "bg-surface-100 text-surface-600",
      MEDIUM: "bg-amber-100 text-amber-700",
      HIGH: "bg-orange-100 text-orange-700",
      CRITICAL: "bg-red-100 text-red-700",
    };
    return map[p] || "bg-surface-100 text-surface-600";
  };

  const handleCreateSchedule = async () => {
    if (!scheduleForm.machineId) { setScheduleError("Machine is required."); return; }
    if (!scheduleForm.type) { setScheduleError("Type is required."); return; }
    if (!scheduleForm.nextDueDate) { setScheduleError("Next Due Date is required."); return; }
    setScheduleError("");
    setSavingSchedule(true);
    try {
      const res = await fetch("/api/maintenance/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...scheduleForm,
          intervalDays: Number(scheduleForm.intervalDays) || undefined,
        }),
      });
      const json = await res.json();
      if (!json.success) { setScheduleError(json.error || "Failed to create schedule."); return; }
      setShowScheduleModal(false);
      setScheduleForm({ machineId: "", type: "PREVENTIVE", intervalDays: "", nextDueDate: "", priority: "MEDIUM", notes: "" });
      fetchAll();
    } catch (e) { console.error(e); setScheduleError("An unexpected error occurred."); } finally { setSavingSchedule(false); }
  };

  const handleCreateTask = async () => {
    if (!taskForm.machineId) { setTaskError("Machine is required."); return; }
    if (!taskForm.title) { setTaskError("Title is required."); return; }
    if (!taskForm.assignedTo) { setTaskError("Assigned To is required."); return; }
    if (!taskForm.dueDate) { setTaskError("Due Date is required."); return; }
    setTaskError("");
    setSavingTask(true);
    try {
      const res = await fetch("/api/maintenance/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskForm),
      });
      const json = await res.json();
      if (!json.success) { setTaskError(json.error || "Failed to create task."); return; }
      setShowTaskModal(false);
      setTaskForm({ machineId: "", type: "CORRECTIVE", title: "", description: "", assignedTo: "", dueDate: "" });
      fetchAll();
    } catch (e) { console.error(e); setTaskError("An unexpected error occurred."); } finally { setSavingTask(false); }
  };

  const handleUpdateTaskStatus = async (taskId: string, status: string) => {
    try {
      await fetch(`/api/maintenance/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      fetchAll();
    } catch (e) { console.error(e); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-3 border-primary-200 border-t-primary-500 rounded-full animate-spin"></div>
        <p className="text-sm text-surface-500 font-medium">Loading maintenance data...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 tracking-tight">Maintenance</h1>
          <p className="text-surface-500 text-sm mt-0.5">Schedule and track maintenance activities</p>
        </div>
        <button
          onClick={() => tab === "schedules" ? setShowScheduleModal(true) : setShowTaskModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} /> {tab === "schedules" ? "Add Schedule" : "Add Task"}
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div key={i} className="stat-card animate-in fade-in-up" style={{ animationDelay: `${i * 0.05}s` }}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                <s.icon size={20} className={s.color} />
              </div>
              <div>
                <p className="text-xs font-bold text-surface-400 uppercase tracking-wider">{s.label}</p>
                <p className={`text-2xl font-bold mt-0.5 ${s.color}`}>{s.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-1 bg-surface-100 rounded-xl p-1 w-fit">
        {(["schedules", "tasks"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === t ? "bg-white text-surface-900 shadow-sm" : "text-surface-500 hover:text-surface-700"
            }`}
          >
            {t === "schedules" ? "Schedules" : "Tasks"}
          </button>
        ))}
      </div>

      {tab === "schedules" && (
        <div className="card-static overflow-hidden animate-in fade-in-up" style={{ animationDelay: "0.15s" }}>
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="px-5 py-3.5 text-left">Machine</th>
                <th className="px-5 py-3.5 text-left">Type</th>
                <th className="px-5 py-3.5 text-left">Interval</th>
                <th className="px-5 py-3.5 text-left">Next Due</th>
                <th className="px-5 py-3.5 text-center">Priority</th>
                <th className="px-5 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map((s, idx) => (
                <tr key={s.id} className="border-b border-surface-100/50 hover:bg-surface-50/60 transition-colors animate-in fade-in" style={{ animationDelay: `${idx * 0.02}s` }}>
                  <td className="px-5 py-4 text-sm font-medium text-surface-800">{s.machine?.name || "-"}</td>
                  <td className="px-5 py-4 text-sm text-surface-600">{s.type}</td>
                  <td className="px-5 py-4 text-sm text-surface-600">{s.intervalDays ? `Every ${s.intervalDays}d` : "-"}</td>
                  <td className="px-5 py-4 text-sm text-surface-600">{s.nextDueDate ? new Date(s.nextDueDate).toLocaleDateString() : "-"}</td>
                  <td className="px-5 py-4 text-center">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${priorityBadge(s.priority)}`}>
                      {s.priority}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${statusBadge(s.status)}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <button className="text-primary-600 hover:text-primary-800 text-sm font-semibold">Edit</button>
                  </td>
                </tr>
              ))}
              {schedules.length === 0 && (
                <tr><td colSpan={7} className="text-center py-16 text-surface-400">
                  <Wrench size={40} className="mx-auto mb-3 text-surface-300" />
                  <p className="font-medium">No maintenance schedules found</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "tasks" && (
        <div className="card-static overflow-hidden animate-in fade-in-up" style={{ animationDelay: "0.15s" }}>
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="px-5 py-3.5 text-left">Machine</th>
                <th className="px-5 py-3.5 text-left">Type</th>
                <th className="px-5 py-3.5 text-left">Title</th>
                <th className="px-5 py-3.5 text-left">Assigned</th>
                <th className="px-5 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-left">Due Date</th>
                <th className="px-5 py-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t, idx) => (
                <tr key={t.id} className="border-b border-surface-100/50 hover:bg-surface-50/60 transition-colors animate-in fade-in" style={{ animationDelay: `${idx * 0.02}s` }}>
                  <td className="px-5 py-4 text-sm font-medium text-surface-800">{t.machine?.name || "-"}</td>
                  <td className="px-5 py-4 text-sm text-surface-600">{t.type}</td>
                  <td className="px-5 py-4 text-sm font-medium text-surface-800">{t.title}</td>
                  <td className="px-5 py-4 text-sm text-surface-600">{t.assignedTo?.name || "-"}</td>
                  <td className="px-5 py-4 text-center">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${statusBadge(t.status)}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-surface-600">{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "-"}</td>
                  <td className="px-5 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {t.status === "PENDING" && (
                        <button onClick={() => handleUpdateTaskStatus(t.id, "IN_PROGRESS")} className="text-blue-600 hover:text-blue-800" title="Start">
                          <Play size={16} />
                        </button>
                      )}
                      {t.status === "IN_PROGRESS" && (
                        <button onClick={() => handleUpdateTaskStatus(t.id, "COMPLETED")} className="text-emerald-600 hover:text-emerald-800" title="Complete">
                          <CheckCircle size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {tasks.length === 0 && (
                <tr><td colSpan={7} className="text-center py-16 text-surface-400">
                  <Wrench size={40} className="mx-auto mb-3 text-surface-300" />
                  <p className="font-medium">No maintenance tasks found</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showScheduleModal && (
        <div className="fixed inset-0 bg-surface-900/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-float w-full max-w-md p-7 animate-in scale-in duration-300 border border-white/60">
            <h3 className="text-lg font-bold text-surface-900 mb-5">Add Maintenance Schedule</h3>

            {scheduleError && (
              <div className="mb-4 px-4 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">{scheduleError}</div>
            )}

            <div className="space-y-4">
              <div>
                <label className="label">Machine <span className="text-red-500">*</span></label>
                {loadingDropdowns ? (
                  <div className="input-field text-sm text-surface-400">Loading...</div>
                ) : (
                  <select value={scheduleForm.machineId} onChange={e => setScheduleForm({ ...scheduleForm, machineId: e.target.value })} className="input-field">
                    <option value="">Select machine...</option>
                    {machines.map((m: any) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="label">Type <span className="text-red-500">*</span></label>
                <select value={scheduleForm.type} onChange={e => setScheduleForm({ ...scheduleForm, type: e.target.value })} className="input-field">
                  <option value="PREVENTIVE">PREVENTIVE</option>
                  <option value="CORRECTIVE">CORRECTIVE</option>
                  <option value="PREDICTIVE">PREDICTIVE</option>
                </select>
              </div>
              <div>
                <label className="label">Interval (days)</label>
                <input type="number" value={scheduleForm.intervalDays} onChange={e => setScheduleForm({ ...scheduleForm, intervalDays: e.target.value })} className="input-field" placeholder="e.g. 30" />
              </div>
              <div>
                <label className="label">Next Due Date <span className="text-red-500">*</span></label>
                <input type="date" value={scheduleForm.nextDueDate} onChange={e => setScheduleForm({ ...scheduleForm, nextDueDate: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="label">Priority</label>
                <select value={scheduleForm.priority} onChange={e => setScheduleForm({ ...scheduleForm, priority: e.target.value })} className="input-field">
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea value={scheduleForm.notes} onChange={e => setScheduleForm({ ...scheduleForm, notes: e.target.value })} className="input-field" rows={3} placeholder="Optional notes" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => { setShowScheduleModal(false); setScheduleError(""); }} className="btn-secondary" disabled={savingSchedule}>Cancel</button>
              <button onClick={handleCreateSchedule} className="btn-primary" disabled={savingSchedule}>
                {savingSchedule ? "Creating..." : "Create Schedule"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showTaskModal && (
        <div className="fixed inset-0 bg-surface-900/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-float w-full max-w-md p-7 animate-in scale-in duration-300 border border-white/60">
            <h3 className="text-lg font-bold text-surface-900 mb-5">Add Maintenance Task</h3>

            {taskError && (
              <div className="mb-4 px-4 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">{taskError}</div>
            )}

            <div className="space-y-4">
              <div>
                <label className="label">Machine <span className="text-red-500">*</span></label>
                {loadingDropdowns ? (
                  <div className="input-field text-sm text-surface-400">Loading...</div>
                ) : (
                  <select value={taskForm.machineId} onChange={e => setTaskForm({ ...taskForm, machineId: e.target.value })} className="input-field">
                    <option value="">Select machine...</option>
                    {machines.map((m: any) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="label">Type</label>
                <select value={taskForm.type} onChange={e => setTaskForm({ ...taskForm, type: e.target.value })} className="input-field">
                  <option value="CORRECTIVE">CORRECTIVE</option>
                  <option value="PREVENTIVE">PREVENTIVE</option>
                  <option value="INSPECTION">INSPECTION</option>
                </select>
              </div>
              <div>
                <label className="label">Title <span className="text-red-500">*</span></label>
                <input value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} className="input-field" placeholder="Task title" />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} className="input-field" rows={3} placeholder="Describe the task" />
              </div>
              <div>
                <label className="label">Assigned To <span className="text-red-500">*</span></label>
                {loadingDropdowns ? (
                  <div className="input-field text-sm text-surface-400">Loading...</div>
                ) : (
                  <select value={taskForm.assignedTo} onChange={e => setTaskForm({ ...taskForm, assignedTo: e.target.value })} className="input-field">
                    <option value="">Select user...</option>
                    {users.map((u: any) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="label">Due Date <span className="text-red-500">*</span></label>
                <input type="date" value={taskForm.dueDate} onChange={e => setTaskForm({ ...taskForm, dueDate: e.target.value })} className="input-field" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => { setShowTaskModal(false); setTaskError(""); }} className="btn-secondary" disabled={savingTask}>Cancel</button>
              <button onClick={handleCreateTask} className="btn-primary" disabled={savingTask}>
                {savingTask ? "Creating..." : "Create Task"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
