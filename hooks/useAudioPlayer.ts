import { useState, useRef, useEffect, useCallback } from "react";
import Hls from "hls.js";
import { invoke } from "@tauri-apps/api/core";

interface AudioPlayerState {
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AudioPlayerControls {
  onNextStation?: () => void;
  onPreviousStation?: () => void;
}

export const useAudioPlayer = (controls?: AudioPlayerControls) => {
  const [state, setState] = useState<AudioPlayerState>({
    isPlaying: false,
    isLoading: false,
    error: null,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const metadataRef = useRef<{ title: string; artist: string; artwork: string } | null>(null);
  const { onNextStation, onPreviousStation } = controls ?? {};

  // Helper to sync with Android Native Media Session
  const syncNativeMediaSession = useCallback(async (isPlaying: boolean) => {
    try {
      if (isPlaying && metadataRef.current) {
        await invoke("play", {
          title: metadataRef.current.title,
          artist: metadataRef.current.artist,
          artwork: metadataRef.current.artwork,
        });
      } else if (!isPlaying) {
        await invoke("stop");
      }
    } catch (e) {
      // Not on Android or permission missing, ignore
      console.debug("Native media sync ignored:", e);
    }
  }, []);

  const nextStationRef = useRef(onNextStation);
  const prevStationRef = useRef(onPreviousStation);

  useEffect(() => {
    nextStationRef.current = onNextStation;
    prevStationRef.current = onPreviousStation;
  }, [onNextStation, onPreviousStation]);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "auto";
    audioRef.current = audio;

    const onPlay = () => {
      setState((s) => ({ ...s, isPlaying: true, isLoading: false }));
      if ("mediaSession" in navigator) {
        navigator.mediaSession.playbackState = "playing";
      }
      syncNativeMediaSession(true);
    };

    const onPause = () => {
      setState((s) => ({ ...s, isPlaying: false, isLoading: false }));
      if ("mediaSession" in navigator) {
        navigator.mediaSession.playbackState = "paused";
      }
      syncNativeMediaSession(false);
    };

    const onWaiting = () => setState((s) => ({ ...s, isLoading: true }));
    const onCanPlay = () => setState((s) => ({ ...s, isLoading: false }));
    const onError = (e: any) => {
      console.error("Audio Playback Error:", e);
      setState((s) => ({
        ...s,
        error: "Playback failed",
        isPlaying: false,
        isLoading: false,
      }));
      syncNativeMediaSession(false);
    };

    audio.addEventListener("play", onPlay);
    audio.addEventListener("playing", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("canplay", onCanPlay);
    audio.addEventListener("error", onError);

    // Setup Media Session Handlers
    if ("mediaSession" in navigator) {
      navigator.mediaSession.setActionHandler("play", () => audio.play());
      navigator.mediaSession.setActionHandler("pause", () => audio.pause());
      navigator.mediaSession.setActionHandler("stop", () => {
        audio.pause();
        audio.currentTime = 0;
      });
      navigator.mediaSession.setActionHandler("previoustrack", () => prevStationRef.current?.());
      navigator.mediaSession.setActionHandler("nexttrack", () => nextStationRef.current?.());
    }

    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("playing", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("error", onError);

      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      audio.pause();
      audio.src = "";
      syncNativeMediaSession(false);
      audioRef.current = null;
    };
  }, [syncNativeMediaSession]);

  const play = useCallback(
    async (url: string, metadata?: { title: string; artist: string; artwork: string }) => {
      if (!audioRef.current || !url) return;

      if (metadata) {
        metadataRef.current = metadata;
        if ("mediaSession" in navigator) {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: metadata.title,
            artist: metadata.artist,
            artwork: [
              { src: metadata.artwork, sizes: "512x512", type: "image/png" }
            ],
          });
        }
      }

      setState((s) => ({ ...s, isLoading: true, error: null }));

      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      let streamUrl = url.trim();

      // Force HTTPS for better compatibility with modern browser security
      if (streamUrl.startsWith("http://")) {
        streamUrl = streamUrl.replace("http://", "https://");
      }

      // Shoutcast/Icecast Suffix Trick:
      // Naked URLs often serve an HTML status page. Appending '/;' or '/stream' 
      // forces the server to return the raw audio binary that regulators expect.
      try {
        const u = new URL(streamUrl);
        if (u.pathname === "/" || u.pathname === "") {
          streamUrl = streamUrl.endsWith("/") ? streamUrl + ";" : streamUrl + "/;";
        }
      } catch (e) {
        // Fallback for invalid URLs
      }

      console.log("Playing station URL:", streamUrl);
      const player = audioRef.current;
      player.crossOrigin = "anonymous";

      const lowerUrl = streamUrl.toLowerCase();
      const isHls = lowerUrl.includes(".m3u8") ||
        lowerUrl.includes("/hls/") ||
        lowerUrl.includes("playlist") ||
        lowerUrl.includes(".m3u") ||
        lowerUrl.includes(".pls");

      if (isHls && Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
        });
        hlsRef.current = hls;
        hls.loadSource(streamUrl);
        hls.attachMedia(player);
        hls.on(Hls.Events.MANIFEST_PARSED, () => player.play());
        hls.on(Hls.Events.ERROR, (_, data) => {
          console.error("HLS Error:", data);
          if (data.fatal) {
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
              hls.startLoad();
            } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              hls.recoverMediaError();
            } else {
              hls.destroy();
              setState((s) => ({ ...s, error: "Stream error", isLoading: false }));
            }
          }
        });
      } else {
        player.src = streamUrl;
        player.load();
        player.play().catch(console.error);
      }
    },
    []
  );

  const pause = useCallback(() => audioRef.current?.pause(), []);

  const toggle = useCallback(() => {
    if (state.isPlaying) {
      pause();
    } else if (audioRef.current?.src) {
      audioRef.current.play().catch(console.error);
    }
  }, [state.isPlaying, pause]);

  return {
    isPlaying: state.isPlaying,
    isLoading: state.isLoading,
    error: state.error,
    play,
    pause,
    toggle,
  };
};
