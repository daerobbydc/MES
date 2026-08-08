"use client";

import { useEffect, useState } from "react";
import {
  Clock, Users, Calendar, Plus, CheckCircle, LogIn, LogOut, AlertTriangle,
} from "lucide-react";

export default function ShiftManagementPage() {
  const [tab, setTab] = useState<"shifts" | "schedule" | "assign">("shifts");
  const [definitions, setDefinitions] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [shiftForm, setShiftForm] = useState({
    name: "", startTime: "", endTime: "", breakMinutes: "",
  });
  const [shiftSaving, setShiftSaving] = useState(false);
  const [shiftError, setShiftError] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [assignForm, setAssignForm] = useState({
    shiftId: "", startDate: "", endDate: "",
  });
  const [assignSaving, setAssignSaving] = useState(false);
  const [assignError, setAssignError] = useState("");

  useEffect(() => { fetchAll(); fetchUsers(); }, []);

  const fetchAll = async () => {
    try {
      const [dRes, sRes, dashRes] = await Promise.all([
        fetch("/api/shifts/definitions"),
        fetch("/api/shifts/schedules"),
        fetch("/api/shifts/dashboard"),
      ]);
      const dJson = await dRes.json();
      const sJson = await sRes.json();
      const dashJson = await dashRes.json();
      if (dJson.success) setDefinitions(dJson.data);
      if (sJson.success) setSchedules(sJson.data);
      if (dashJson.success) setDashboard(dashJson.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users?limit=100");
      const json = await res.json();
      if (json.success) setUsers(json.data);
    } catch (e) { console.error(e); }
  };

  const stats = [
    { label: "Today's Shifts", value: dashboard.todayShifts ?? 0, color: "text-surface-900", bg: "bg-primary-50", icon: Clock },
    { label: "Checked In", value: dashboard.checkedIn ?? 0, color: "text-emerald-600", bg: "bg-emerald-50", icon: CheckCircle },
    { label: "Absent", value: dashboard.absent ?? 0, color: "text-red-600", bg: "bg-red-50", icon: AlertTriangle },
    { label: "Upcoming Shifts", value: dashboard.upcoming ?? 0, color: "text-blue-600", bg: "bg-blue-50", icon: Calendar },
  ];

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      ASSIGNED: "bg-blue-100 text-blue-700",
      CHECKED_IN: "bg-emerald-100 text-emerald-700",
      CHECKED_OUT: "bg-surface-100 text-surface-600",
      ABSENT: "bg-red-100 text-red-700",
      SWAPPED: "bg-amber-100 text-amber-700",
    };
    return map[s] || "bg-surface-100 text-surface-600";
  };

  const handleCreateShift = async () => {
    setShiftError("");
    if (!shiftForm.name || !shiftForm.startTime || !shiftForm.endTime) {
      setShiftError("Name, start time, and end time are required.");
      return;
    }
    setShiftSaving(true);
    try {
      const res = await fetch("/api/shifts/definitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...shiftForm,
          breakMinutes: Number(shiftForm.breakMinutes) || 0,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowShiftModal(false);
        setShiftForm({ name: "", startTime: "", endTime: "", breakMinutes: "" });
        fetchAll();
      } else {
        setShiftError(json.message || "Failed to create shift.");
      }
    } catch (e) { setShiftError("Network error. Please try again."); } finally { setShiftSaving(false); }
  };

  const handleAssignShift = async () => {
    setAssignError("");
    if (selectedUserIds.length === 0) { setAssignError("Please select at least one user."); return; }
    if (!assignForm.shiftId) { setAssignError("Please select a shift."); return; }
    if (!assignForm.startDate) { setAssignError("Start date is required."); return; }
    setAssignSaving(true);
    try {
      const res = await fetch("/api/shifts/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userIds: selectedUserIds,
          shiftId: assignForm.shiftId,
          startDate: assignForm.startDate,
          endDate: assignForm.endDate,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSelectedUserIds([]);
        setUserSearch("");
        setAssignForm({ shiftId: "", startDate: "", endDate: "" });
        fetchAll();
      } else {
        setAssignError(json.message || "Failed to assign shifts.");
      }
    } catch (e) { setAssignError("Network error. Please try again."); } finally { setAssignSaving(false); }
  };

  const handleCheckIn = async (scheduleId: string) => {
    try {
      await fetch(`/api/shifts/schedules/${scheduleId}/checkin`, { method: "POST" });
      fetchAll();
    } catch (e) { console.error(e); }
  };

  const handleCheckOut = async (scheduleId: string) => {
    try {
      await fetch(`/api/shifts/schedules/${scheduleId}/checkout`, { method: "POST" });
      fetchAll();
    } catch (e) { console.error(e); }
  };

  const toggleUser = (userId: string) => {
    setSelectedUserIds(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  };

  const toggleAllVisibleUsers = () => {
    const visible = filteredUsersList.map(u => u.id);
    const allSelected = visible.every(id => selectedUserIds.includes(id));
    if (allSelected) {
      setSelectedUserIds(prev => prev.filter(id => !visible.includes(id)));
    } else {
      setSelectedUserIds(prev => [...new Set([...prev, ...visible])]);
    }
  };

  const filteredUsersList = users.filter(u => {
    if (!userSearch) return true;
    return u.name?.toLowerCase().includes(userSearch.toLowerCase()) || u.email?.toLowerCase().includes(userSearch.toLowerCase());
  });

  const filteredSchedules = schedules.filter(s => {
    if (!selectedDate) return true;
    const d = new Date(s.date).toISOString().split("T")[0];
    return d === selectedDate;
  });

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-3 border-primary-200 border-t-primary-500 rounded-full animate-spin"></div>
        <p className="text-sm text-surface-500 font-medium">Loading shift data...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 tracking-tight">Shift Management</h1>
          <p className="text-surface-500 text-sm mt-0.5">Manage shift definitions, schedules and attendance</p>
        </div>
        <button onClick={() => setShowShiftModal(true)} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Add Shift
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
        {(["shifts", "schedule", "assign"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === t ? "bg-white text-surface-900 shadow-sm" : "text-surface-500 hover:text-surface-700"
            }`}
          >
            {t === "shifts" ? "Shifts" : t === "schedule" ? "Schedule" : "Assign"}
          </button>
        ))}
      </div>

      {tab === "shifts" && (
        <div className="grid grid-cols-3 gap-4 animate-in fade-in-up" style={{ animationDelay: "0.15s" }}>
          {definitions.map((s, idx) => (
            <div key={s.id} className="card-static p-5 animate-in fade-in" style={{ animationDelay: `${idx * 0.05}s` }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                  <Clock size={20} className="text-primary-600" />
                </div>
                <div>
                  <h3 className="font-bold text-surface-900">{s.name}</h3>
                  <p className="text-xs text-surface-500">Shift Definition</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-surface-500">Start Time</span>
                  <span className="font-medium text-surface-800">{s.startTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-500">End Time</span>
                  <span className="font-medium text-surface-800">{s.endTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-500">Break</span>
                  <span className="font-medium text-surface-800">{s.breakMinutes ?? 0} min</span>
                </div>
              </div>
            </div>
          ))}
          {definitions.length === 0 && (
            <div className="col-span-3 text-center py-16 text-surface-400">
              <Clock size={40} className="mx-auto mb-3 text-surface-300" />
              <p className="font-medium">No shift definitions found</p>
            </div>
          )}
        </div>
      )}

      {tab === "schedule" && (
        <div className="space-y-4 animate-in fade-in-up" style={{ animationDelay: "0.15s" }}>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-surface-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="input-field"
              />
            </div>
            <p className="text-sm text-surface-500">{filteredSchedules.length} shift(s) scheduled</p>
          </div>
          <div className="card-static overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="table-header">
                  <th className="px-5 py-3.5 text-left">Employee</th>
                  <th className="px-5 py-3.5 text-left">Shift</th>
                  <th className="px-5 py-3.5 text-left">Time</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSchedules.map((s, idx) => (
                  <tr key={s.id} className="border-b border-surface-100/50 hover:bg-surface-50/60 transition-colors animate-in fade-in" style={{ animationDelay: `${idx * 0.02}s` }}>
                    <td className="px-5 py-4 text-sm font-medium text-surface-800">{s.user?.name || "-"}</td>
                    <td className="px-5 py-4 text-sm text-surface-600">{s.shift?.name || "-"}</td>
                    <td className="px-5 py-4 text-sm text-surface-600">{s.shift?.startTime || "-"} - {s.shift?.endTime || "-"}</td>
                    <td className="px-5 py-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${statusBadge(s.status)}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {s.status === "ASSIGNED" && (
                          <button onClick={() => handleCheckIn(s.id)} className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold hover:bg-emerald-200 transition-colors">
                            <LogIn size={14} /> Check In
                          </button>
                        )}
                        {s.status === "CHECKED_IN" && (
                          <button onClick={() => handleCheckOut(s.id)} className="inline-flex items-center gap-1 px-3 py-1.5 bg-surface-100 text-surface-700 rounded-lg text-xs font-bold hover:bg-surface-200 transition-colors">
                            <LogOut size={14} /> Check Out
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredSchedules.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-16 text-surface-400">
                    <Calendar size={40} className="mx-auto mb-3 text-surface-300" />
                    <p className="font-medium">No shifts scheduled for this date</p>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "assign" && (
        <div className="max-w-lg animate-in fade-in-up" style={{ animationDelay: "0.15s" }}>
          <div className="card-static p-6">
            <h3 className="text-lg font-bold text-surface-900 mb-5">Assign Shifts to Users</h3>
            {assignError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-medium">{assignError}</div>
            )}
            <div className="space-y-4">
              <div>
                <label className="label">Users <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  className="input-field"
                  placeholder="Search users by name or email..."
                />
                <div className="mt-2 max-h-48 overflow-y-auto border border-surface-200 rounded-xl">
                  {filteredUsersList.length === 0 && (
                    <p className="p-3 text-sm text-surface-400">No users found</p>
                  )}
                  {filteredUsersList.length > 0 && (
                    <div className="p-2 border-b border-surface-100">
                      <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-surface-600 px-2 py-1">
                        <input
                          type="checkbox"
                          checked={filteredUsersList.every(u => selectedUserIds.includes(u.id))}
                          onChange={toggleAllVisibleUsers}
                          className="rounded border-surface-300 text-primary-500 focus:ring-primary-500"
                        />
                        Select all
                      </label>
                    </div>
                  )}
                  {filteredUsersList.map(user => (
                    <label key={user.id} className="flex items-center gap-3 px-3 py-2 hover:bg-surface-50 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(user.id)}
                        onChange={() => toggleUser(user.id)}
                        className="rounded border-surface-300 text-primary-500 focus:ring-primary-500"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-surface-800 truncate">{user.name}</p>
                        <p className="text-xs text-surface-400 truncate">{user.email}</p>
                      </div>
                    </label>
                  ))}
                </div>
                {selectedUserIds.length > 0 && (
                  <p className="mt-1.5 text-xs text-surface-500">{selectedUserIds.length} user(s) selected</p>
                )}
              </div>
              <div>
                <label className="label">Shift <span className="text-red-500">*</span></label>
                <select value={assignForm.shiftId} onChange={e => setAssignForm({ ...assignForm, shiftId: e.target.value })} className="input-field">
                  <option value="">Select a shift</option>
                  {definitions.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.startTime} - {d.endTime})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Start Date <span className="text-red-500">*</span></label>
                  <input type="date" value={assignForm.startDate} onChange={e => setAssignForm({ ...assignForm, startDate: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="label">End Date</label>
                  <input type="date" value={assignForm.endDate} onChange={e => setAssignForm({ ...assignForm, endDate: e.target.value })} className="input-field" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => { setAssignForm({ shiftId: "", startDate: "", endDate: "" }); setSelectedUserIds([]); setUserSearch(""); setAssignError(""); }} className="btn-secondary">Reset</button>
              <button onClick={handleAssignShift} disabled={assignSaving} className="btn-primary flex items-center gap-2">
                {assignSaving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                {assignSaving ? "Assigning..." : "Assign Shifts"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showShiftModal && (
        <div className="fixed inset-0 bg-surface-900/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-float w-full max-w-md p-7 animate-in scale-in duration-300 border border-white/60">
            <h3 className="text-lg font-bold text-surface-900 mb-5">Add Shift Definition</h3>
            {shiftError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-medium">{shiftError}</div>
            )}
            <div className="space-y-4">
              <div>
                <label className="label">Shift Name</label>
                <input value={shiftForm.name} onChange={e => setShiftForm({ ...shiftForm, name: e.target.value })} className="input-field" placeholder="e.g. Morning Shift" />
              </div>
              <div>
                <label className="label">Start Time</label>
                <input type="time" value={shiftForm.startTime} onChange={e => setShiftForm({ ...shiftForm, startTime: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="label">End Time</label>
                <input type="time" value={shiftForm.endTime} onChange={e => setShiftForm({ ...shiftForm, endTime: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="label">Break (minutes)</label>
                <input type="number" value={shiftForm.breakMinutes} onChange={e => setShiftForm({ ...shiftForm, breakMinutes: e.target.value })} className="input-field" placeholder="e.g. 60" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => { setShowShiftModal(false); setShiftError(""); }} className="btn-secondary">Cancel</button>
              <button onClick={handleCreateShift} disabled={shiftSaving} className="btn-primary flex items-center gap-2">
                {shiftSaving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                {shiftSaving ? "Creating..." : "Create Shift"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
