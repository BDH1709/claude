# PTCG Meta Tracker

A self-hosted Pokemon TCG companion app for staying up-to-date with the meta between sessions.

**Features:**
- Live meta tier list (S/A/B/C) built from Limitless TCG tournament results
- Tournament browser with standings
- My Decks — save and manage your decks with a card search
- Catch Up — bi-weekly digest showing what shifted since your last session

---

## Setup on Raspberry Pi

### Prerequisites
- Node.js 18+ (`node --version`)
- npm 9+

### Install and build

```bash
# Clone / copy the project
cd /home/pi
git clone <your-repo-url> ptcg-meta-tracker
cd ptcg-meta-tracker

# Install server deps
npm install

# Build the React frontend
npm run build
```

### Run

```bash
# One-shot start
npm start

# Open in browser
http://<pi-ip>:3001
```

### Run as a system service (auto-start on boot)

```bash
# Copy service file
sudo cp ptcg-tracker.service /etc/systemd/system/

# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable ptcg-tracker
sudo systemctl start ptcg-tracker

# Check status
sudo systemctl status ptcg-tracker
```

### Optional: Pokemon TCG API key

Without a key you get 1000 free requests/day (fine for personal use).
To get more, register at https://dev.pokemontcg.io and set:

```bash
# Add to /etc/systemd/system/ptcg-tracker.service under [Service]:
Environment=PTCG_API_KEY=your-key-here
```

---

## Data sources

| Source | What it provides |
|--------|-----------------|
| [Limitless TCG](https://play.limitlesstcg.com) | Tournament results, standings, decklists |
| [pokemontcg.io](https://pokemontcg.io) | Card images and data for deck builder |

Meta data refreshes automatically every **6 hours**. You can also hit "Refresh Meta" manually on the dashboard.

## Dev mode (hot-reload)

```bash
# Terminal 1 — backend
npm start

# Terminal 2 — frontend dev server with HMR
npm run client:dev
# opens at http://localhost:5173
```
