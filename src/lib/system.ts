import fs from "fs";
import { SystemStats } from "@/types";

const PROC = process.env.HOST_PROC || "/proc";
const SYS = process.env.HOST_SYS || "/sys";

function readFile(path: string): string {
  try {
    return fs.readFileSync(path, "utf8").trim();
  } catch {
    return "";
  }
}

let prevCpuTimes: number[] | null = null;

function parseCpuStat(): { idle: number; total: number } {
  const stat = readFile(`${PROC}/stat`);
  const line = stat.split("\n").find((l) => l.startsWith("cpu "));
  if (!line) return { idle: 0, total: 1 };
  const parts = line.split(/\s+/).slice(1).map(Number);
  const idle = parts[3] + (parts[4] || 0);
  const total = parts.reduce((a, b) => a + b, 0);
  return { idle, total };
}

function getCpuUsage(): number {
  const curr = parseCpuStat();
  if (!prevCpuTimes) {
    prevCpuTimes = [curr.idle, curr.total];
    return 0;
  }
  const [prevIdle, prevTotal] = prevCpuTimes;
  const deltaTotal = curr.total - prevTotal;
  const deltaIdle = curr.idle - prevIdle;
  prevCpuTimes = [curr.idle, curr.total];
  if (deltaTotal === 0) return 0;
  return Math.round(((deltaTotal - deltaIdle) / deltaTotal) * 100);
}

function getCpuModel(): string {
  const info = readFile(`${PROC}/cpuinfo`);
  const match = info.match(/Model name\s*:\s*(.+)/i) || info.match(/model name\s*:\s*(.+)/i) || info.match(/Hardware\s*:\s*(.+)/i);
  if (match) return match[1].trim();
  return "ARM Cortex-A72";
}

function getCpuCores(): number {
  const info = readFile(`${PROC}/cpuinfo`);
  const matches = info.match(/^processor\s*:/gim);
  return matches ? matches.length : 4;
}

function getMemory() {
  const info = readFile(`${PROC}/meminfo`);
  const getValue = (key: string) => {
    const match = info.match(new RegExp(`${key}:\\s+(\\d+)`));
    return match ? parseInt(match[1]) * 1024 : 0;
  };
  const total = getValue("MemTotal");
  const free = getValue("MemFree");
  const buffers = getValue("Buffers");
  const cached = getValue("Cached");
  const used = total - free - buffers - cached;
  return {
    total,
    used: Math.max(0, used),
    free: total - Math.max(0, used),
    usagePercent: total ? Math.round((Math.max(0, used) / total) * 100) : 0,
  };
}

function getDisk() {
  try {
    const { execSync } = require("child_process");
    const out = execSync("df -B1 /", { encoding: "utf8" });
    const lines = out.trim().split("\n");
    const parts = lines[1].split(/\s+/);
    const total = parseInt(parts[1]);
    const used = parseInt(parts[2]);
    const free = parseInt(parts[3]);
    return {
      total,
      used,
      free,
      usagePercent: total ? Math.round((used / total) * 100) : 0,
      mountpoint: parts[5] || "/",
    };
  } catch {
    return { total: 0, used: 0, free: 0, usagePercent: 0, mountpoint: "/" };
  }
}

function getUptime(): number {
  const raw = readFile(`${PROC}/uptime`);
  return raw ? parseFloat(raw.split(" ")[0]) : 0;
}

function getTemperature(): number | null {
  const paths = [
    `${SYS}/class/thermal/thermal_zone0/temp`,
    `${SYS}/devices/virtual/thermal/thermal_zone0/temp`,
  ];
  for (const p of paths) {
    const raw = readFile(p);
    if (raw) {
      const val = parseInt(raw);
      return val > 1000 ? val / 1000 : val;
    }
  }
  return null;
}

function getLoadAvg(): [number, number, number] {
  const raw = readFile(`${PROC}/loadavg`);
  if (!raw) return [0, 0, 0];
  const parts = raw.split(" ");
  return [
    parseFloat(parts[0]),
    parseFloat(parts[1]),
    parseFloat(parts[2]),
  ];
}

export async function getSystemStats(): Promise<SystemStats> {
  return {
    cpu: {
      usage: getCpuUsage(),
      cores: getCpuCores(),
      model: getCpuModel(),
    },
    memory: getMemory(),
    disk: getDisk(),
    uptime: getUptime(),
    temperature: getTemperature(),
    loadAvg: getLoadAvg(),
  };
}
