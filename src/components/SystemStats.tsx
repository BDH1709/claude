"use client";

import { useEffect, useState, useCallback } from "react";
import { Clock, Cpu, HardDrive, MemoryStick, Thermometer, Activity } from "lucide-react";
import { SystemStats } from "@/types";
import { CircularGauge } from "@/components/CircularGauge";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function formatUptime(s: number): string {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function DetailCard({ icon: Icon, label, primary, secondary, accent = "#58a6ff" }: {
  icon: React.ElementType; label: string; primary: string; secondary?: string; accent?: string;
}) {
  return (
    <div className="jarvis-card rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-3.5 h-3.5" style={{ color: accent }} />
        <span className="font-mono text-xs text-text-muted uppercase tracking-widest">{label}</span>
      </div>
      <div
        className="font-mono text-xl font-bold"
        style={{ color: accent, textShadow: `0 0 10px ${accent}55` }}
      >
        {primary}
      </div>
      {secondary && (
        <div className="font-mono text-xs text-text-muted mt-1">{secondary}</div>
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
      setStats(await res.json());
      setLastUpdated(new Date());
      setError("");
    } catch {
      setError("Failed to read system stats — check /proc and /sys mounts");
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const id = setInterval(fetchStats, 5000);
    return () => clearInterval(id);
  }, [fetchStats]);

  if (error) {
    return (
      <div className="jarvis-card rounded-lg p-6 text-center">
        <p className="font-mono text-sm text-accent-red">{error}</p>
      </div>
    );
  }

  const tempColor = stats?.temperature
    ? stats.temperature > 75 ? "#f85149" : stats.temperature > 60 ? "#f77f00" : "#58a6ff"
    : "#768390";

  return (
    <div className="space-y-6">
      {/* Circular gauges row */}
      <div className="jarvis-card rounded-lg p-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 place-items-center">
          {stats ? (
            <>
              <CircularGauge value={stats.cpu.usage}            label="CPU"   size={130} />
              <CircularGauge value={stats.memory.usagePercent}  label="RAM"   size={130} />
              <CircularGauge value={stats.disk.usagePercent}    label="DISK"  size={130} />
              <CircularGauge
                value={stats.temperature !== null ? Math.min(100, (stats.temperature / 90) * 100) : 0}
                label="TEMP"
                displayValue={stats.temperature !== null ? `${stats.temperature.toFixed(1)}°` : "N/A"}
                color={tempColor}
                size={130}
              />
            </>
          ) : (
            [...Array(4)].map((_, i) => (
              <div key={i} className="w-[130px] h-[130px] rounded-full border-2 border-border animate-pulse" />
            ))
          )}
        </div>
      </div>

      {/* Detail cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {stats ? (
          <>
            <DetailCard
              icon={Clock}
              label="Uptime"
              primary={formatUptime(stats.uptime)}
              accent="#58a6ff"
            />
            <DetailCard
              icon={Activity}
              label="Load avg"
              primary={stats.loadAvg[0].toFixed(2)}
              secondary={`5m: ${stats.loadAvg[1].toFixed(2)} · 15m: ${stats.loadAvg[2].toFixed(2)}`}
              accent="#f77f00"
            />
            <DetailCard
              icon={Thermometer}
              label="Temperature"
              primary={stats.temperature !== null ? `${stats.temperature.toFixed(1)}°C` : "N/A"}
              secondary={
                stats.temperature !== null
                  ? stats.temperature > 75 ? "⚠ Running hot"
                  : stats.temperature > 60 ? "Warm"
                  : "Normal"
                  : "Sensor unavailable"
              }
              accent={tempColor}
            />
            <DetailCard
              icon={MemoryStick}
              label="Memory"
              primary={formatBytes(stats.memory.used)}
              secondary={`${stats.memory.usagePercent}% of ${formatBytes(stats.memory.total)}`}
              accent="#bc8cff"
            />
            <DetailCard
              icon={HardDrive}
              label="Disk"
              primary={formatBytes(stats.disk.used)}
              secondary={`${stats.disk.usagePercent}% of ${formatBytes(stats.disk.total)}`}
              accent="#f77f00"
            />
            <DetailCard
              icon={Cpu}
              label="Processor"
              primary={`${stats.cpu.cores} cores`}
              secondary={stats.cpu.model.split(" ").slice(0, 4).join(" ")}
              accent="#58a6ff"
            />
          </>
        ) : (
          [...Array(6)].map((_, i) => (
            <div key={i} className="jarvis-card rounded-lg p-4 h-24 animate-pulse" />
          ))
        )}
      </div>

      {lastUpdated && (
        <p className="font-mono text-xs text-text-muted text-right">
          Updated {lastUpdated.toLocaleTimeString()} · live every 5s
        </p>
      )}
    </div>
  );
}
