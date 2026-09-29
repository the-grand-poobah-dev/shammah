'use client';
import { useEffect, useRef, useState } from 'react';
import { HAS_MAPS_KEY, loadPlacesLibrary } from '../lib/googleMaps';

// value: { label, placeId, lat, lng } | null
// Uses Google's Place Autocomplete web component (Places API "New").
// Falls back to a plain text box if there's no API key or Google fails to load.
export default function LocationPicker({ value, onChange }) {
  const holderRef = useRef(null);
  const [mode, setMode] = useState(HAS_MAPS_KEY ? 'loading' : 'text'); // loading | google | text
  const [textValue, setTextValue] = useState('');
  const picked = !!value && !value.typed; // a place chosen from Google (not free text)

  useEffect(() => {
    if (!HAS_MAPS_KEY || picked || mode === 'text') return undefined;
    let cancelled = false;
    let el = null;

    loadPlacesLibrary()
      .then((lib) => {
        if (cancelled || !holderRef.current) return;
        // City / region level only: we don't want people typing home addresses.
        el = new lib.PlaceAutocompleteElement({
          includedPrimaryTypes: [
            'locality',
            'sublocality',
            'administrative_area_level_2',
            'administrative_area_level_1',
            'country',
          ],
        });
        el.style.width = '100%';
        el.style.colorScheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';

        const handle = async (event) => {
          try {
            const place = event.placePrediction ? event.placePrediction.toPlace() : event.place;
            await place.fetchFields({
              fields: ['id', 'displayName', 'formattedAddress', 'location', 'addressComponents'],
            });
            onChange(toValue(place));
          } catch {
            /* ignore: person can just search again */
          }
        };
        el.addEventListener('gmp-select', handle);
        el.addEventListener('gmp-placeselect', handle); // older API versions
        holderRef.current.innerHTML = '';
        holderRef.current.appendChild(el);
        setMode('google');
      })
      .catch(() => {
        if (!cancelled) setMode('text');
      });

    return () => {
      cancelled = true;
      if (el && el.parentNode) el.parentNode.removeChild(el);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked]);

  if (picked) {
    return (
      <div className="loc-chip">
        <span className="loc-pin" aria-hidden="true">📍</span>
        <span className="loc-label">{value.label}</span>
        <button type="button" className="loc-clear" onClick={() => onChange(null)}>
          Change
        </button>
      </div>
    );
  }

  return (
    <div>
      {mode === 'loading' && <p className="onb-hint">Loading map search…</p>}
      <div ref={holderRef} className="loc-google" style={{ display: mode === 'google' ? 'block' : 'none' }} />
      {mode === 'text' && (
        <input
          type="text"
          className="onb-input"
          value={textValue}
          maxLength={80}
          placeholder="e.g. Nairobi, Kenya"
          onChange={(e) => {
            setTextValue(e.target.value);
            const label = e.target.value.trim();
            onChange(label ? { label, placeId: null, lat: null, lng: null, typed: true } : null);
          }}
        />
      )}
    </div>
  );
}

function toValue(place) {
  const comps = place.addressComponents || [];
  const pick = (...types) => {
    for (const t of types) {
      const c = comps.find((x) => (x.types || []).includes(t));
      if (c) return c.longText;
    }
    return null;
  };
  const city = pick('locality', 'sublocality', 'administrative_area_level_2', 'administrative_area_level_1');
  const country = pick('country');
  const label = [city, country].filter(Boolean).join(', ') || place.formattedAddress || place.displayName;
  const loc = place.location;
  return {
    label,
    placeId: place.id || null,
    lat: loc ? Math.round(loc.lat() * 100) / 100 : null,
    lng: loc ? Math.round(loc.lng() * 100) / 100 : null,
  };
}
