let _pendingCallbacks: Array<() => void> = [];

declare global {
  interface Window {
    __gmCallback?: () => void;
    google: typeof google;
  }
}

export function loadGoogleMapsScript(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window.google !== "undefined" && window.google.maps?.Map) {
      return resolve();
    }

    if (document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]')) {
      _pendingCallbacks.push(resolve);
      return;
    }

    _pendingCallbacks.push(resolve);

    window.__gmCallback = () => {
      delete window.__gmCallback;
      const cbs = _pendingCallbacks.splice(0);
      cbs.forEach((cb) => cb());
    };

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=weekly&libraries=geometry,geocoding,places&callback=__gmCallback`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      _pendingCallbacks.splice(0);
      reject(new Error("Google Maps script failed to load. Verify the Maps JavaScript API is enabled in Google Cloud Console."));
    };
    document.head.appendChild(script);
  });
}

export async function fetchMapsApiKey(): Promise<string> {
  const base = (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");
  const res = await fetch(`${base}/api/config`);
  const data = await res.json();
  return data.googleMapsApiKey ?? "";
}
