import { useState, useEffect, useCallback, useMemo } from "react";
import { Station } from "../components/StationList/StationList";

const FAVORITES_STORAGE_KEY = "favoriteStations";

export const useFavorites = () => {
  const [favoriteStations, setFavoriteStations] = useState<Station[]>(() => {
    try {
      const storedFavorites = localStorage.getItem(FAVORITES_STORAGE_KEY);
      return storedFavorites ? JSON.parse(storedFavorites) : [];
    } catch (error) {
      console.error("Failed to parse favorites from localStorage", error);
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(
        FAVORITES_STORAGE_KEY,
        JSON.stringify(favoriteStations),
      );
    } catch (error) {
      console.error("Failed to save favorites to localStorage", error);
    }
  }, [favoriteStations]);

  const addFavorite = useCallback((station: Station) => {
    setFavoriteStations((prev) => {
      if (!prev.some((fav) => fav.id === station.id)) {
        return [...prev, station];
      }
      return prev;
    });
  }, []);

  const removeFavorite = useCallback((stationId: string) => {
    setFavoriteStations((prev) => prev.filter((fav) => fav.id !== stationId));
  }, []);

  const isFavorite = useCallback(
    (stationId: string) =>
      favoriteStations.some((fav) => fav.id === stationId),
    [favoriteStations],
  );

  const sortedFavorites = useMemo(() => {
    return [...favoriteStations].sort((a, b) => a.name.localeCompare(b.name));
  }, [favoriteStations]);

  return {
    favoriteStations: sortedFavorites, // Expose sorted list
    addFavorite,
    removeFavorite,
    isFavorite,
  };
};
