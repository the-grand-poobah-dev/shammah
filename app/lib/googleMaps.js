// Loads the Google Maps JS API (Places library) once, on demand.
// Needs NEXT_PUBLIC_GOOGLE_MAPS_API_KEY. Without a key, callers fall back to a plain text box.

export const HAS_MAPS_KEY = !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

let placesPromise = null;

export function loadPlacesLibrary() {
  if (!HAS_MAPS_KEY) return Promise.reject(new Error('No Google Maps key configured.'));
  if (typeof window === 'undefined') return Promise.reject(new Error('Browser only.'));
  if (placesPromise) return placesPromise;

  placesPromise = new Promise((resolve, reject) => {
    const done = () => window.google.maps.importLibrary('places').then(resolve, reject);
    if (window.google && window.google.maps && window.google.maps.importLibrary) {
      done();
      return;
    }
    const script = document.createElement('script');
    script.src =
      'https://maps.googleapis.com/maps/api/js?key=' +
      encodeURIComponent(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) +
      '&loading=async&v=weekly';
    script.async = true;
    script.onload = done;
    script.onerror = () => reject(new Error('Could not load Google Maps.'));
    document.head.appendChild(script);
  }).catch((err) => {
    placesPromise = null; // allow a retry
    throw err;
  });

  return placesPromise;
}
