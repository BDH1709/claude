import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

export default function CardSearch({ onSelect, placeholder = 'Search cards...' }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const timerRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await axios.get('/api/cards/search', { params: { q: query, pageSize: 12 } });
        setResults(data.data || []);
        setOpen(true);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 400);
  }, [query]);

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder={placeholder}
        className="w-full bg-pokemon-dark border border-pokemon-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-pokemon-yellow"
      />
      {loading && (
        <div className="absolute right-3 top-2.5">
          <div className="w-4 h-4 border-2 border-gray-500 border-t-pokemon-yellow rounded-full animate-spin" />
        </div>
      )}
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-pokemon-card border border-pokemon-border rounded-xl shadow-xl max-h-72 overflow-y-auto">
          {results.map(card => (
            <button
              key={card.id}
              onClick={() => { onSelect(card); setQuery(''); setOpen(false); setResults([]); }}
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 text-left"
            >
              {card.images?.small && (
                <img src={card.images.small} alt={card.name} className="w-8 h-11 object-cover rounded" />
              )}
              <div>
                <div className="text-sm font-medium text-white">{card.name}</div>
                <div className="text-xs text-gray-400">{card.set?.name} · {card.number}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
