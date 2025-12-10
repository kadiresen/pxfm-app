import { useState, useEffect, useCallback, useRef } from "react";
import { RadioBrowserApi } from "../api/radio-browser";
import { Station } from "../components/StationList/StationList";

export const useRadioBrowser = () => {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [initialized, setInitialized] = useState(false);

  // Store the detected country code
  const defaultCountryCode = useRef<string | null>(null);

  // Helper to detect country from Timezone (more accurate for location than language)
  const detectCountry = () => {
    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (timeZone) {
        // Basic mapping for common zones involves looking up or simple heuristics
        // For now, if timezone contains 'Istanbul', return 'TR'
        if (timeZone.includes("Istanbul")) return "TR";

        // Fallback to language if timezone isn't specific enough or we don't have a huge map
        const lang = navigator.language || "en-US";
        if (lang.includes("tr")) return "TR"; // Strong hint for User's preference

        const parts = lang.split("-");
        if (parts.length === 2) return parts[1].toUpperCase();
      }
    } catch (e) {
      console.error("Country detection failed", e);
    }
    return null;
  };

  // Search function - Handles both explicit search and "empty" initial load
  const search = useCallback(async (query: string) => {
    setLoading(true);

    try {
      if (!query) {
        // EMPTY QUERY -> Logic for "Initial / Default" view

        // 1. If we haven't detected country yet, try now
        if (!defaultCountryCode.current) {
          defaultCountryCode.current = detectCountry();
        }

        let data: Station[] = [];

        if (defaultCountryCode.current) {
          console.log(
            "Fetching for Detected Country:",
            defaultCountryCode.current
          );
          data = await RadioBrowserApi.getStationsByCountry(
            defaultCountryCode.current,
            50
          );
        }

        // 2. Fallback if no country found or country returned empty
        if (data.length === 0) {
          console.log("Fallback to Global Top Stations");
          data = await RadioBrowserApi.getTopStations(50);
        }

        setStations(data);
      } else {
        // EXPLICIT QUERY -> Search API
        const data = await RadioBrowserApi.searchStations(query);
        setStations(data);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch stations");
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, []);

  // Remove the useEffect that called fetchInitialStations.
  // We rely on the consumer (StationList) calling search("") on mount.

  return { stations, loading, error, search, initialized };
};
