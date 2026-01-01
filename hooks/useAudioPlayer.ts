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
  const { onNextStation, onPreviousStation } = controls ?? {};

  useEffect(() => {
    // Initialize audio element on mount
    const audio = new Audio();
    audioRef.current = audio;

    const onPlay = () =>
      setState((s) => ({ ...s, isPlaying: true, isLoading: false }));
    const onPause = () =>
      setState((s) => ({ ...s, isPlaying: false, isLoading: false }));
    const onWaiting = () => setState((s) => ({ ...s, isLoading: true }));
    const onError = (e: Event) => {
      console.error("Audio error:", e);
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
    audio.addEventListener("error", onError);

    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("playing", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("waiting", onWaiting);
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

          // Capacitor stores assets in 'public' folder inside 'assets'
          // Plugin typically looks for 'www' or root.
          // Try relative path 'public/assets/imgs/logo.png' if plugin prepends nothing
          // Or just 'assets/imgs/logo.png' if served via http.
          // But specific error was "www//assets/...".
          // If we pass 'public/assets/...' it might become 'www/public/assets/...'.
          // Let's try 'public/assets/imgs/logo.png' first as safe bet for Capacitor 'public' folder structure
          // BUT wait, looking at the log: java.io.FileNotFoundException: www//assets/imgs/logo.png
          // It seems the plugin PREPENDS "www/".
          // In Capacitor, the web assets are in "public/".
          // So we simply cannot point to it if the plugin hardcodes "www/".
          // We need to check if the plugin allows "file://" or another prefix?
          // Or we use a patch to fix the "www/" hardcoding in Java.
          // Actually, let's look at the Java code I read earlier.
          // It had "www". I should patch it to "public" for Capacitor!

          controls.create(
            {
              track: storedMetadata.title,
              artist: storedMetadata.artist,
              cover: storedMetadata.artwork || "assets/imgs/logo.png", // Try without slash, relying on patch I will make
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
      const audio = audioRef.current;

      // Cleanup previous HLS instance if exists
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      // Logic to determine if we need HLS.js
      const isHls = url.includes(".m3u8") || url.includes("/hls/");

      if (isHls && Hls.isSupported()) {
        console.log("Using HLS.js for:", url);
        const hls = new Hls();
        hlsRef.current = hls;
        hls.loadSource(url);
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
              // Hls.js failed (likely CORS or strict browser policies).
              // Fallback to setting audio.src directly allows Android/iOS native player to take over.
              // This works like VLC: it bypasses browser CORS and can play the audio track of video streams.
              hls.destroy();
              hlsRef.current = null;

              if (audioRef.current) {
                audioRef.current.src = url;
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
        console.log("Using Native/Standard Audio for:", url);

        // Shoutcast/Icecast compatibility:
        // Only append ';' if the URL is the root (no path), because that's where the HTML Status Page usually lives.
        // If there is a deep path (e.g. /stream, /mountpoint, /file.mp3), it's a direct resource that shouldn't be modified.
        let finalUrl = url;
        try {
          const urlObj = new URL(url);
          // If pathname is just "/" (or empty), it's a root URL like http://host:port/ -> Needs fix
          if (urlObj.pathname === "/" || urlObj.pathname === "") {
            finalUrl = url.endsWith("/") ? `${url};` : `${url}/;`;
          }
        } catch (e) {
          // Fallback for invalid URLs: leave as is
        }

        audio.src = finalUrl;
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
