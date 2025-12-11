import React, { useState, useEffect, useCallback, useRef } from "react";
import { SplashScreen } from "@capacitor/splash-screen";
import PlayerView from "./components/Player/PlayerView";
import StationList, { Station } from "./components/StationList/StationList";
import { useAudioPlayer } from "./hooks/useAudioPlayer";
import { useRadioBrowser } from "./hooks/useRadioBrowser";

const App: React.FC = () => {
  // Hide splash screen on mount
  useEffect(() => {
    const hideSplashScreen = async () => {
      try {
        await SplashScreen.hide();
      } catch (err) {
        console.error("Failed to hide splash screen", err);
      }
    };
    hideSplashScreen();
  }, []);

  const { stations, loading, error, search, initialized } = useRadioBrowser();
  const nextStationRef = useRef<() => void>();
  const previousStationRef = useRef<() => void>();

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

  useEffect(() => {
    search("");
  }, [search]);

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
    [play]
  );

  const moveStation = useCallback(
    (direction: "next" | "prev") => {
      if (!stations.length) return;
      const currentIndex = stations.findIndex(
        (station) => station.id === activeStation.id
      );
      if (currentIndex === -1) return;

      const step = direction === "next" ? 1 : -1;
      let cursor = currentIndex;
      for (let i = 0; i < stations.length; i += 1) {
        cursor = (cursor + step + stations.length) % stations.length;
        const candidate = stations[cursor];
        if (candidate?.streamUrl) {
          playStation(candidate);
          return;
        }
      }
    },
    [activeStation.id, playStation, stations]
  );

  const handleNextStation = useCallback(
    () => moveStation("next"),
    [moveStation]
  );
  const handlePreviousStation = useCallback(
    () => moveStation("prev"),
    [moveStation]
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
      <StationList
        activeStationId={activeStation.id}
        stations={stations}
        loading={loading}
        error={error || playerError}
        initialized={initialized}
        onSelectStation={playStation}
        search={search}
      />
    </div>
  );
};

export default App;
