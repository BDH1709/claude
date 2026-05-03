const express = require('express');
const router = express.Router();
const axios = require('axios');

const PTCG_API = 'https://api.pokemontcg.io/v2';

function getHeaders() {
  const key = process.env.PTCG_API_KEY;
  return key ? { 'X-Api-Key': key } : {};
}

// GET /api/cards/search?q=charizard&page=1
router.get('/search', async (req, res) => {
  const { q = '', page = 1, pageSize = 20 } = req.query;
  if (!q.trim()) return res.json({ data: [], totalCount: 0 });

  try {
    const { data } = await axios.get(`${PTCG_API}/cards`, {
      params: { q: `name:${q}*`, page, pageSize, orderBy: '-set.releaseDate' },
      headers: getHeaders(),
      timeout: 8000,
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/cards/:id
router.get('/:id', async (req, res) => {
  try {
    const { data } = await axios.get(`${PTCG_API}/cards/${req.params.id}`, {
      headers: getHeaders(),
      timeout: 8000,
    });
    res.json(data);
  } catch (err) {
    res.status(err.response?.status || 500).json({ error: err.message });
  }
});

module.exports = router;
