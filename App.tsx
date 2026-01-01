import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import PlayerView from "./components/Player/PlayerView";
import StationList, { Station } from "./components/StationList/StationList";
import TitleBar from "./components/TitleBar/TitleBar";
import { useAudioPlayer } from "./hooks/useAudioPlayer";
import { useRadioBrowser } from "./hooks/useRadioBrowser";
import { useFavorites } from "./hooks/useFavorites";

type DisplayMode = "all" | "favorites";

const variants: Variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? 300 : -300,
    opacity: 0,
  }),
};

const App: React.FC = () => {
  const { stations, loading, error, search, initialized } = useRadioBrowser();
  const { favoriteStations } = useFavorites();

  const nextStationRef = useRef<(() => void) | undefined>(undefined);
  const previousStationRef = useRef<(() => void) | undefined>(undefined);
  const stationQueueRef = useRef<Station[]>([]);

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

  // [currentMode, direction]
  // Favorites = index 0, All = index 1
  const [displayModeState, setDisplayModeState] = useState<[DisplayMode, number]>([
    "favorites",
    0,
  ]);
  const [displayMode, direction] = displayModeState;

  const setDisplayMode = (newMode: DisplayMode) => {
    if (newMode === displayMode) return;
    const newIndex = newMode === "favorites" ? 0 : 1;
    const currentIndex = displayMode === "favorites" ? 0 : 1;
    const newDirection = newIndex > currentIndex ? 1 : -1;
    setDisplayModeState([newMode, newDirection]);
  };

  const [currentSearchTerm, setCurrentSearchTerm] = useState("");

  useEffect(() => {
    // Only fetch initial stations if we haven't already and we are in 'all' mode
    if (displayMode === "all" && !initialized) {
      search("");
    }
  }, [displayMode, search, initialized]);

  const playStation = useCallback(
    (
      station: Station,
      options?: { updateQueue?: boolean; queue?: Station[] },
    ) => {
      if (options?.updateQueue) {
        stationQueueRef.current = options.queue ?? [];
      }
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
        search(query);
      }
    },
    [displayMode, search],
  );

  const moveStation = useCallback(
    (direction: "next" | "prev") => {
      const queueFromRef = stationQueueRef.current;
      const activeId = activeStation.id;

      let stationQueue = queueFromRef;
      if (!stationQueue.length || !stationQueue.some((s) => s.id === activeId)) {
        if (displayedStations.some((s) => s.id === activeId)) {
          stationQueue = displayedStations;
        } else if (favoriteStations.some((s) => s.id === activeId)) {
          stationQueue = favoriteStations;
        } else if (stations.some((s) => s.id === activeId)) {
          stationQueue = stations;
        } else {
          return;
        }
      }

      const currentIndex = stationQueue.findIndex((s) => s.id === activeId);
      if (currentIndex === -1) return;

      const step = direction === "next" ? 1 : -1;
      let cursor = currentIndex;
      for (let i = 0; i < stationQueue.length; i += 1) {
        cursor = (cursor + step + stationQueue.length) % stationQueue.length;
        const candidate = stationQueue[cursor];
        if (candidate?.streamUrl) {
          playStation(candidate);
          return;
        }
      }
    },
    [activeStation.id, displayedStations, favoriteStations, playStation, stations],
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

  const handleSelectStation = useCallback(
    (station: Station) => {
      playStation(station, { updateQueue: true, queue: displayedStations });
    },
    [displayedStations, playStation],
  );

  return (
    <div className="app-container">
      <TitleBar />
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
            {displayMode === "favorites" && (
              <motion.div
                className="active-tab-indicator"
                layoutId="activeTab"
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: "2px",
                  background: "var(--color-accent)",
                }}
              />
            )}
          </button>
          <button
            className={displayMode === "all" ? "active" : ""}
            onClick={() => setDisplayMode("all")}
          >
            All Stations
            {displayMode === "all" && (
              <motion.div
                className="active-tab-indicator"
                layoutId="activeTab"
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: "2px",
                  background: "var(--color-accent)",
                }}
              />
            )}
          </button>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          position: "relative",
          overflow: "hidden",
          width: "100%", /* Ensure full width */
        }}
      >
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={displayMode}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              background: "var(--color-bg-base)", /* Ensure background covers the other slide */
            }}
          >
            <StationList
              activeStationId={activeStation.id}
              stations={displayedStations}
              loading={displayMode === "all" ? loading : false}
              error={error || playerError}
              initialized={displayMode === "favorites" ? true : initialized}
              onSelectStation={handleSelectStation}
              search={handleSearch}
              currentSearchTerm={currentSearchTerm}
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default App;
