import React, { useState, useEffect } from "react";
import { SplashScreen } from "@capacitor/splash-screen";
import PlayerView from "./components/Player/PlayerView";
import StationList, { Station } from "./components/StationList/StationList";
import { useAudioPlayer } from "./hooks/useAudioPlayer";

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

  // Audio Player Hook
  const { isPlaying, isLoading, error, play, toggle } = useAudioPlayer();

  // Initial placeholder station
  const [activeStation, setActiveStation] = useState<Station>({
    id: "default",
    name: "Select a Station",
    genre: "Radio",
    image: "",
    streamUrl: "",
  });

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
        onSelectStation={(station) => {
          setActiveStation(station);
          if (station.streamUrl) {
            play(station.streamUrl, {
              title: station.name,
              artist: station.genre,
              artwork: station.image,
            });
          }
        }}
      />
    </div>
  );
};

export default App;
