export interface SystemStats {
  cpu: {
    usage: number;
    cores: number;
    model: string;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usagePercent: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    usagePercent: number;
    mountpoint: string;
  };
  uptime: number;
  temperature: number | null;
  loadAvg: [number, number, number];
}

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface NoteMetadata {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface PublishState {
  server: boolean;
  chat: boolean;
  notes: boolean;
  pokemon: boolean;
  sport: boolean;
  finance: boolean;
}

export interface Project {
  title: string;
  description: string;
  tech: string[];
  url?: string;
  repo?: string;
  status: "active" | "archived" | "wip";
}
