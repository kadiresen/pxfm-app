import { useState, useRef, useEffect, useCallback } from "react";
import Hls from "hls.js";

interface AudioPlayerState {
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AudioPlayerControls {
  onNextStation?: () => void;
  onPreviousStation?: () => void;
}

declare global {
  interface Window {
    MusicControls?: any;
  }
}

const getMusicControls = () =>
  typeof window !== "undefined" ? window.MusicControls : undefined;

export const useAudioPlayer = (controls?: AudioPlayerControls) => {
  const [state, setState] = useState<AudioPlayerState>({
    isPlaying: false,
    isLoading: false,
    error: null,
  });

  // We keep track of the current audio element and hls instance
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const metadataRef = useRef<{
    title: string;
    artist: string;
    artwork: string;
  } | null>(null);
  const musicControlsSubscription = useRef<{ unsubscribe?: () => void } | null>(
    null
  );
  const playingRef = useRef(false);
  const retryRef = useRef(false); // Track if we've attempted the shoutcast hack
  const lastProgressAtRef = useRef(0);
  const lastTimeRef = useRef(0);
  const { onNextStation, onPreviousStation } = controls ?? {};

  useEffect(() => {
    // Initialize audio element on mount
    const audio = new Audio();
    audioRef.current = audio;

    const onPlay = () =>
      setState((s) => ({ ...s, isPlaying: true, isLoading: false }));
    const onPause = () =>
      setState((s) => ({ ...s, isPlaying: false, isLoading: false }));
    const onWaiting = () => {
      const audioEl = audioRef.current;
      if (audioEl && !audioEl.paused) {
        const now = performance.now();
        if (now - lastProgressAtRef.current < 1200) {
          return;
        }
      }
      setState((s) => ({ ...s, isLoading: true }));
    };
    const onTimeUpdate = () => {
      const audioEl = audioRef.current;
      if (!audioEl) return;
      if (audioEl.currentTime > lastTimeRef.current + 0.01) {
        lastTimeRef.current = audioEl.currentTime;
        lastProgressAtRef.current = performance.now();
        setState((s) => ({
          ...s,
          isPlaying: !audioEl.paused,
          isLoading: false,
        }));
      }
    };
    const onCanPlay = () =>
      setState((s) => ({ ...s, isLoading: false }));
    
    const onError = (e: Event) => {
      console.error("Audio error:", e);

      // Smart Retry Logic for Shoutcast/Icecast
      // If native playback fails on a clean URL, try appending ';' (Shoutcast hack)
      if (
        !hlsRef.current && // Only for native playback
        !retryRef.current && // Only retry once per play session
        audioRef.current &&
        audioRef.current.src
      ) {
        const currentSrc = audioRef.current.src;
        // If the URL does NOT end with ';', try adding it.
        // (Browser normalizes src, so check carefully)
        if (!currentSrc.endsWith(";")) {
          console.log("Retrying with Shoutcast hack (;)...");
          retryRef.current = true;
          // Append ';' (handling potential trailing slash)
          const retryUrl = currentSrc.endsWith("/")
            ? `${currentSrc};`
            : `${currentSrc}/;`;

          audioRef.current.src = retryUrl;
          audioRef.current.load();
          audioRef.current.play().catch(console.error);
          return; // Prevent setting error state immediately
        }
      }

      setState((s) => ({
        ...s,
        error: "Playback error",
        isLoading: false,
        isPlaying: false,
      }));
    };

    audio.addEventListener("play", onPlay);
    audio.addEventListener("playing", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("canplay", onCanPlay);
    audio.addEventListener("canplaythrough", onCanPlay);
    audio.addEventListener("error", onError);

    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("playing", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("canplaythrough", onCanPlay);
      audio.removeEventListener("error", onError);

      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
      audio.pause();
      audio.src = "";
    };
  }, []);

  useEffect(() => {
    // Media Session Action Handlers
    if ("mediaSession" in navigator) {
      navigator.mediaSession.setActionHandler("play", () => {
        audioRef.current?.play();
      });
      navigator.mediaSession.setActionHandler("pause", () => {
        audioRef.current?.pause();
      });
      navigator.mediaSession.setActionHandler("stop", () => {
        audioRef.current?.pause(); // No native stop, just pause
      });
    }
    return () => {
      if ("mediaSession" in navigator) {
        navigator.mediaSession.setActionHandler("play", null);
        navigator.mediaSession.setActionHandler("pause", null);
        navigator.mediaSession.setActionHandler("stop", null);
      }
    };
  }, []);

  useEffect(() => {
    if ("mediaSession" in navigator) {
      navigator.mediaSession.setActionHandler("previoustrack", () => {
        onPreviousStation?.();
      });
      navigator.mediaSession.setActionHandler("nexttrack", () => {
        onNextStation?.();
      });
    }
    return () => {
      if ("mediaSession" in navigator) {
        navigator.mediaSession.setActionHandler("previoustrack", null);
        navigator.mediaSession.setActionHandler("nexttrack", null);
      }
    };
  }, [onNextStation, onPreviousStation]);

  useEffect(() => {
    // Sync playback state
    if ("mediaSession" in navigator) {
      navigator.mediaSession.playbackState = state.isPlaying
        ? "playing"
        : "paused";
    }
    const controls = getMusicControls();
    if (controls) {
      controls.updateIsPlaying(state.isPlaying);
    }
    playingRef.current = state.isPlaying;
  }, [state.isPlaying]);

  useEffect(() => {
    const controls = getMusicControls();
    return () => {
      if (musicControlsSubscription.current) {
        musicControlsSubscription.current.unsubscribe?.();
      }
      if (controls) {
        controls.destroy();
      }
    };
  }, []);

  const play = useCallback(
    async (
      url: string,
      metadata?: { title: string; artist: string; artwork: string }
    ) => {
      if (!audioRef.current || !url) return;

      // Sanitize URL: Start with a "clean" URL (no trailing ';')
      // This fixes stations like radyo45lik that fail with the hack.
      // We will fallback to adding ';' in onError if this fails.
      const cleanUrl = url.endsWith(";") ? url.slice(0, -1) : url;

      const storedMetadata = metadata ?? metadataRef.current;
      if (storedMetadata) {
        metadataRef.current = storedMetadata;
        const controls = getMusicControls();
        if (controls) {
          controls.destroy();

          const onSuccess = () => {
            // controls created
          };
          const onError = (e: any) => {
            console.warn("MusicControls creation failed", e);
          };

          controls.create(
            {
              track: storedMetadata.title,
              artist: storedMetadata.artist,
              cover: storedMetadata.artwork || "assets/imgs/logo.png",
              isPlaying: state.isPlaying,
              dismissable: false,
              hasPrev: Boolean(onPreviousStation),
              hasNext: Boolean(onNextStation),
              hasClose: false,
              ticker: storedMetadata.title,
            },
            onSuccess,
            onError
          );

          controls.subscribe((action: any) => {
            try {
              const message = JSON.parse(action).message;
              switch (message) {
                case "music-controls-next":
                case "music-controls-media-button-next":
                  onNextStation?.();
                  break;
                case "music-controls-previous":
                case "music-controls-media-button-previous":
                  onPreviousStation?.();
                  break;
                case "music-controls-play":
                case "music-controls-media-button-play":
                  audioRef.current?.play();
                  setState((s) => ({ ...s, isPlaying: true, isLoading: false }));
                  break;
                case "music-controls-pause":
                case "music-controls-media-button-pause":
                  audioRef.current?.pause();
                  setState((s) => ({ ...s, isPlaying: false, isLoading: false }));
                  break;
                case "music-controls-toggle-play-pause":
                case "music-controls-media-button-play-pause":
                  if (playingRef.current) {
                    audioRef.current?.pause();
                    setState((s) => ({
                      ...s,
                      isPlaying: false,
                      isLoading: false,
                    }));
                  } else {
                    audioRef.current?.play();
                    setState((s) => ({
                      ...s,
                      isPlaying: true,
                      isLoading: false,
                    }));
                  }
                  break;
                default:
                  break;
              }
            } catch (err) {
              console.warn("MusicControls payload parse failed", err);
            }
          });

          controls.listen();
        }
      }

      // Update Media Session Metadata
      if ("mediaSession" in navigator && metadata) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: metadata.title,
          artist: metadata.artist,
          artwork: [
            {
              src: metadata.artwork || "/assets/imgs/logo.png",
              sizes: "96x96",
              type: "image/png",
            },
            {
              src: metadata.artwork || "/assets/imgs/logo.png",
              sizes: "128x128",
              type: "image/png",
            },
            {
              src: metadata.artwork || "/assets/imgs/logo.png",
              sizes: "192x192",
              type: "image/png",
            },
            {
              src: metadata.artwork || "/assets/imgs/logo.png",
              sizes: "256x256",
              type: "image/png",
            },
            {
              src: metadata.artwork || "/assets/imgs/logo.png",
              sizes: "384x384",
              type: "image/png",
            },
            {
              src: metadata.artwork || "/assets/imgs/logo.png",
              sizes: "512x512",
              type: "image/png",
            },
          ],
        });
      }

      setState((s) => ({ ...s, isLoading: true, error: null }));
      retryRef.current = false; // Reset retry state for new track
      const audio = audioRef.current;

      // Cleanup previous HLS instance if exists
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      // Logic to determine if we need HLS.js
      const isHls = cleanUrl.includes(".m3u8") || cleanUrl.includes("/hls/");

      if (isHls && Hls.isSupported()) {
        console.log("Using HLS.js for:", cleanUrl);
        const hls = new Hls();
        hlsRef.current = hls;
        hls.loadSource(cleanUrl);
        hls.attachMedia(audio);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          audio.play().catch((e) => console.error("Play failed:", e));
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            console.error("HLS Fatal Error:", data);
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
              console.log(
                "HLS Network Error (CORS?), falling back to native audio..."
              );
              // Hls.js failed. Fallback to native audio.
              hls.destroy();
              hlsRef.current = null;

              if (audioRef.current) {
                audioRef.current.src = cleanUrl;
                audioRef.current.load();
                audioRef.current.play().catch((e) => {
                  console.error("Native fallback failed:", e);
                  setState((s) => ({
                    ...s,
                    error: "Stream unavailable",
                    isLoading: false,
                  }));
                });
              }
            } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              hls.recoverMediaError();
            } else {
              hls.destroy();
              setState((s) => ({
                ...s,
                error: "Stream error",
                isLoading: false,
              }));
            }
          }
        });
      } else if (audio.canPlayType("application/vnd.apple.mpegurl") || !isHls) {
        // Native HLS support (Safari) or standard audio
        console.log("Using Native/Standard Audio for:", cleanUrl);

        audio.src = cleanUrl;
        audio.load();
        audio.play().catch((e) => console.error("Play failed:", e));
      } else {
        setState((s) => ({
          ...s,
          error: "Format not supported",
          isLoading: false,
        }));
      }
    },
    [onNextStation, onPreviousStation, state.isPlaying]
  );

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

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
