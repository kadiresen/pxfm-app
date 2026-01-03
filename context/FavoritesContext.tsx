import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
  useRef,
} from "react";
import { Store } from "@tauri-apps/plugin-store";
import { Station } from "../components/StationList/StationList";

const FAVORITES_STORAGE_KEY = "favoriteStations";
const FAVORITES_STORE_PATH = "favorites.json";

const readLocalFavorites = () => {
  try {
    const storedFavorites = localStorage.getItem(FAVORITES_STORAGE_KEY);
    return storedFavorites ? JSON.parse(storedFavorites) : [];
  } catch (error) {
    console.error("Failed to parse favorites from localStorage", error);
    return [];
  }
};

const isTauriRuntime =
  typeof window !== "undefined" && "__TAURI__" in window;

interface FavoritesContextType {
  favoriteStations: Station[];
  addFavorite: (station: Station) => void;
  removeFavorite: (stationId: string) => void;
  isFavorite: (stationId: string) => boolean;
}

export const FavoritesContext = createContext<FavoritesContextType | undefined>(
  undefined,
);

export const FavoritesProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [favoriteStations, setFavoriteStations] = useState<Station[]>(
    readLocalFavorites,
  );
  const storeRef = useRef<Store | null>(null);
  const [storeReady, setStoreReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadFavorites = async () => {
      const localFavorites = readLocalFavorites();
      if (isTauriRuntime) {
        try {
          const store = await Store.load(FAVORITES_STORE_PATH);
          storeRef.current = store;
          const stored = await store.get<Station[]>(FAVORITES_STORAGE_KEY);
          if (!cancelled) {
            if (stored && Array.isArray(stored)) {
              setFavoriteStations(stored);
            } else if (localFavorites.length) {
              await store.set(FAVORITES_STORAGE_KEY, localFavorites);
              await store.save();
            }
          }
        } catch (error) {
          console.error("Failed to load favorites from store", error);
        }
      }
      if (!cancelled) {
        setStoreReady(true);
      }
    };

    loadFavorites();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!storeReady) return;
    try {
      localStorage.setItem(
        FAVORITES_STORAGE_KEY,
        JSON.stringify(favoriteStations),
      );
    } catch (error) {
      console.error("Failed to save favorites to localStorage", error);
    }

    if (storeRef.current) {
      storeRef.current.set(FAVORITES_STORAGE_KEY, favoriteStations);
      storeRef.current.save().catch((error) => {
        console.error("Failed to save favorites to store", error);
      });
    }
  }, [favoriteStations, storeReady]);

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

  const value = useMemo(
    () => ({
      favoriteStations: sortedFavorites,
      addFavorite,
      removeFavorite,
      isFavorite,
    }),
    [sortedFavorites, addFavorite, removeFavorite, isFavorite],
  );

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
};
