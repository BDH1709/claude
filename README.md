# bdh1709.com — Personal Dashboard

Self-hosted personal dashboard running on a Raspberry Pi 4. Next.js 14, Tailwind CSS, TypeScript, Docker + Caddy.

## Features

- **Public** — Landing page and portfolio
- **Server** — Live Pi stats (CPU, RAM, disk, uptime, temperature)
- **AI Chat** — Iframe to Open WebUI
- **Notes** — Markdown CRUD editor
- **Pokémon** — Leaf Green tracker (coming soon)
- **Sport / Gym** — Workout logger (coming soon)
- **Finance** — Income/expense tracker (coming soon)
- **Publish toggles** — Make any section public without login

## Quick start

### 1. Set the password

Create a `.env` file in the project root:

```bash
echo "PRIVATE_PASSWORD=your-secret-password" > .env
```

### 2. Run with Docker Compose

```bash
docker compose up -d
```

The app runs on port **3000**. Data is persisted in `./workspace/data/`.

To rebuild after code changes:

```bash
docker compose up -d --build
```

### 3. View logs

```bash
docker compose logs -f dashboard
```

### 4. Stop

```bash
docker compose down
```

---

## Caddy configuration

Add this to your existing Caddyfile on bdh1709.com:

```caddy
bdh1709.com {
    reverse_proxy localhost:3000
}
```

Or as a block in a multi-site Caddyfile:

```caddy
bdh1709.com, www.bdh1709.com {
    encode gzip
    reverse_proxy 127.0.0.1:3000
}
```

Then reload Caddy:

```bash
caddy reload --config /etc/caddy/Caddyfile
# or if running Caddy in Docker:
docker exec caddy caddy reload --config /etc/caddy/Caddyfile
```

---

## Data directory

Runtime data is stored in `./workspace/data/` (mounted into the container):

```
workspace/data/
├── notes/          # Markdown notes (.md + .json metadata per note)
└── publish-state.json  # Which sections are publicly visible
```

This directory is created automatically on first run.

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `PRIVATE_PASSWORD` | Yes | Password for dashboard access |
| `NODE_ENV` | No | Set to `production` automatically by Docker |

---

## System stats

The server dashboard reads directly from Linux's `/proc` and `/sys` filesystems. The Docker Compose file mounts:

- `/proc` → `/host/proc` (read-only)
- `/sys` → `/host/sys` (read-only)

If the temperature sensor doesn't show a value, the thermal zone path may differ on your kernel. Check with:

```bash
cat /sys/class/thermal/thermal_zone0/temp
```

---

## Development

```bash
npm install
npm run dev
```

The dev server runs on `http://localhost:3000`. You'll need a `PRIVATE_PASSWORD` set in `.env.local`.

---

## Architecture

```
src/
├── app/
│   ├── page.tsx              # Landing page
│   ├── portfolio/page.tsx    # Projects
│   ├── login/page.tsx        # Password gate
│   ├── dashboard/            # Protected dashboard
│   │   ├── layout.tsx        # Sidebar layout
│   │   ├── server/           # Pi stats
│   │   ├── chat/             # Open WebUI iframe
│   │   ├── notes/            # Markdown notes
│   │   ├── pokemon/          # Coming soon
│   │   ├── sport/            # Coming soon
│   │   └── finance/          # Coming soon
│   └── api/
│       ├── auth/             # POST: validate password
│       ├── logout/           # GET: clear cookie
│       ├── system/           # GET: Pi stats
│       ├── notes/            # GET/POST notes list
│       │   └── [id]/         # GET/PUT/DELETE single note
│       └── publish/          # GET/POST publish state
├── components/               # Shared UI components
├── lib/                      # Server-side helpers
├── middleware.ts             # Auth guard for /dashboard/*
└── types/                    # Shared TypeScript types
```
