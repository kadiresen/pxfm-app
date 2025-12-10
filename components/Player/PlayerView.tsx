import React from "react";
import { motion } from "framer-motion";
import { Play, Pause } from "lucide-react";
import { Station } from "../StationList/StationList";
import "./Player.scss";

interface Props {
  station: Station;
  isPlaying: boolean;
  isLoading: boolean;
  onTogglePlay: () => void;
}

const PlayerView: React.FC<Props> = ({
  station,
  isPlaying,
  isLoading,
  onTogglePlay,
}) => {
  const [imageError, setImageError] = React.useState(false);

  // Reset error state when station changes
  React.useEffect(() => {
    setImageError(false);
  }, [station.id]);

  const indicatorState = isLoading ? "buffering" : isPlaying ? "live" : "";

  return (
    <div className="player-view-minimal">
      <div className="player-bg-glow" />

      <div className="app-header-logo">
        <img src="/assets/imgs/logo.png" alt="pxfm logo" />
      </div>

      <div className="station-info-minimal">
        <div className="content-wrapper">
          <div className="text-content-static">
            <div
              className={["status-indicator", indicatorState].filter(Boolean).join(" ")}
            >
              <span className="status-bar" aria-hidden="true"></span>
              <span className="status-text">LIVE</span>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={station.id}
            className="station-details-anim"
          >
            <div className="station-logo">
              {station.image && !imageError ? (
                <img
                  src={station.image}
                  alt={station.name}
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="logo-placeholder">
                  {station.id === "default"
                    ? "PX"
                    : station.name.substring(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <div className="text-info">
              <h2>{station.name}</h2>
              <p>{station.genre}</p>
            </div>
          </motion.div>
        </div>
      </div>

      <motion.button
        whileTap={{ scale: 0.95 }}
        className="play-btn-minimal"
        onClick={onTogglePlay}
      >
        {isPlaying ? (
          <Pause size={24} fill="white" />
        ) : (
          <Play size={24} fill="white" className="play-icon-offset" />
        )}
      </motion.button>
    </div>
  );
};

export default PlayerView;
