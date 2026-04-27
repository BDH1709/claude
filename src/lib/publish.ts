import fs from "fs";
import path from "path";
import { PublishState } from "@/types";

const STATE_FILE = process.env.PUBLISH_STATE_FILE || "/workspace/data/publish-state.json";

const DEFAULT_STATE: PublishState = {
  server: false,
  chat: false,
  notes: false,
  pokemon: false,
  sport: false,
  finance: false,
};

export function getPublishState(): PublishState {
  try {
    if (!fs.existsSync(STATE_FILE)) return { ...DEFAULT_STATE };
    const raw = fs.readFileSync(STATE_FILE, "utf8");
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function setPublishState(state: Partial<PublishState>): PublishState {
  const current = getPublishState();
  const updated = { ...current, ...state };
  const dir = path.dirname(STATE_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(updated, null, 2), "utf8");
  return updated;
}
