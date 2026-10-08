'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useMapsLibrary,
  useMap,
  useAdvancedMarkerRef,
} from '@vis.gl/react-google-maps';
import {
  MapPin,
  Navigation,
  Search,
  Star,
  ExternalLink,
  Phone,
  Globe,
  Compass,
  Loader2,
  X,
} from 'lucide-react';

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
const DEFAULT_CENTER = { lat: -1.286389, lng: 36.817223 }; // Nairobi default center

function PlaceMarker({ place, isSelected, onSelect, onRouteTo }) {
  const [markerRef, marker] = useAdvancedMarkerRef();

  if (!place.location) return null;

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={place.location}
        title={place.displayName || 'Church / Fellowship'}
        onClick={() => onSelect(place)}
      >
        <Pin
          background={isSelected ? '#f59e0b' : '#0d9488'}
          borderColor={isSelected ? '#78350f' : '#115e59'}
          glyphColor="#ffffff"
          scale={isSelected ? 1.25 : 1.05}
        />
      </AdvancedMarker>

      {isSelected && marker && (
        <InfoWindow anchor={marker} maxWidth={280} onCloseClick={() => onSelect(null)}>
          <div style={{ color: '#0f172a', padding: '4px 2px', fontSize: 13 }}>
            <strong style={{ display: 'block', fontSize: 14, marginBottom: 4 }}>
              {place.displayName}
            </strong>
            {place.formattedAddress && (
              <p style={{ margin: '0 0 6px', fontSize: 12, color: '#475569' }}>
                {place.formattedAddress}
              </p>
            )}
            {place.rating && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6, fontSize: 12, color: '#b45309', fontWeight: 600 }}>
                <span>★ {place.rating}</span>
                {place.userRatingCount ? <span>({place.userRatingCount} reviews)</span> : null}
              </div>
            )}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              <button
                type="button"
                onClick={() => onRouteTo(place)}
                style={{
                  background: '#0d9488',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  padding: '5px 10px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Get Directions
              </button>
              {place.googleMapsURI && (
                <a
                  href={place.googleMapsURI}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    background: '#f1f5f9',
                    color: '#0f172a',
                    borderRadius: 6,
                    padding: '5px 10px',
                    fontSize: 12,
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  Open in Maps
                </a>
              )}
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
}

function MapSearchAndRoutesController({
  searchQuery,
  setSearchQuery,
  travelMode,
  setTravelMode,
  originInput,
  setOriginInput,
  places,
  setPlaces,
  selectedPlace,
  setSelectedPlace,
  routeDestination,
  setRouteDestination,
  routeSummary,
  setRouteSummary,
  statusError,
  setStatusError,
  searching,
  setSearching,
}) {
  const map = useMap();
  const placesLib = useMapsLibrary('places');
  const routesLib = useMapsLibrary('routes');
  const sessionTokenRef = useRef(null);
  const polylinesRef = useRef([]);
  const [suggestions, setSuggestions] = useState([]);
  const initialSearchDoneRef = useRef(false);

  // Search places via Places API (New) Place.searchByText
  const executeTextSearch = useCallback(
    async (queryText, centerCoords) => {
      if (!placesLib || !queryText.trim()) return;
      setSearching(true);
      setStatusError('');
      try {
        const { Place } = placesLib;
        const request = {
          textQuery: queryText.trim(),
          fields: [
            'id',
            'displayName',
            'formattedAddress',
            'location',
            'rating',
            'userRatingCount',
            'nationalPhoneNumber',
            'websiteURI',
            'googleMapsURI',
          ],
          maxResultCount: 12,
        };
        if (centerCoords) {
          request.locationBias = {
            center: centerCoords,
            radius: 15000,
          };
        }
        const { places: foundPlaces } = await Place.searchByText(request);
        const mapped = (foundPlaces || []).map((p) => {
          const loc = p.location;
          const lat = typeof loc?.lat === 'function' ? loc.lat() : loc?.lat;
          const lng = typeof loc?.lng === 'function' ? loc.lng() : loc?.lng;
          return {
            id: p.id,
            displayName: p.displayName || 'Church Fellowship',
            formattedAddress: p.formattedAddress || '',
            location: lat != null && lng != null ? { lat, lng } : null,
            rating: p.rating || null,
            userRatingCount: p.userRatingCount || null,
            nationalPhoneNumber: p.nationalPhoneNumber || null,
            websiteURI: p.websiteURI || null,
            googleMapsURI: p.googleMapsURI || null,
          };
        }).filter((p) => p.location);

        setPlaces(mapped);
        if (mapped.length > 0 && map) {
          map.panTo(mapped[0].location);
        }
      } catch (err) {
        console.error('Places searchByText error:', err);
        setStatusError('Unable to load place search results. Please check your network or API configuration.');
      } finally {
        setSearching(false);
      }
    },
    [placesLib, map, setPlaces, setSearching, setStatusError]
  );

  // Initial search for churches when Places library is ready
  useEffect(() => {
    if (placesLib && !initialSearchDoneRef.current) {
      initialSearchDoneRef.current = true;
      executeTextSearch('Churches and Christian Fellowships in Nairobi', DEFAULT_CENTER);
    }
  }, [placesLib, executeTextSearch]);

  // Autocomplete suggestions via AutocompleteSuggestion.fetchAutocompleteSuggestions + AutocompleteSessionToken
  useEffect(() => {
    if (!placesLib || !searchQuery || searchQuery.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const { AutocompleteSessionToken, AutocompleteSuggestion } = placesLib;
    if (!sessionTokenRef.current) {
      sessionTokenRef.current = new AutocompleteSessionToken();
    }

    let cancelled = false;
    AutocompleteSuggestion.fetchAutocompleteSuggestions({
      input: searchQuery.trim(),
      sessionToken: sessionTokenRef.current,
    })
      .then((res) => {
        if (!cancelled) {
          setSuggestions(res?.suggestions || []);
        }
      })
      .catch((err) => {
        console.error('Autocomplete error:', err);
        if (!cancelled) setSuggestions([]);
      });

    return () => {
      cancelled = true;
    };
  }, [placesLib, searchQuery]);

  const handleSuggestionSelect = async (suggestion) => {
    if (!placesLib || !suggestion?.placePrediction) return;
    try {
      const place = suggestion.placePrediction.toPlace();
      await place.fetchFields({
        fields: [
          'id',
          'displayName',
          'formattedAddress',
          'location',
          'viewport',
          'rating',
          'userRatingCount',
          'nationalPhoneNumber',
          'websiteURI',
          'googleMapsURI',
        ],
      });
      // Reset session token after fetchFields
      sessionTokenRef.current = null;
      setSuggestions([]);

      const loc = place.location;
      const lat = typeof loc?.lat === 'function' ? loc.lat() : loc?.lat;
      const lng = typeof loc?.lng === 'function' ? loc.lng() : loc?.lng;
      if (lat != null && lng != null) {
        const mappedPlace = {
          id: place.id,
          displayName: place.displayName || 'Selected Place',
          formattedAddress: place.formattedAddress || '',
          location: { lat, lng },
          rating: place.rating || null,
          userRatingCount: place.userRatingCount || null,
          nationalPhoneNumber: place.nationalPhoneNumber || null,
          websiteURI: place.websiteURI || null,
          googleMapsURI: place.googleMapsURI || null,
        };
        setPlaces((prev) => [mappedPlace, ...prev.filter((x) => x.id !== mappedPlace.id)]);
        setSelectedPlace(mappedPlace);
        if (map) {
          map.panTo(mappedPlace.location);
          map.setZoom(15);
        }
      }
    } catch (err) {
      console.error('Failed fetching place details:', err);
      setStatusError('Unable to load place details. Please check your network or API quota.');
    }
  };

  // Compute route via Routes API (Route.computeRoutes)
  useEffect(() => {
    if (!routesLib || !map || !routeDestination?.location) return;

    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];
    setRouteSummary(null);
    setStatusError('');

    const originValue = originInput.trim() || DEFAULT_CENTER;
    const request = {
      origin: originValue,
      destination: routeDestination.location,
      travelMode: travelMode,
      fields: ['path', 'distanceMeters', 'durationMillis', 'viewport', 'legs'],
    };

    routesLib.Route.computeRoutes(request)
      .then(({ routes }) => {
        if (!routes || routes.length === 0) {
          setStatusError('No route found between the specified locations.');
          return;
        }
        const primaryRoute = routes[0];
        const newPolylines = primaryRoute.createPolylines();
        newPolylines.forEach((polyline) => {
          polyline.setOptions({
            strokeColor: '#0ea5e9',
            strokeWeight: 6,
          });
          polyline.setMap(map);
        });
        polylinesRef.current = newPolylines;

        if (primaryRoute.viewport) {
          map.fitBounds(primaryRoute.viewport);
        }

        setRouteSummary({
          destinationName: routeDestination.displayName,
          distanceKm: ((primaryRoute.distanceMeters ?? 0) / 1000).toFixed(1),
          durationMins: Math.max(1, Math.round((primaryRoute.durationMillis ?? 0) / 60000)),
        });
      })
      .catch((err) => {
        console.error('Error computing route:', err);
        setStatusError('Unable to load route data. Please check your network or API quota.');
      });

    return () => {
      polylinesRef.current.forEach((p) => p.setMap(null));
      polylinesRef.current = [];
    };
  }, [routesLib, map, routeDestination, originInput, travelMode, setRouteSummary, setStatusError]);

  return (
    <div style={{ marginBottom: 14 }}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSuggestions([]);
          executeTextSearch(searchQuery);
        }}
        style={{ position: 'relative', display: 'flex', gap: 8, flexWrap: 'wrap' }}
      >
        <div style={{ flex: 1, minWidth: 240, position: 'relative' }}>
          <input
            type="text"
            className="inst-search-field"
            style={{ paddingLeft: 14, width: '100%' }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search churches, cathedrals, campus CUs, or towns via Google Places…"
          />
          {suggestions.length > 0 && (
            <ul
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                zIndex: 50,
                background: 'var(--card-bg, #0f172a)',
                border: '1px solid rgba(148,163,184,0.25)',
                borderRadius: 12,
                marginTop: 4,
                padding: 6,
                listStyle: 'none',
                maxHeight: 220,
                overflowY: 'auto',
                boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
              }}
            >
              {suggestions.map((s, idx) => (
                <li
                  key={idx}
                  onClick={() => handleSuggestionSelect(s)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <MapPin size={14} className="text-teal-400" />
                  <span>{s.placePrediction?.text?.text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button type="submit" className="inst-join-action-btn" disabled={searching}>
          {searching ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
          <span style={{ marginLeft: 6 }}>Search Places</span>
        </button>

        <button
          type="button"
          className="inst-view-btn"
          onClick={() => {
            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                  if (map) {
                    map.panTo(coords);
                    map.setZoom(14);
                  }
                  setOriginInput(`${coords.lat},${coords.lng}`);
                  executeTextSearch('Churches near me', coords);
                },
                () => {
                  setStatusError('Location permission denied. Using search query instead.');
                }
              );
            }
          }}
        >
          <Compass size={14} style={{ display: 'inline', marginRight: 4 }} />
          Near Me
        </button>
      </form>
    </div>
  );
}

export default function ChurchMapLocator() {
  const [searchQuery, setSearchQuery] = useState('Churches in Nairobi');
  const [originInput, setOriginInput] = useState('Nairobi CBD, Kenya');
  const [travelMode, setTravelMode] = useState('DRIVING');
  const [places, setPlaces] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [routeDestination, setRouteDestination] = useState(null);
  const [routeSummary, setRouteSummary] = useState(null);
  const [statusError, setStatusError] = useState('');
  const [searching, setSearching] = useState(false);

  if (!API_KEY) {
    return (
      <div className="empty-state">
        <h2>Google Maps API Key Required</h2>
        <p>Please configure NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to load the interactive Church &amp; Ministry Map.</p>
      </div>
    );
  }

  return (
    <APIProvider apiKey={API_KEY} libraries={['places', 'routes', 'marker']}>
      <section className="inst-shelf-section">
        <div className="inst-shelf-header">
          <div className="shelf-title-wrap">
            <MapPin size={18} className="text-teal-400" />
            <h3>Google Maps Platform — Live Church &amp; Ministry Locator</h3>
          </div>
          <span className="shelf-hint">Powered by Places API (New), Advanced Markers &amp; Routes API</span>
        </div>

        <MapSearchAndRoutesController
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          travelMode={travelMode}
          setTravelMode={setTravelMode}
          originInput={originInput}
          setOriginInput={setOriginInput}
          places={places}
          setPlaces={setPlaces}
          selectedPlace={selectedPlace}
          setSelectedPlace={setSelectedPlace}
          routeDestination={routeDestination}
          setRouteDestination={setRouteDestination}
          routeSummary={routeSummary}
          setRouteSummary={setRouteSummary}
          statusError={statusError}
          setStatusError={setStatusError}
          searching={searching}
          setSearching={setSearching}
        />

        {statusError && (
          <div
            style={{
              marginBottom: 12,
              padding: '8px 14px',
              borderRadius: 10,
              background: 'rgba(245,158,11,0.14)',
              color: '#fbbf24',
              fontSize: 13,
            }}
          >
            {statusError}
          </div>
        )}

        {/* Route Planner Bar when a destination is selected */}
        {routeDestination && (
          <div
            className="inst-rec-card"
            style={{
              marginBottom: 14,
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', flex: 1 }}>
              <Navigation size={16} className="text-sky-400" />
              <input
                type="text"
                className="inst-search-field"
                style={{ paddingLeft: 12, maxWidth: 240 }}
                value={originInput}
                onChange={(e) => setOriginInput(e.target.value)}
                placeholder="Starting location…"
              />
              <span style={{ fontSize: 13 }}>→ <strong>{routeDestination.displayName}</strong></span>
              <select
                className="inst-search-field"
                style={{ paddingLeft: 10, width: 130 }}
                value={travelMode}
                onChange={(e) => setTravelMode(e.target.value)}
              >
                <option value="DRIVING">Driving</option>
                <option value="WALKING">Walking</option>
                <option value="TRANSIT">Transit</option>
              </select>
            </div>

            {routeSummary && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="dir-feat-badge teal">
                  {routeSummary.distanceKm} km • ~{routeSummary.durationMins} mins
                </span>
                <button
                  type="button"
                  className="inst-view-btn"
                  onClick={() => {
                    setRouteDestination(null);
                    setRouteSummary(null);
                  }}
                >
                  <X size={13} /> Clear Route
                </button>
              </div>
            )}
          </div>
        )}

        {/* Explicit Height Map Container (CF2 Compliance) */}
        <div
          style={{
            width: '100%',
            height: '460px',
            borderRadius: 16,
            overflow: 'hidden',
            border: '1px solid rgba(148,163,184,0.2)',
            marginBottom: 16,
          }}
        >
          <Map
            mapId="DEMO_MAP_ID"
            defaultCenter={DEFAULT_CENTER}
            defaultZoom={12}
            gestureHandling="greedy"
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            style={{ width: '100%', height: '100%' }}
          >
            {places.map((p) => (
              <PlaceMarker
                key={p.id}
                place={p}
                isSelected={selectedPlace?.id === p.id}
                onSelect={(pl) => setSelectedPlace(pl)}
                onRouteTo={(pl) => setRouteDestination(pl)}
              />
            ))}
          </Map>
        </div>

        {/* Live Places API (New) Results Grid */}
        <div className="inst-recommendations-grid">
          {places.map((p) => (
            <div
              key={p.id}
              className="inst-rec-card neon-border-hover"
              onClick={() => setSelectedPlace(p)}
              style={{ cursor: 'pointer' }}
            >
              <div className="rec-card-top">
                <div className="rec-info">
                  <div className="rec-name-row">
                    <h4>{p.displayName}</h4>
                  </div>
                  {p.formattedAddress && (
                    <div className="rec-branch-row">
                      <span className="rec-meta">📍 {p.formattedAddress}</span>
                    </div>
                  )}
                </div>
                {p.rating && (
                  <span className="dir-feat-badge gold">
                    <Star size={12} /> {p.rating} ({p.userRatingCount || 0})
                  </span>
                )}
              </div>

              <div className="rec-footer" style={{ marginTop: 10 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }} onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="inst-join-action-btn"
                    onClick={() => {
                      setSelectedPlace(p);
                      setRouteDestination(p);
                    }}
                  >
                    <Navigation size={12} style={{ display: 'inline', marginRight: 4 }} />
                    Directions
                  </button>
                  {p.nationalPhoneNumber && (
                    <a href={`tel:${p.nationalPhoneNumber}`} className="inst-view-btn">
                      <Phone size={12} style={{ display: 'inline', marginRight: 4 }} />
                      {p.nationalPhoneNumber}
                    </a>
                  )}
                  {p.websiteURI && (
                    <a href={p.websiteURI} target="_blank" rel="noopener noreferrer" className="inst-view-btn">
                      <Globe size={12} style={{ display: 'inline', marginRight: 4 }} />
                      Website
                    </a>
                  )}
                  {p.googleMapsURI && (
                    <a href={p.googleMapsURI} target="_blank" rel="noopener noreferrer" className="inst-view-btn">
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </APIProvider>
  );
}
