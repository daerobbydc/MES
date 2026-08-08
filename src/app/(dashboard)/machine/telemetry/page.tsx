"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Activity, Thermometer, Gauge, Zap, AlertTriangle, RefreshCw,
  Play, Pause, Flame, Radio, ShieldAlert, Cpu, Waves, Sliders,
  CheckCircle2, AlertOctagon, RotateCcw
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line
} from "recharts";

interface SensorData {
  value: number;
  unit: string;
  status: "NORMAL" | "WARNING" | "CRITICAL";
}

interface MachineTelemetry {
  machineId: string;
  machineName: string;
  machineCode: string;
  lineName: string;
  workCenter: string;
  status: string;
  sensors: {
    temperature: SensorData;
    spindleSpeed: SensorData;
    powerConsumption: SensorData;
    vibration: SensorData;
    pressure: SensorData;
  };
}

interface StreamPoint {
  timestamp: string;
  timeLabel: string;
  temperature: number;
  spindleSpeed: number;
  powerConsumption: number;
  vibration: number;
  pressure: number;
}

export default function TelemetrySimulatorPage() {
  const [machines, setMachines] = useState<MachineTelemetry[]>([]);
  const [activeMachineId, setActiveMachineId] = useState<string>("");
  const [stream, setStream] = useState<StreamPoint[]>([]);
  const [isLiveStreaming, setIsLiveStreaming] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [simulating, setSimulating] = useState<boolean>(false);
  const [latestAlert, setLatestAlert] = useState<string | null>(null);

  const fetchTelemetry = useCallback(async (machineId?: string) => {
    try {
      const id = machineId || activeMachineId;
      const url = id ? `/api/machine/telemetry?machineId=${id}` : "/api/machine/telemetry";
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setMachines(json.data.machines || []);
        if (!activeMachineId && json.data.activeMachineId) {
          setActiveMachineId(json.data.activeMachineId);
        }
        if (json.data.stream) {
          setStream(json.data.stream);
        }
      }
    } catch (e) {
      console.error("Telemetry fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [activeMachineId]);

  useEffect(() => {
    fetchTelemetry();
  }, [fetchTelemetry]);

  // Live Auto-Stream simulation interval (adds real-time jitter/drift)
  useEffect(() => {
    if (!isLiveStreaming || !activeMachineId) return;

    const interval = setInterval(async () => {
      const nowStr = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      
      setStream((prevStream) => {
        const last = prevStream[prevStream.length - 1] || {
          temperature: 68.0,
          spindleSpeed: 2100,
          powerConsumption: 14.5,
          vibration: 1.6,
          pressure: 4.2,
        };

        const jitterTemp = parseFloat((last.temperature + (Math.random() - 0.48) * 0.8).toFixed(1));
        const jitterVib = parseFloat((Math.max(0.2, last.vibration + (Math.random() - 0.5) * 0.15)).toFixed(2));
        const jitterSpeed = Math.round(Math.max(0, last.spindleSpeed + (Math.random() - 0.5) * 20));
        const jitterPower = parseFloat((Math.max(0.5, last.powerConsumption + (Math.random() - 0.5) * 0.3)).toFixed(1));
        const jitterPress = parseFloat((Math.max(0.1, last.pressure + (Math.random() - 0.5) * 0.1)).toFixed(1));

        const newPoint: StreamPoint = {
          timestamp: new Date().toISOString(),
          timeLabel: nowStr,
          temperature: Math.min(110, Math.max(20, jitterTemp)),
          spindleSpeed: jitterSpeed,
          powerConsumption: jitterPower,
          vibration: jitterVib,
          pressure: jitterPress,
        };

        const updated = [...prevStream.slice(1), newPoint];
        return updated;
      });

      // Update machine sensors in state
      setMachines((prevMachines) =>
        prevMachines.map((m) => {
          if (m.machineId !== activeMachineId) return m;
          const currentTemp = stream[stream.length - 1]?.temperature || m.sensors.temperature.value;
          const currentVib = stream[stream.length - 1]?.vibration || m.sensors.vibration.value;
          return {
            ...m,
            sensors: {
              ...m.sensors,
              temperature: {
                ...m.sensors.temperature,
                value: currentTemp,
                status: currentTemp > 85 ? "CRITICAL" : currentTemp > 75 ? "WARNING" : "NORMAL",
              },
              vibration: {
                ...m.sensors.vibration,
                value: currentVib,
                status: currentVib > 4.5 ? "CRITICAL" : currentVib > 3.0 ? "WARNING" : "NORMAL",
              },
            },
          };
        })
      );
    }, 2000);

    return () => clearInterval(interval);
  }, [isLiveStreaming, activeMachineId, stream]);

  // Inject Anomaly Handler
  const triggerSimulation = async (type: "HEAT" | "VIBRATION" | "RESET") => {
    if (!activeMachineId) return;
    setSimulating(true);
    try {
      const payload: any = { machineId: activeMachineId };
      if (type === "HEAT") {
        payload.temperature = 94.2;
        payload.vibration = 2.4;
        payload.isAnomaly = true;
        setLatestAlert("🔥 CRITICAL ANOMALY: Machine temperature spiked to 94.2°C!");
      } else if (type === "VIBRATION") {
        payload.temperature = 74.0;
        payload.vibration = 5.8;
        payload.isAnomaly = true;
        setLatestAlert("⚡ CRITICAL ANOMALY: High vibration detected (5.8 mm/s)!");
      } else {
        payload.temperature = 65.0;
        payload.vibration = 1.4;
        payload.spindleSpeed = 2100;
        payload.powerConsumption = 13.5;
        payload.pressure = 4.2;
        payload.isAnomaly = false;
        setLatestAlert(null);
      }

      const res = await fetch("/api/machine/telemetry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        fetchTelemetry(activeMachineId);
      }
    } catch (e) {
      console.error("Simulation trigger failed:", e);
    } finally {
      setSimulating(false);
    }
  };

  const selectedMachine = machines.find((m) => m.machineId === activeMachineId) || machines[0];
  const latestStream = stream[stream.length - 1];

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="page-title">IoT Live Sensor & Telemetry Simulator</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              LIVE TELEMETRY STREAM
            </span>
          </div>
          <p className="page-subtitle">Real-time IoT sensor telemetry monitoring, anomaly detection & digital twin simulation</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsLiveStreaming(!isLiveStreaming)}
            className={`btn-secondary text-xs flex items-center gap-2 font-semibold ${
              isLiveStreaming ? "bg-emerald-50 text-emerald-700 border-emerald-200" : ""
            }`}
          >
            {isLiveStreaming ? <Pause size={14} className="text-emerald-600" /> : <Play size={14} />}
            {isLiveStreaming ? "Stream Active" : "Stream Paused"}
          </button>
          <button onClick={() => fetchTelemetry(activeMachineId)} className="btn-secondary text-xs flex items-center gap-2">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Critical Alert Banner */}
      {latestAlert && (
        <div className="bg-rose-50 border-2 border-rose-300 text-rose-800 p-4 rounded-2xl flex items-center justify-between shadow-lg shadow-rose-500/10 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center font-bold">
              <AlertOctagon size={22} />
            </div>
            <div>
              <p className="font-bold text-sm">{latestAlert}</p>
              <p className="text-xs text-rose-600">System automatically created alert log & isolated machine.</p>
            </div>
          </div>
          <button
            onClick={() => triggerSimulation("RESET")}
            className="px-3 py-1.5 rounded-xl bg-rose-600 text-white font-semibold text-xs hover:bg-rose-700 transition-colors"
          >
            Reset Anomaly
          </button>
        </div>
      )}

      {/* Live Controls & Anomaly Simulator Toolbar */}
      <div className="card-static bg-surface-900 text-white p-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-primary-400">
              <Sliders size={20} />
            </div>
            <div>
              <h3 className="font-bold text-sm">IoT Telemetry Anomaly Simulator</h3>
              <p className="text-xs text-white/60">Simulate physical sensor parameter variations to test automated alerts</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => triggerSimulation("HEAT")}
              disabled={simulating}
              className="px-3.5 py-2 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <Flame size={14} className="text-rose-400" />
              High Temp Spike (&gt;85°C)
            </button>
            <button
              onClick={() => triggerSimulation("VIBRATION")}
              disabled={simulating}
              className="px-3.5 py-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <Waves size={14} className="text-amber-400" />
              Vibration Spike (&gt;4.5mm/s)
            </button>
            <button
              onClick={() => triggerSimulation("RESET")}
              disabled={simulating}
              className="px-3.5 py-2 rounded-xl bg-white/10 text-white border border-white/20 hover:bg-white/20 text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <RotateCcw size={14} />
              Reset Normal
            </button>
          </div>
        </div>
      </div>

      {/* Machine Selector Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs font-bold text-surface-400 uppercase tracking-wider whitespace-nowrap pr-2">Select Machine:</span>
        {machines.map((m) => (
          <button
            key={m.machineId}
            onClick={() => {
              setActiveMachineId(m.machineId);
              fetchTelemetry(m.machineId);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border flex items-center gap-2 ${
              activeMachineId === m.machineId
                ? "bg-primary-500 text-white border-primary-600 shadow-md shadow-primary-500/25"
                : "bg-white text-surface-700 border-surface-200 hover:bg-surface-50"
            }`}
          >
            <Cpu size={14} />
            {m.machineName} ({m.machineCode})
            <span
              className={`w-2 h-2 rounded-full ${
                m.status === "RUNNING" ? "bg-emerald-400" : m.status === "DOWN" ? "bg-rose-500" : "bg-amber-400"
              }`}
            />
          </button>
        ))}
      </div>

      {/* Sensor Gauges & Digital Twin Metrics */}
      {selectedMachine && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Temperature Sensor */}
          <div className={`stat-card transition-all ${
            (latestStream?.temperature || selectedMachine.sensors.temperature.value) > 85 ? "border-2 border-rose-500 bg-rose-50/30" : ""
          }`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="stat-label">Machine Temp</p>
                <p className="text-2xl font-black text-surface-900 mt-1">
                  {latestStream?.temperature || selectedMachine.sensors.temperature.value}
                  <span className="text-sm font-semibold text-surface-500"> °C</span>
                </p>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                (latestStream?.temperature || selectedMachine.sensors.temperature.value) > 85
                  ? "bg-rose-100 text-rose-600"
                  : "bg-orange-50 text-orange-600"
              }`}>
                <Thermometer size={20} />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-[11px] font-semibold mb-1 text-surface-500">
                <span>Threshold: 85°C</span>
                <span className={
                  (latestStream?.temperature || selectedMachine.sensors.temperature.value) > 85 ? "text-rose-600 font-bold" : "text-emerald-600"
                }>
                  {(latestStream?.temperature || selectedMachine.sensors.temperature.value) > 85 ? "CRITICAL" : "NORMAL"}
                </span>
              </div>
              <div className="h-2 bg-surface-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, ((latestStream?.temperature || selectedMachine.sensors.temperature.value) / 100) * 100)}%`,
                    backgroundColor: (latestStream?.temperature || selectedMachine.sensors.temperature.value) > 85 ? "#f43f5e" : "#f97316",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Vibration Sensor */}
          <div className={`stat-card transition-all ${
            (latestStream?.vibration || selectedMachine.sensors.vibration.value) > 4.5 ? "border-2 border-rose-500 bg-rose-50/30" : ""
          }`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="stat-label">Vibration Level</p>
                <p className="text-2xl font-black text-surface-900 mt-1">
                  {latestStream?.vibration || selectedMachine.sensors.vibration.value}
                  <span className="text-sm font-semibold text-surface-500"> mm/s</span>
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Waves size={20} />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-[11px] font-semibold mb-1 text-surface-500">
                <span>Threshold: 4.5 mm/s</span>
                <span className={
                  (latestStream?.vibration || selectedMachine.sensors.vibration.value) > 4.5 ? "text-rose-600 font-bold" : "text-emerald-600"
                }>
                  {(latestStream?.vibration || selectedMachine.sensors.vibration.value) > 4.5 ? "CRITICAL" : "NORMAL"}
                </span>
              </div>
              <div className="h-2 bg-surface-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, ((latestStream?.vibration || selectedMachine.sensors.vibration.value) / 6.0) * 100)}%`,
                    backgroundColor: (latestStream?.vibration || selectedMachine.sensors.vibration.value) > 4.5 ? "#f43f5e" : "#f59e0b",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Spindle Speed */}
          <div className="stat-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="stat-label">Spindle Speed</p>
                <p className="text-2xl font-black text-surface-900 mt-1">
                  {(latestStream?.spindleSpeed || selectedMachine.sensors.spindleSpeed.value).toLocaleString()}
                  <span className="text-sm font-semibold text-surface-500"> RPM</span>
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Gauge size={20} />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-[11px] font-semibold mb-1 text-surface-500">
                <span>Max: 3,500 RPM</span>
                <span className="text-blue-600 font-bold">STABLE</span>
              </div>
              <div className="h-2 bg-surface-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all duration-500"
                  style={{
                    width: `${Math.min(100, ((latestStream?.spindleSpeed || selectedMachine.sensors.spindleSpeed.value) / 3500) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Power Consumption */}
          <div className="stat-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="stat-label">Power Consumption</p>
                <p className="text-2xl font-black text-surface-900 mt-1">
                  {latestStream?.powerConsumption || selectedMachine.sensors.powerConsumption.value}
                  <span className="text-sm font-semibold text-surface-500"> kW</span>
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold">
                <Zap size={20} />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-[11px] font-semibold mb-1 text-surface-500">
                <span>Load Factor</span>
                <span className="text-violet-600 font-bold">OPTIMAL</span>
              </div>
              <div className="h-2 bg-surface-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-violet-500 transition-all duration-500"
                  style={{
                    width: `${Math.min(100, ((latestStream?.powerConsumption || selectedMachine.sensors.powerConsumption.value) / 30.0) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Pressure */}
          <div className="stat-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="stat-label">Hydraulic Pressure</p>
                <p className="text-2xl font-black text-surface-900 mt-1">
                  {latestStream?.pressure || selectedMachine.sensors.pressure.value}
                  <span className="text-sm font-semibold text-surface-500"> bar</span>
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <Radio size={20} />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-[11px] font-semibold mb-1 text-surface-500">
                <span>Target: 4.5 bar</span>
                <span className="text-emerald-600 font-bold">NORMAL</span>
              </div>
              <div className="h-2 bg-surface-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{
                    width: `${Math.min(100, ((latestStream?.pressure || selectedMachine.sensors.pressure.value) / 8.0) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live Stream Telemetry Chart */}
      <div className="chart-card">
        <div className="chart-card-header">
          <div>
            <h3 className="chart-card-title">Live Sensor Telemetry Stream</h3>
            <p className="text-xs text-surface-400">Updating live every 2 seconds via IoT Gateway protocol</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-orange-600">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span> Temp (°C)
            </span>
            <span className="flex items-center gap-1.5 text-amber-600">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Vibration (mm/s)
            </span>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={stream}>
            <defs>
              <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorVib" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="timeLabel" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 8px 32px rgba(0,0,0,0.08)", fontSize: "12px" }} />
            <Area type="monotone" dataKey="temperature" stroke="#f97316" strokeWidth={2.5} fillOpacity={1} fill="url(#colorTemp)" name="Temp (°C)" />
            <Area type="monotone" dataKey="vibration" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorVib)" name="Vibration (mm/s)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Fleet Telemetry Status Overview */}
      <div className="card-static p-0 overflow-hidden">
        <div className="p-5 border-b border-surface-100">
          <h3 className="font-bold text-surface-900 text-base">Fleet Sensor Telemetry Status</h3>
          <p className="text-xs text-surface-400">Live active sensor metrics summary across factory machines</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="table-header">
              <tr>
                {["Machine", "Line / Work Center", "Status", "Temp (°C)", "Vibration (mm/s)", "Spindle (RPM)", "Power (kW)", "Sensor Health"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {machines.map((m) => {
                const tempVal = m.sensors.temperature.value;
                const vibVal = m.sensors.vibration.value;
                const isCritical = tempVal > 85 || vibVal > 4.5;
                const isWarning = tempVal > 75 || vibVal > 3.0;

                return (
                  <tr
                    key={m.machineId}
                    onClick={() => {
                      setActiveMachineId(m.machineId);
                      fetchTelemetry(m.machineId);
                    }}
                    className={`hover:bg-surface-50/60 transition-colors cursor-pointer ${
                      activeMachineId === m.machineId ? "bg-primary-50/30" : ""
                    }`}
                  >
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-sm text-surface-900">{m.machineName}</p>
                      <p className="text-[11px] font-mono text-surface-400">{m.machineCode}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-xs font-semibold text-surface-700">{m.lineName}</p>
                      <p className="text-[11px] text-surface-400">{m.workCenter}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`status-badge ${
                        m.status === "RUNNING" ? "status-running" : m.status === "DOWN" ? "status-down" : "status-idle"
                      }`}>
                        {m.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs font-bold ${tempVal > 85 ? "text-rose-600" : tempVal > 75 ? "text-amber-600" : "text-surface-800"}`}>
                        {tempVal} °C
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs font-bold ${vibVal > 4.5 ? "text-rose-600" : vibVal > 3.0 ? "text-amber-600" : "text-surface-800"}`}>
                        {vibVal} mm/s
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-surface-700 font-semibold">{m.sensors.spindleSpeed.value.toLocaleString()} RPM</td>
                    <td className="px-4 py-3.5 text-xs text-surface-700 font-semibold">{m.sensors.powerConsumption.value} kW</td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                        isCritical
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : isWarning
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      }`}>
                        {isCritical ? <ShieldAlert size={12} /> : <CheckCircle2 size={12} />}
                        {isCritical ? "CRITICAL" : isWarning ? "WARNING" : "HEALTHY"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
