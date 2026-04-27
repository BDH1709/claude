"use client";

import { useEffect, useState, useCallback } from "react";
import { Cpu, HardDrive, MemoryStick, Clock, Thermometer, Activity } from "lucide-react";
import { SystemStats } from "@/types";
import clsx from "clsx";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function UsageBar({ value, warn = 70, danger = 90 }: { value: number; warn?: number; danger?: number }) {
  const color =
    value >= danger
      ? "bg-accent-red"
      : value >= warn
      ? "bg-accent-orange"
      : "bg-accent-green";
  return (
    <div className="h-1.5 w-full bg-bg-tertiary rounded-full overflow-hidden">
      <div
        className={clsx("h-full rounded-full transition-all duration-500", color)}
        style={{ width: `${Math.min(100, value)}%` }}
      />
    </div>
  );
}

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  percent?: number;
  accent?: string;
}

function StatCard({ icon: Icon, label, value, sub, percent, accent = "text-accent-blue" }: StatCardProps) {
  return (
    <div className="bg-bg-secondary border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Icon className={clsx("w-4 h-4", accent)} />
        <span className="text-xs font-mono text-text-muted uppercase tracking-wider">{label}</span>
      </div>
      <div>
        <div className="font-mono text-2xl font-bold text-text-primary">{value}</div>
        {sub && <div className="text-xs text-text-muted mt-0.5">{sub}</div>}
      </div>
      {percent !== undefined && <UsageBar value={percent} />}
      {percent !== undefined && (
        <div className="text-xs font-mono text-text-muted">{percent}% used</div>
      )}
    </div>
  );
}

export function SystemStatsPanel() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/system", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed");
      const data: SystemStats = await res.json();
      setStats(data);
      setLastUpdated(new Date());
      setError("");
    } catch {
      setError("Failed to fetch system stats");
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  if (error) {
    return (
      <div className="bg-bg-secondary border border-accent-red border-opacity-30 rounded-lg p-6 text-center">
        <p className="text-accent-red font-mono text-sm">{error}</p>
        <p className="text-text-muted text-xs mt-2">Check that /proc and /sys are accessible</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-bg-secondary border border-border rounded-lg p-4 h-28 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          icon={Cpu}
          label="CPU"
          value={`${stats.cpu.usage}%`}
          sub={`${stats.cpu.cores} cores · ${stats.cpu.model.split(" ").slice(0, 3).join(" ")}`}
          percent={stats.cpu.usage}
          accent="text-accent-blue"
        />
        <StatCard
          icon={MemoryStick}
          label="Memory"
          value={formatBytes(stats.memory.used)}
          sub={`of ${formatBytes(stats.memory.total)}`}
          percent={stats.memory.usagePercent}
          accent="text-accent-purple"
        />
        <StatCard
          icon={HardDrive}
          label="Disk"
          value={formatBytes(stats.disk.used)}
          sub={`of ${formatBytes(stats.disk.total)} on ${stats.disk.mountpoint}`}
          percent={stats.disk.usagePercent}
          accent="text-accent-orange"
        />
        <StatCard
          icon={Clock}
          label="Uptime"
          value={formatUptime(stats.uptime)}
          sub="system uptime"
          accent="text-accent-green"
        />
        <StatCard
          icon={Thermometer}
          label="Temperature"
          value={stats.temperature !== null ? `${stats.temperature.toFixed(1)}°C` : "N/A"}
          sub={stats.temperature !== null ? (stats.temperature > 70 ? "⚠ Hot" : stats.temperature > 55 ? "Warm" : "Normal") : "Sensor unavailable"}
          accent={
            stats.temperature === null
              ? "text-text-muted"
              : stats.temperature > 70
              ? "text-accent-red"
              : stats.temperature > 55
              ? "text-accent-orange"
              : "text-accent-green"
          }
        />
        <StatCard
          icon={Activity}
          label="Load Avg"
          value={stats.loadAvg[0].toFixed(2)}
          sub={`5m: ${stats.loadAvg[1].toFixed(2)} · 15m: ${stats.loadAvg[2].toFixed(2)}`}
          accent="text-accent-blue"
        />
      </div>

      {lastUpdated && (
        <p className="text-xs font-mono text-text-muted text-right">
          Updated {lastUpdated.toLocaleTimeString()} · auto-refreshes every 5s
        </p>
      )}
    </div>
  );
}
