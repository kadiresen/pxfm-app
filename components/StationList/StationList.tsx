import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Loader2 } from "lucide-react";
import "./StationList.scss";

export interface Station {
  id: string;
  name: string;
  genre: string;
  image?: string;
  streamUrl?: string;
}

interface Props {
  activeStationId: string;
  stations: Station[];
  loading: boolean;
  error: string | null;
  initialized: boolean;
  onSelectStation: (station: Station) => void;
  search: (query: string) => void;
}

const StationList: React.FC<Props> = ({
  activeStationId,
  stations,
  loading,
  error,
  initialized,
  onSelectStation,
  search,
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      search(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, search]);

  return (
    <div className="station-list-embedded">
      <div className="search-bar-container">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search stations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="station-list-content">
        {loading && (
          <div className="loading-state">
            <Loader2 size={32} className="animate-spin" />
          </div>
        )}

        {!loading && error && (
          <div className="empty-state">
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && initialized && stations.length === 0 && (
          <div className="empty-state">
            <p>No stations found.</p>
          </div>
        )}

        {!loading &&
          stations.map((station, index) => {
            const isActive = station.id === activeStationId;
            return (
              <motion.div
                key={station.id}
                className={`station-item-row ${isActive ? "active" : ""}`}
                onClick={() => onSelectStation(station)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="station-icon-small">
                  {station.image ? (
                    <img
                      src={station.image}
                      alt={station.name}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                        (
                          e.target as HTMLImageElement
                        ).nextElementSibling?.classList.remove("hidden");
                      }}
                    />
                  ) : null}
                  <span
                    className={`placeholder ${station.image ? "hidden" : ""}`}
                  >
                    {station.name.substring(0, 1)}
                  </span>
                </div>
                <div className="station-info-row">
                  <h4>{station.name}</h4>
                  <p>{station.genre}</p>
                </div>
                {isActive && (
                  <div className="playing-indicator">
                    <div className="bar bar-1"></div>
                    <div className="bar bar-2"></div>
                    <div className="bar bar-3"></div>
                  </div>
                )}
              </motion.div>
            );
          })}
      </div>
    </div>
  );
};

export default StationList;
