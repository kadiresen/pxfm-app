import { Station } from "../components/StationList/StationList";

// List of potentially reliable base servers
const BASE_SERVERS = [
  "https://all.api.radio-browser.info",
  "https://de1.api.radio-browser.info",
  "https://nl1.api.radio-browser.info",
  "https://at1.api.radio-browser.info",
  "https://us1.api.radio-browser.info",
  "https://fr1.api.radio-browser.info",
];

let activeBaseUrl: string | null = null;
let discoveryPromise: Promise<string> | null = null;

// Helper to find a working server
const getBaseUrl = async (): Promise<string> => {
  if (activeBaseUrl) return activeBaseUrl;

  // If a discovery is already in progress, reuse that promise
  if (discoveryPromise) return discoveryPromise;

  discoveryPromise = (async () => {
    // Shuffle servers to distribute load
    const shuffled = [...BASE_SERVERS].sort(() => 0.5 - Math.random());

    for (const server of shuffled) {
      try {
        // Parallel requests would spam this, but the promise lock prevents it
        const response = await fetch(`${server}/json/stats`);

        if (response.ok) {
          activeBaseUrl = server;
          console.log(`Connected to Radio Browser server: ${server}`);
          return server;
        }
      } catch (e) {
        console.warn(`Server ${server} failed, trying next...`);
      }
    }
    throw new Error("No available Radio Browser servers found.");
  })();

  try {
    return await discoveryPromise;
  } finally {
    // Clear promise so we can retry later if needed (though we usually stick to one found server)
    discoveryPromise = null;
  }
};

export interface RadioBrowserStation {
  stationuuid: string;
  name: string;
  url_resolved: string;
  favicon: string;
  tags: string;
}

const mapToStation = (rbStation: RadioBrowserStation): Station => ({
  id: rbStation.stationuuid,
  name: rbStation.name,
  genre: rbStation.tags.split(",")[0] || "Unknown",
  image: rbStation.favicon || "",
  streamUrl: rbStation.url_resolved,
});

export const RadioBrowserApi = {
  async getTopStations(limit = 20): Promise<Station[]> {
    try {
      const baseUrl = await getBaseUrl();
      const response = await fetch(`${baseUrl}/json/stations/topvote/${limit}`);

      if (!response.ok)
        throw new Error("Failed to fetch top stations");

      const data: RadioBrowserStation[] = await response.json();
      return data.map(mapToStation);
    } catch (error) {
      console.error("Radio Browser API Error:", error);
      // Reset active activeBaseUrl on failure to trigger re-discovery next time
      activeBaseUrl = null;
      return [];
    }
  },

  async searchStations(query: string, limit = 20): Promise<Station[]> {
    if (!query || query.length < 3) return [];
    try {
      const baseUrl = await getBaseUrl();
      const params = new URLSearchParams({
        name: query,
        limit: limit.toString(),
        hidebroken: "true",
      });
      const response = await fetch(`${baseUrl}/json/stations/search?${params.toString()}`);

      if (!response.ok) throw new Error("Failed to search stations");

      const data: RadioBrowserStation[] = await response.json();
      return data.map(mapToStation);
    } catch (error) {
      console.error("Radio Browser API Search Error:", error);
      return [];
    }
  },

  async getStationsByCountry(
    countryCode: string,
    limit = 20
  ): Promise<Station[]> {
    try {
      const baseUrl = await getBaseUrl();
      // Use 'search' endpoint with countrycode filter for more flexibility
      // order=clicktrend ensures we get the most popular ones
      const params = new URLSearchParams({
        countrycode: countryCode,
        limit: limit.toString(),
        order: "clicktrend",
        hidebroken: "true",
      });
      const response = await fetch(`${baseUrl}/json/stations/search?${params.toString()}`);

      if (!response.ok)
        throw new Error("Failed to fetch country stations");

      const data: RadioBrowserStation[] = await response.json();
      return data.map(mapToStation);
    } catch (error) {
      console.error("Radio Browser API Country Error:", error);
      return [];
    }
  },
};