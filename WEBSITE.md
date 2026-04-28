# bdh1709.com — Personal Dashboard

> Self-hosted personal dashboard running on a Raspberry Pi 4. Built with Next.js 14, Tailwind CSS, and Docker.

---

## Overview

A private, self-hosted dashboard for monitoring, notes, AI chat, and more. Hosted at **bdh1709.com**, served by Caddy, running in Docker on a Raspberry Pi 4 (ARM64).

The site has two zones:

| Zone | Access | Description |
|---|---|---|
| Public | No login | Landing page, portfolio |
| Dashboard | Password required | All private sections |

---

## Design

- **Theme:** Dark tech / JARVIS-inspired
- **Background:** `#060d14` (near black, dark navy)
- **Accents:** Blue `#58a6ff` · Orange `#f77f00`
- **Fonts:** JetBrains Mono (data/UI) · Inter (text)
- **Effects:** Glowing borders, circular gauges, scan lines, animated fade-ins

---

## Sections

### 🔒 Login
- Full-screen Iceland waterfall background
- JARVIS-style card with corner brackets and blue glow
- Password stored in `PRIVATE_PASSWORD` env variable
- Sets an `httpOnly` cookie valid for 7 days
- Route: `/login`

---

### 🏠 Overview (Home)
The main dashboard home. Shows everything at a glance.

- **Live clock** — ticking digital clock with date
- **Circular gauges** — animated SVG arcs for CPU, RAM, Disk, Temperature
- **System status** — uptime, load average, memory, processor details
- **Notes widget** — 5 most recent notes with quick-create button
- Auto-refreshes every **5 seconds**
- Route: `/dashboard`

---

### 🖥️ Server
Detailed Raspberry Pi system statistics.

| Metric | Source |
|---|---|
| CPU usage | `/proc/stat` |
| Memory | `/proc/meminfo` |
| Disk | `df -B1 /` |
| Uptime | `/proc/uptime` |
| Temperature | `/sys/class/thermal/thermal_zone0/temp` |
| Load average | `/proc/loadavg` |

- Circular gauges + detail cards
- Colour-coded thresholds (blue → orange → red)
- Route: `/dashboard/server`

---

### 💬 AI Chat
Embedded Open WebUI interface.

- Iframe pointing to `http://localhost:3001`
- Full-height layout
- Route: `/dashboard/chat`

---

### 📝 Notes
Markdown note editor with file-based storage.

- Notes saved as `.md` files in `/workspace/data/notes/`
- Metadata (title, timestamps) in matching `.json` files
- **Features:** Create, read, update, delete, preview (rendered markdown)
- Word count + character count
- Keyboard shortcut: `Ctrl+S` to save
- Route: `/dashboard/notes`

---

### 🎮 Pokémon — Leaf Green *(coming soon)*
Tracker for Pokémon FireRed / Leaf Green.

Planned features:
- Pokédex completion (caught / seen per Pokémon)
- Interactive location map
- Game progress journal

Route: `/dashboard/pokemon`

---

### 🏋️ Sport / Gym *(coming soon)*
Personal fitness tracker.

Planned features:
- Workout logger (exercises, sets, reps, weight)
- Progress charts over time
- AI suggestions via LiteLLM at `http://localhost:4000`

Route: `/dashboard/sport`

---

### 💰 Finance *(coming soon)*
Personal finance overview.

Planned features:
- Income and expense tracker
- Investment portfolio summary
- Monthly summary charts

Route: `/dashboard/finance`

---

## Publish System

Every dashboard section has a **Publish toggle** in the top-right corner.

- When toggled **on** → section becomes publicly visible without login
- State is stored in `/workspace/data/publish-state.json`
- API: `GET /api/publish` · `POST /api/publish`

---

## API Routes

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/auth` | Validate password, set cookie |
| `GET` | `/api/logout` | Clear cookie, redirect to home |
| `GET` | `/api/system` | Live Pi system stats JSON |
| `GET` | `/api/notes` | List all notes (metadata) |
| `POST` | `/api/notes` | Create new note |
| `GET` | `/api/notes/[id]` | Get note with content |
| `PUT` | `/api/notes/[id]` | Update note |
| `DELETE` | `/api/notes/[id]` | Delete note |
| `GET` | `/api/publish` | Get publish state |
| `POST` | `/api/publish` | Update publish state |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Runtime | Node.js 20 (Alpine) |
| Container | Docker (ARM64) |
| Reverse proxy | Caddy |
| Hardware | Raspberry Pi 4 |
| Auth | httpOnly cookie + middleware |
| Storage | File system (`/workspace/data/`) |

---

## Infrastructure

```
Internet → Caddy (bdh1709.com) → Docker: port 3000
                                       ↓
                               Next.js dashboard
                                       ↓
                     /workspace/data/ (mounted volume)
                     ├── notes/          ← markdown files
                     └── publish-state.json
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `PRIVATE_PASSWORD` | ✅ | Dashboard login password |
| `HOST_PROC` | No | Path to `/proc` (default: `/proc`) |
| `HOST_SYS` | No | Path to `/sys` (default: `/sys`) |

---

## Quick Start

```bash
# Clone and run locally
git clone https://github.com/bdh1709/claude.git dashboard
cd dashboard
git checkout claude/build-personal-dashboard-ID2WX
npm install
echo "PRIVATE_PASSWORD=yourpassword" > .env.local
npm run dev
```

```bash
# Deploy on Raspberry Pi
echo "PRIVATE_PASSWORD=yourpassword" > .env
docker compose up -d
```

---

*Last updated: April 2026*
