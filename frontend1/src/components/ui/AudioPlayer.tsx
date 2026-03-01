/**
 * AudioPlayer — ElevenLabs AI voice component
 *
 * Variants:
 *   "button"  → full pill button with label  (lesson narration, chat read-aloud)
 *   "icon"    → compact icon button           (word pronunciation chips)
 *   "word"    → uses /api/tts/word endpoint  (single word pronunciation)
 */
import { useEffect, useRef, useState } from "react";
import api from "../../lib/api";
import { Volume2, VolumeX, Loader2, Pause } from "lucide-react";
import { cn } from "../../lib/utils";

type Variant = "button" | "icon" | "word";

interface AudioPlayerProps {
  /** Text to narrate — or omit if variant="word" and `word` is provided */
  text?: string;
  /** Single word to pronounce (variant="word") */
  word?: string;
  /** Neuro mode — controls voice (dyslexia=Rachel, adhd=Domi, etc.) */
  mode?: string;
  variant?: Variant;
  label?: string;
  className?: string;
}

export default function AudioPlayer({
  text,
  word,
  mode,
  variant = "button",
  label = "Listen",
  className,
}: AudioPlayerProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "playing" | "paused">("idle");
  const [error, setError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  const stop = () => {
    audioRef.current?.pause();
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    audioRef.current = null;
    setStatus("idle");
  };

  const toggle = async () => {
    setError(false);

    // If already playing → pause
    if (status === "playing") {
      audioRef.current?.pause();
      setStatus("paused");
      return;
    }

    // If paused and audio still loaded → resume
    if (status === "paused" && audioRef.current) {
      void audioRef.current.play();
      setStatus("playing");
      return;
    }

    // Fetch new audio
    setStatus("loading");
    try {
      let blob: Blob;

      if (variant === "word" && word) {
        // Word pronunciation endpoint
        const res = await api.post("/api/tts/word", { word }, { responseType: "blob" });
        blob = res.data as Blob;
      } else {
        const payload = text ?? word ?? "";
        if (!payload.trim()) { setStatus("idle"); return; }
        const res = await api.post("/api/tts", { text: payload, mode }, { responseType: "blob" });
        blob = res.data as Blob;
      }

      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = stop;
      audio.onerror = () => { setError(true); stop(); };

      await audio.play();
      setStatus("playing");
    } catch {
      setError(true);
      setStatus("idle");
    }
  };

  // ── Icon-only variant (compact, used in word chips) ──────────
  if (variant === "icon" || variant === "word") {
    return (
      <button
        type="button"
        onClick={toggle}
        title={word ? `Pronounce "${word}"` : "Listen"}
        className={cn(
          "inline-flex h-5 w-5 items-center justify-center rounded-full transition-all",
          status === "playing"
            ? "bg-violet-200 text-violet-700"
            : error
            ? "text-gray-300 cursor-not-allowed"
            : "text-amber-600 hover:bg-amber-100",
          className
        )}
        disabled={status === "loading" || error}
      >
        {status === "loading" ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : status === "playing" ? (
          <Pause className="h-3 w-3" />
        ) : (
          <Volume2 className="h-3 w-3" />
        )}
      </button>
    );
  }

  // ── Full button variant ────────────────────────────────────────
  const loading = status === "loading";
  const playing = status === "playing";
  const paused = status === "paused";

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading || error}
      className={cn(
        "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all",
        playing || paused
          ? "bg-violet-600 text-white shadow-lg shadow-violet-400/30"
          : error
          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
          : "bg-gradient-to-r from-rose-500 to-orange-400 text-white shadow-md shadow-rose-400/30 hover:shadow-lg hover:-translate-y-0.5",
        className
      )}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : playing ? (
        <Pause className="h-4 w-4" />
      ) : error ? (
        <VolumeX className="h-4 w-4" />
      ) : (
        <Volume2 className="h-4 w-4" />
      )}
      <span>
        {loading ? "Generating audio…" : playing ? "Pause" : paused ? "Resume" : error ? "Audio unavailable" : label}
      </span>
      {playing && (
        <span className="flex gap-0.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-0.5 rounded-full bg-white/70"
              style={{
                height: "12px",
                animation: `soundwave 0.8s ease-in-out ${i * 0.15}s infinite alternate`,
              }}
            />
          ))}
        </span>
      )}
    </button>
  );
}
