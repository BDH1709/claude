const axios = require('axios');

const BASE = 'https://play.limitlesstcg.com/api';

// Fetch recent PTCG tournaments (standard format)
async function fetchTournaments(limit = 20) {
  const { data } = await axios.get(`${BASE}/tournaments`, {
    params: { game: 'PTCG', format: 'standard', type: 'online', limit },
    timeout: 10000,
  });
  return Array.isArray(data) ? data : [];
}

// Fetch full standings + deck lists for a tournament
async function fetchTournamentDetails(id) {
  const [standingsRes, decksRes] = await Promise.allSettled([
    axios.get(`${BASE}/tournaments/${id}/standings`, { timeout: 10000 }),
    axios.get(`${BASE}/tournaments/${id}/decks`, { timeout: 10000 }),
  ]);

  const standings = standingsRes.status === 'fulfilled' ? standingsRes.value.data : [];
  const decks = decksRes.status === 'fulfilled' ? decksRes.value.data : [];

  return { standings, decks };
}

// Aggregate archetype stats from recent tournament top cuts
async function buildMetaSnapshot(tournaments) {
  const archetypeMap = {};

  for (const t of tournaments) {
    try {
      const { standings, decks } = await fetchTournamentDetails(t.id);

      const topCut = standings.slice(0, Math.min(8, standings.length));
      topCut.forEach((entry, idx) => {
        const archetype = entry.archetype || entry.deck_archetype || 'Unknown';
        const placement = idx + 1;

        if (!archetypeMap[archetype]) {
          archetypeMap[archetype] = {
            name: archetype,
            appearances: 0,
            top8s: 0,
            wins: 0,
            placements: [],
            example_decklist: null,
          };
        }
        archetypeMap[archetype].appearances++;
        archetypeMap[archetype].top8s++;
        if (placement === 1) archetypeMap[archetype].wins++;
        archetypeMap[archetype].placements.push(placement);
      });

      // Attach example decklists
      if (Array.isArray(decks)) {
        decks.forEach(deck => {
          const arch = deck.archetype || 'Unknown';
          if (archetypeMap[arch] && !archetypeMap[arch].example_decklist) {
            archetypeMap[arch].example_decklist = deck.cards || null;
          }
        });
      }
    } catch {
      // Skip tournaments that fail
    }
  }

  const archetypes = Object.values(archetypeMap)
    .filter(a => a.appearances > 0)
    .map(a => ({
      ...a,
      avg_placement: a.placements.length
        ? +(a.placements.reduce((s, p) => s + p, 0) / a.placements.length).toFixed(1)
        : 8,
      tier: calcTier(a),
    }))
    .sort((a, b) => a.avg_placement - b.avg_placement);

  return archetypes;
}

function calcTier(a) {
  if (a.wins >= 3 || (a.top8s >= 8 && a.avg_placement <= 3)) return 'S';
  if (a.wins >= 1 || (a.top8s >= 5 && a.avg_placement <= 4)) return 'A';
  if (a.top8s >= 3 && a.avg_placement <= 5) return 'B';
  return 'C';
}

module.exports = { fetchTournaments, fetchTournamentDetails, buildMetaSnapshot };
