import React, { useState } from "react";
import PlayerView from "./components/Player/PlayerView";
import StationList, { Station } from "./components/StationList/StationList";
import { useAudioPlayer } from "./hooks/useAudioPlayer";

const App: React.FC = () => {
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
        onTogglePlay={toggle}
      />
      <StationList
        activeStationId={activeStation.id}
        onSelectStation={(station) => {
          setActiveStation(station);
          if (station.streamUrl) {
            play(station.streamUrl);
          }
        }}
      />
    </div>
  );
};

export default App;
