# PTCG Meta Tracker — Integration Guide

Copy files into your existing `bdh1709` dashboard project and wire them up.

---

## 1. Backend — copy the route file

```powershell
copy backend\routes\ptcg.py D:\...\bdh1709\backend\routes\ptcg.py
```

Then in `backend/main.py` add two lines:

```python
# With the other route imports:
from routes import ptcg

# With the other include_router calls:
app.include_router(ptcg.router, prefix="/api/ptcg", tags=["ptcg"])
```

Deploy to Pi:
```powershell
scp backend\routes\ptcg.py percy@poseidon.local:~/bdh1709/backend/routes/
ssh percy@poseidon.local "sudo systemctl restart bdh1709-api"
```

Optional — set your pokemontcg.io API key (1000 free requests/day without it):
```bash
# In /etc/systemd/system/bdh1709-api.service under [Service]:
Environment=PTCG_API_KEY=your-key-here
```

---

## 2. Frontend — copy page files

```powershell
copy frontend\src\pages\PTCGMeta.tsx       D:\...\bdh1709\src\pages\
copy frontend\src\pages\PTCGDecks.tsx      D:\...\bdh1709\src\pages\
copy frontend\src\pages\PTCGTournaments.tsx D:\...\bdh1709\src\pages\
copy frontend\src\pages\PTCGCatchUp.tsx    D:\...\bdh1709\src\pages\
```

Copy the API client additions into `src/lib/api.ts` (or a new `src/lib/ptcg.ts`):
```powershell
copy frontend\src\lib\ptcg.ts D:\...\bdh1709\src\lib\ptcg.ts
```

---

## 3. Wire up routes in `src/App.tsx`

Add lazy imports with the other page imports:

```tsx
const PTCGMeta        = lazy(() => import('./pages/PTCGMeta'))
const PTCGDecks       = lazy(() => import('./pages/PTCGDecks'))
const PTCGTournaments = lazy(() => import('./pages/PTCGTournaments'))
const PTCGCatchUp     = lazy(() => import('./pages/PTCGCatchUp'))
```

Add routes inside your `<Routes>` block:

```tsx
<Route path="/ptcg"             element={<PTCGMeta />} />
<Route path="/ptcg/decks"       element={<PTCGDecks />} />
<Route path="/ptcg/tournaments" element={<PTCGTournaments />} />
<Route path="/ptcg/catchup"     element={<PTCGCatchUp />} />
```

---

## 4. Add nav items to `src/components/Sidebar.tsx`

Find your existing `navItems` array and add a PTCG section. Exact format depends
on your sidebar — add these entries with the other nav items:

```tsx
// PTCG section
{ path: '/ptcg',             label: 'Meta',        icon: 'trending_up',   group: 'PTCG' },
{ path: '/ptcg/decks',       label: 'My Decks',    icon: 'style',         group: 'PTCG' },
{ path: '/ptcg/tournaments', label: 'Tournaments', icon: 'emoji_events',  group: 'PTCG' },
{ path: '/ptcg/catchup',     label: 'Catch Up',    icon: 'update',        group: 'PTCG' },
```

---

## 5. Add to `src/components/TopBar.tsx`

Same nav items as Sidebar — add them alongside your existing nav links.

---

## 6. Add to `src/components/MobileBottomNav.tsx`

Add a single PTCG entry (bottom nav is space-limited):

```tsx
{ path: '/ptcg', label: 'PTCG', icon: 'style' },
```

---

## 7. Build and deploy

```powershell
npm run build
.\deploy\push.ps1 -Frontend
.\deploy\push.ps1 -Backend
```

---

## Data location on Pi

The PTCG SQLite database will be auto-created at:
```
/workspace/data/ptcg.db
```

---

## Optional: schedule meta refresh (cron on Pi)

The backend refreshes data when you click the button in the UI.
To also auto-refresh every 6 hours on the Pi:

```bash
ssh percy@poseidon.local
crontab -e
# Add:
0 */6 * * * curl -s -X POST http://localhost:8000/api/ptcg/meta/refresh
0 */3 * * * curl -s -X POST http://localhost:8000/api/ptcg/tournaments/refresh
```
