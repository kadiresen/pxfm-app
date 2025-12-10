import { useState, useRef, useEffect, useCallback } from "react";
import Hls from "hls.js";

interface AudioPlayerState {
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
}

export const useAudioPlayer = () => {
  const [state, setState] = useState<AudioPlayerState>({
    isPlaying: false,
    isLoading: false,
    error: null,
  });

  // We keep track of the current audio element and hls instance
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

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

  const play = useCallback(async (url: string) => {
    if (!audioRef.current || !url) return;

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

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          console.error("HLS Fatal Error:", data);
          setState((s) => ({ ...s, error: "Stream error", isLoading: false }));
          // Try to recover
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              break;
          }
        }
      });
    } else if (audio.canPlayType("application/vnd.apple.mpegurl") || !isHls) {
      // Native HLS support (Safari) or standard audio
      console.log("Using Native/Standard Audio for:", url);
      audio.src = url;
      audio.load();
      audio.play().catch((e) => console.error("Play failed:", e));
    } else {
      setState((s) => ({
        ...s,
        error: "Format not supported",
        isLoading: false,
      }));
    }
  }, []);

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
