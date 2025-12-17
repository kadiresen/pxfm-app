import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";
import PlayerView from "./components/Player/PlayerView";
import StationList, { Station } from "./components/StationList/StationList";
import { useAudioPlayer } from "./hooks/useAudioPlayer";
import { useRadioBrowser } from "./hooks/useRadioBrowser";
import { useFavorites } from "./hooks/useFavorites"; // Import useFavorites

type DisplayMode = "all" | "favorites";

const App: React.FC = () => {
  // Hide splash screen on mount
  useEffect(() => {
    const initApp = async () => {
      try {
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: "#0a0a0a" });
        await SplashScreen.hide();
      } catch (err) {
        console.error("Failed to initialize app", err);
      }
    };
    initApp();
  }, []);

  const { stations, loading, error, search, initialized } = useRadioBrowser();
  const { favoriteStations } = useFavorites(); // Use the favorites hook

  const nextStationRef = useRef<(() => void) | undefined>(undefined);
  const previousStationRef = useRef<(() => void) | undefined>(undefined);

  const {
    isPlaying,
    isLoading,
    error: playerError,
    play,
    toggle,
  } = useAudioPlayer({
    onNextStation: () => nextStationRef.current?.(),
    onPreviousStation: () => previousStationRef.current?.(),
  });

  const [activeStation, setActiveStation] = useState<Station>({
    id: "default",
    name: "Select a Station",
    genre: "Radio",
    image: "",
    streamUrl: "",
  });
  const [displayMode, setDisplayMode] = useState<DisplayMode>("favorites"); // Default to favorites

  const [currentSearchTerm, setCurrentSearchTerm] = useState("");

  useEffect(() => {
    // Initial search for all stations or handle empty search for favorites
    if (displayMode === "all") {
      search("");
    }
  }, [displayMode, search]);

  const playStation = useCallback(
    (station: Station) => {
      setActiveStation(station);
      if (station.streamUrl) {
        play(station.streamUrl, {
          title: station.name,
          artist: station.genre,
          artwork: station.image || "/assets/imgs/logo.png",
        });
      }
    },
    [play],
  );

  // Determine which list of stations to display based on displayMode
  const displayedStations = useMemo(() => {
    let stationsToDisplay =
      displayMode === "favorites" ? favoriteStations : stations;

    if (currentSearchTerm) {
      stationsToDisplay = stationsToDisplay.filter(
        (station) =>
          station.name
            .toLowerCase()
            .includes(currentSearchTerm.toLowerCase()) ||
          station.genre
            ?.toLowerCase()
            .includes(currentSearchTerm.toLowerCase()),
      );
    }
    return stationsToDisplay;
  }, [displayMode, favoriteStations, stations, currentSearchTerm]);

  const handleSearch = useCallback(
    (query: string) => {
      setCurrentSearchTerm(query);
      if (displayMode === "all") {
        search(query); // Still use the RadioBrowser API for 'all' mode
      }
      // For 'favorites' mode, filtering happens in displayedStations memo
    },
    [displayMode, search],
  );

  const moveStation = useCallback(
    (direction: "next" | "prev") => {
      if (!displayedStations.length) return;
      const currentIndex = displayedStations.findIndex(
        (station) => station.id === activeStation.id,
      );
      if (currentIndex === -1) return;

      const step = direction === "next" ? 1 : -1;
      let cursor = currentIndex;
      for (let i = 0; i < displayedStations.length; i += 1) {
        cursor = (cursor + step + displayedStations.length) % displayedStations.length;
        const candidate = displayedStations[cursor];
        if (candidate?.streamUrl) {
          playStation(candidate);
          return;
        }
      }
    },
    [activeStation.id, playStation, displayedStations],
  );

  const handleNextStation = useCallback(
    () => moveStation("next"),
    [moveStation],
  );
  const handlePreviousStation = useCallback(
    () => moveStation("prev"),
    [moveStation],
  );

  useEffect(() => {
    nextStationRef.current = handleNextStation;
    previousStationRef.current = handlePreviousStation;
  }, [handleNextStation, handlePreviousStation]);

  return (
    <div className="app-container">
      <PlayerView
        station={activeStation}
        isPlaying={isPlaying}
        isLoading={isLoading}
        onTogglePlay={toggle}
      />
      <div className="station-mode-selector">
        <div className="mode-toggle-pill">
          <button
            className={displayMode === "favorites" ? "active" : ""}
            onClick={() => setDisplayMode("favorites")}
          >
            Favorites
          </button>
          <button
            className={displayMode === "all" ? "active" : ""}
            onClick={() => setDisplayMode("all")}
          >
            All Stations
          </button>
        </div>
      </div>
      <StationList
        activeStationId={activeStation.id}
        stations={displayedStations}
        loading={displayMode === "all" ? loading : false} // Only show loading for 'all' mode API calls
        error={error || playerError}
        initialized={initialized}
        onSelectStation={playStation}
        search={handleSearch} // Pass the new handleSearch
      />
    </div>
  );
};

export default App;
