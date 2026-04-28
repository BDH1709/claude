"use client";

import { useEffect, useState, useCallback } from "react";
import { Cpu, HardDrive, MemoryStick, Thermometer, Activity, Wifi } from "lucide-react";
import { SystemStats } from "@/types";
import { CircularGauge } from "@/components/CircularGauge";
import { LiveClock } from "@/components/LiveClock";
import { NotesSummary } from "@/components/NotesSummary";

function formatBytes(b: number) {
  if (!b) return "0 B";
  const k = 1024, s = ["B","KB","MB","GB"];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return `${(b / Math.pow(k, i)).toFixed(1)} ${s[i]}`;
}

function formatUptime(s: number) {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 6)  return "Good night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good night";
}

function StatusRow({ icon: Icon, label, value, sub }: {
  icon: React.ElementType; label: string; value: string; sub?: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
      <Icon className="w-4 h-4 text-accent-blue shrink-0" />
      <span className="font-mono text-xs text-text-muted w-20 shrink-0">{label}</span>
      <span className="font-mono text-sm text-text-primary flex-1">{value}</span>
      {sub && <span className="font-mono text-xs text-text-muted">{sub}</span>}
    </div>
  );
}

export default function DashboardHome() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [error, setError] = useState(false);
  const [pulse, setPulse] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/system", { cache: "no-store" });
      if (!res.ok) throw new Error();
      setStats(await res.json());
      setPulse(true);
      setTimeout(() => setPulse(false), 400);
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const id = setInterval(fetchStats, 5000);
    return () => clearInterval(id);
  }, [fetchStats]);

  const tempColor = stats?.temperature
    ? stats.temperature > 75 ? "#f85149" : stats.temperature > 60 ? "#f77f00" : "#58a6ff"
    : "#768390";

  return (
    <div className="min-h-screen hex-grid p-6">
      <div className="scan-overlay" />

      {/* Header */}
      <div className="flex items-start justify-between mb-8 animate-fade-in-up">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="status-dot online" />
            <span className="font-mono text-xs text-text-muted tracking-widest uppercase">
              {error ? "System error" : "All systems operational"}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary">
            {greeting()},{" "}
            <span
              className="text-accent-blue"
              style={{ textShadow: "0 0 20px rgba(88,166,255,0.4)" }}
            >
              Bas
            </span>
          </h1>
        </div>
        <LiveClock />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left: Circular gauges ── */}
        <div className="jarvis-card rounded-lg p-5 animate-fade-in-up animate-delay-100">
          <div className="flex items-center gap-2 mb-5">
            <Cpu className="w-4 h-4 text-accent-blue" />
            <span className="font-mono text-xs text-text-muted uppercase tracking-widest">
              Raspberry Pi 4
            </span>
            <span
              className="ml-auto w-2 h-2 rounded-full"
              style={{
                background: pulse ? "#58a6ff" : "#1e2d3d",
                boxShadow: pulse ? "0 0 8px rgba(88,166,255,0.8)" : "none",
                transition: "all 0.2s",
              }}
            />
          </div>

          {stats ? (
            <div className="grid grid-cols-2 gap-6 place-items-center">
              <CircularGauge
                value={stats.cpu.usage}
                label="CPU"
                size={120}
              />
              <CircularGauge
                value={stats.memory.usagePercent}
                label="RAM"
                displayValue={`${stats.memory.usagePercent}%`}
                size={120}
              />
              <CircularGauge
                value={stats.disk.usagePercent}
                label="DISK"
                size={120}
              />
              <CircularGauge
                value={stats.temperature !== null ? Math.min(100, (stats.temperature / 90) * 100) : 0}
                label="TEMP"
                displayValue={stats.temperature !== null ? `${stats.temperature.toFixed(0)}°` : "N/A"}
                color={tempColor}
                size={120}
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-6 place-items-center">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="w-[120px] h-[120px] rounded-full border-2 border-border animate-pulse" />
              ))}
            </div>
          )}
        </div>

        {/* ── Middle: System details ── */}
        <div className="jarvis-card rounded-lg p-5 animate-fade-in-up animate-delay-200">
          <div className="flex items-center gap-2 mb-5">
            <Activity className="w-4 h-4 text-accent-orange" />
            <span className="font-mono text-xs text-text-muted uppercase tracking-widest">
              System Status
            </span>
          </div>

          {stats ? (
            <div>
              <StatusRow
                icon={Activity}
                label="UPTIME"
                value={formatUptime(stats.uptime)}
              />
              <StatusRow
                icon={Cpu}
                label="LOAD"
                value={stats.loadAvg[0].toFixed(2)}
                sub={`5m: ${stats.loadAvg[1].toFixed(2)}`}
              />
              <StatusRow
                icon={MemoryStick}
                label="MEMORY"
                value={formatBytes(stats.memory.used)}
                sub={`/ ${formatBytes(stats.memory.total)}`}
              />
              <StatusRow
                icon={HardDrive}
                label="DISK"
                value={formatBytes(stats.disk.used)}
                sub={`/ ${formatBytes(stats.disk.total)}`}
              />
              <StatusRow
                icon={Thermometer}
                label="TEMP"
                value={stats.temperature !== null ? `${stats.temperature.toFixed(1)}°C` : "N/A"}
                sub={
                  stats.temperature !== null
                    ? stats.temperature > 75 ? "⚠ Hot"
                    : stats.temperature > 60 ? "Warm"
                    : "Normal"
                    : ""
                }
              />
              <StatusRow
                icon={Cpu}
                label="CPU"
                value={stats.cpu.model.split(" ").slice(0, 3).join(" ")}
                sub={`${stats.cpu.cores} cores`}
              />

              {/* Load bars */}
              <div className="mt-4 space-y-2">
                {[
                  { label: "CPU", val: stats.cpu.usage },
                  { label: "RAM", val: stats.memory.usagePercent },
                  { label: "DISK", val: stats.disk.usagePercent },
                ].map(({ label, val }) => (
                  <div key={label} className="flex items-center gap-3">
                    <span className="font-mono text-xs text-text-muted w-8">{label}</span>
                    <div className="flex-1 h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${val}%`,
                          background: val > 85 ? "#f85149" : val > 70 ? "#f77f00" : "#58a6ff",
                          boxShadow: `0 0 6px ${val > 85 ? "rgba(248,81,73,0.6)" : val > 70 ? "rgba(247,127,0,0.6)" : "rgba(88,166,255,0.6)"}`,
                          transition: "width 1s ease",
                        }}
                      />
                    </div>
                    <span className="font-mono text-xs text-text-muted w-8 text-right">{val}%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-8 bg-bg-tertiary rounded animate-pulse" />
              ))}
            </div>
          )}
        </div>

        {/* ── Right: Notes ── */}
        <div className="jarvis-card jarvis-card-orange rounded-lg p-5 animate-fade-in-up animate-delay-300">
          <NotesSummary />
        </div>
      </div>

      {/* Bottom status bar */}
      <div className="mt-6 jarvis-card rounded px-4 py-2 flex items-center justify-between animate-fade-in-up animate-delay-400">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="status-dot online" />
            <span className="font-mono text-xs text-text-muted">bdh1709.com</span>
          </div>
          <div className="flex items-center gap-2">
            <Wifi className="w-3 h-3 text-text-muted" />
            <span className="font-mono text-xs text-text-muted">Raspberry Pi 4</span>
          </div>
        </div>
        <span className="font-mono text-xs text-text-muted">
          {stats ? "Live · 5s" : "Connecting..."}
        </span>
      </div>
    </div>
  );
}
