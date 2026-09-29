'use client';
import { useEffect, useRef, useState } from 'react';

/**
 * Free place search via OpenStreetMap Nominatim (no API key).
 * Returns { name, lat, lng } on select.
 * Respect Nominatim usage policy: one request at a time, reasonable delay, User-Agent set by browser.
 */
export default function LocationPicker({ value, onChange, placeholder = 'Search city, town, or church…' }) {
  const [query, setQuery] = useState(value?.name || '');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const timer = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    function onDoc(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  // Keep input in sync if parent clears value
  useEffect(() => {
    if (!value?.name && query && !open) setQuery('');
  }, [value?.name]);

  function search(q) {
    setQuery(q);
    setError('');
    if (timer.current) clearTimeout(timer.current);
    if (!q.trim() || q.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const url =
          'https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&q=' +
          encodeURIComponent(q.trim());
        const res = await fetch(url, {
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) throw new Error('Search failed');
        const data = await res.json();
        const mapped = (data || []).map((r) => ({
          name: r.display_name,
          lat: parseFloat(r.lat),
          lng: parseFloat(r.lon),
        }));
        setResults(mapped);
        setOpen(true);
      } catch {
        setError('Could not search places. Try again.');
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);
  }

  function pick(place) {
    setQuery(place.name);
    setOpen(false);
    setResults([]);
    onChange?.(place);
  }

  function clear() {
    setQuery('');
    setResults([]);
    setOpen(false);
    onChange?.(null);
  }

  return (
    <div className="location-picker" ref={wrapRef}>
      <div className="location-input-row">
        <input
          type="text"
          className="location-input"
          value={query}
          onChange={(e) => search(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={open}
        />
        {query && (
          <button type="button" className="location-clear" onClick={clear} aria-label="Clear location">
            ×
          </button>
        )}
      </div>
      {loading && <p className="location-hint">Searching…</p>}
      {error && <p className="location-error">{error}</p>}
      {open && results.length > 0 && (
        <ul className="location-results" role="listbox">
          {results.map((r, i) => (
            <li key={`${r.lat}-${r.lng}-${i}`}>
              <button type="button" role="option" onClick={() => pick(r)}>
                {r.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      {value?.name && !open && (
        <p className="location-selected">
          📍 {value.name.length > 60 ? value.name.slice(0, 57) + '…' : value.name}
        </p>
      )}
    </div>
  );
}
