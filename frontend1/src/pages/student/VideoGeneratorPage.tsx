import { useState } from "react";
import { useUser } from "../../context/UserContext";
import api from "../../lib/api";
import { MODE_THEMES, type ModeKey } from "../../lib/constants";
import { cn } from "../../lib/utils";
import {
  Video,
  Sparkles,
  Download,
  Loader2,
  RefreshCw,
  Layers,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type VideoMode = "adhd" | "dyslexia" | "dyscalculia" | "simplified";

const VIDEO_MODES: { key: VideoMode; label: string; emoji: string; desc: string }[] = [
  { key: "dyslexia",    label: "Dyslexia",    emoji: "📖", desc: "Calm, warm colours, slow gentle motion" },
  { key: "adhd",        label: "ADHD",        emoji: "⚡", desc: "Vibrant, engaging, bold visual focus" },
  { key: "dyscalculia", label: "Dyscalculia", emoji: "🔢", desc: "Visual math, step-by-step animation" },
  { key: "simplified",  label: "Simplified",  emoji: "✨", desc: "Simple friendly cartoon animation" },
];

interface GeneratedResult {
  id: string;
  url: string;
  mode: VideoMode;
  topic: string;
  duration: number | null;
  width: number;
  height: number;
  sizeKB: number;
  modeDescription?: string;
  generationTimeMs?: number;
}

export default function VideoGeneratorPage() {
  const { primaryNeuro } = useUser();

  const [topic, setTopic]             = useState("");
  const [concept, setConcept]         = useState("");
  const [selectedMode, setSelectedMode] = useState<VideoMode>(
    (primaryNeuro as VideoMode) || "simplified"
  );
  const [generateAll, setGenerateAll] = useState(false);

  const [loading, setLoading]   = useState(false);
  const [retryIn, setRetryIn]   = useState<number | null>(null);
  const [results, setResults]   = useState<GeneratedResult[]>([]);
  const [error, setError]       = useState<string | null>(null);

  // ─── helpers ──────────────────────────────────────────────
  function formatDuration(s: number | null) {
    if (!s) return null;
    return `${s.toFixed(1)}s`;
  }

  // ─── Single mode ──────────────────────────────────────────
  const generateSingle = async () => {
    setLoading(true);
    setError(null);
    setRetryIn(null);
    setResults([]);
    try {
      // Video generation can take 2-5 min — use a 10-minute timeout
      const res = await api.post("/api/generate-video", {
        topic:           topic.trim(),
        mode:            selectedMode,
        specificConcept: concept.trim() || undefined,
      }, { timeout: 10 * 60 * 1000 });
      const d = res.data as any;
      setResults([
        {
          id:              d.id,
          url:             d.video.url,
          mode:            d.mode,
          topic:           d.topic,
          duration:        d.video.duration,
          width:           d.video.width,
          height:          d.video.height,
          sizeKB:          d.video.sizeKB,
          modeDescription: d.modeDescription,
          generationTimeMs: d.metadata?.generationTimeMs,
        },
      ]);
    } catch (err: any) {
      const data = err?.response?.data;
      if (err?.response?.status === 503 && data?.retryAfter) {
        setRetryIn(data.retryAfter);
        setError(`Model is loading — ready in ~${data.retryAfter}s. Click Generate again to retry.`);
      } else {
        setError(data?.error || err.message || "Generation failed");
      }
    } finally {
      setLoading(false);
    }
  };

  // ─── All modes ────────────────────────────────────────────
  const generateAllModes = async () => {
    setLoading(true);
    setError(null);
    setRetryIn(null);
    setResults([]);
    try {
      // All-modes generation can take 10+ min — use a 15-minute timeout
      const res = await api.post("/api/generate-video/all", {
        topic:           topic.trim(),
        specificConcept: concept.trim() || undefined,
      }, { timeout: 15 * 60 * 1000 });
      const d = res.data as any;
      const items: GeneratedResult[] = [];
      for (const [mode, info] of Object.entries(d.modes) as [string, any][]) {
        if (info.error) continue;
        items.push({
          id:              info.id,
          url:             info.url,
          mode:            mode as VideoMode,
          topic:           d.topic,
          duration:        info.duration,
          width:           info.width,
          height:          info.height,
          sizeKB:          info.sizeKB,
          modeDescription: info.modeDescription,
          generationTimeMs: info.generationTimeMs,
        });
      }
      if (items.length === 0) {
        setError("All modes failed to generate. Try again.");
      } else {
        setResults(items);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = () => {
    if (!topic.trim()) return;
    if (generateAll) generateAllModes();
    else generateSingle();
  };

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-rose-900 via-violet-800 to-indigo-900 p-6 text-white shadow-xl">
        <div className="pointer-events-none absolute -top-8 -right-8 h-40 w-40 rounded-full bg-rose-500/20 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-violet-400/20 blur-2xl" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 border border-white/20">
            <Video className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">AI Video Generator</h1>
            <p className="text-sm text-white/60">
              Generate adaptive educational video clips via Wan2.2-T2V
            </p>
          </div>
        </div>
        {/* Generation time warning */}
        <div className="relative mt-4 flex items-center gap-2 rounded-xl bg-white/10 border border-white/20 px-3 py-2 text-xs text-white/70">
          <Clock className="h-3.5 w-3.5 shrink-0 text-yellow-300" />
          Video generation takes 2–5 minutes. Please be patient after hitting Generate.
        </div>
      </div>

      {/* ── Input Card ── */}
      <div className="glass rounded-2xl border border-white/70 dark:border-white/10 p-6 shadow-sm space-y-5">
        {/* Topic */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
            Topic *
          </label>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder='e.g. "Solar System", "Photosynthesis", "Fractions"'
            className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-2.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/25 transition-all placeholder:text-gray-400"
          />
        </div>

        {/* Specific concept (optional) */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
            Specific Concept{" "}
            <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <input
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
            placeholder={"e.g. \"Jupiter's Great Red Spot\", \"Adding fractions\""}
            className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-2.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/25 transition-all placeholder:text-gray-400"
          />
        </div>

        {/* Mode selector */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Learning Mode
            </label>
            <button
              onClick={() => setGenerateAll(!generateAll)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all border",
                generateAll
                  ? "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800"
                  : "bg-gray-50 dark:bg-white/5 text-gray-500 border-gray-200 dark:border-white/10 hover:bg-gray-100"
              )}
            >
              <Layers className="h-3 w-3" />
              All 4 Modes
            </button>
          </div>

          <AnimatePresence>
            {!generateAll && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="grid grid-cols-2 gap-2 sm:grid-cols-4"
              >
                {VIDEO_MODES.map((m) => (
                  <button
                    key={m.key}
                    onClick={() => setSelectedMode(m.key)}
                    className={cn(
                      "rounded-xl border p-3 text-left transition-all",
                      selectedMode === m.key
                        ? "border-violet-300 bg-violet-50 dark:bg-violet-900/20 shadow-sm"
                        : "border-gray-200 dark:border-white/10 hover:border-gray-300 bg-white dark:bg-white/5"
                    )}
                  >
                    <div className="text-lg mb-1">{m.emoji}</div>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                      {m.label}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 leading-snug">
                      {m.desc}
                    </p>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {generateAll && (
            <p className="text-xs text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 rounded-lg px-3 py-2 border border-violet-200 dark:border-violet-800">
              Will generate 4 videos simultaneously — one per learning mode. This may take several minutes.
            </p>
          )}
        </div>

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={!topic.trim() || loading}
          className={cn(
            "w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all shadow-md",
            topic.trim() && !loading
              ? "bg-linear-to-r from-rose-600 to-violet-600 text-white hover:from-rose-500 hover:to-violet-500 hover:shadow-violet-300/40"
              : "bg-gray-200 dark:bg-white/10 text-gray-400 cursor-not-allowed"
          )}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating{generateAll ? " 4 videos" : ""} — this takes a few minutes…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generate {generateAll ? "All Modes" : MODE_THEMES[selectedMode as ModeKey]?.label || "Video"}
            </>
          )}
        </button>
      </div>

      {/* ── Error / Retry ── */}
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            {error}
            {retryIn && (
              <span className="ml-1 font-medium text-red-500">
                (Retry in ~{retryIn}s)
              </span>
            )}
          </span>
        </div>
      )}

      {/* ── Loading skeleton ── */}
      {loading && (
        <div className={cn("grid gap-4", generateAll ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1")}>
          {Array.from({ length: generateAll ? 4 : 1 }).map((_, i) => (
            <div
              key={i}
              className="glass rounded-2xl border border-white/70 dark:border-white/10 overflow-hidden animate-pulse"
            >
              <div className="aspect-video bg-gray-200 dark:bg-white/10 flex flex-col items-center justify-center gap-3">
                <div className="flex gap-1">
                  {[0,1,2,3,4].map((b) => (
                    <div
                      key={b}
                      className="w-1.5 rounded-full bg-violet-300/60 dark:bg-violet-500/40"
                      style={{
                        height: `${18 + (b % 3) * 10}px`,
                        animationDelay: `${b * 0.12}s`,
                        animation: "soundwave 0.8s ease-in-out infinite alternate",
                      }}
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500">Generating video…</p>
              </div>
              <div className="p-4 space-y-2">
                <div className="h-4 w-24 bg-gray-200 dark:bg-white/10 rounded" />
                <div className="h-3 w-40 bg-gray-100 dark:bg-white/5 rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Results ── */}
      {!loading && results.length > 0 && (
        <div className={cn("grid gap-4", results.length > 1 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1")}>
          {results.map((vid) => {
            const theme = MODE_THEMES[vid.mode as ModeKey];
            return (
              <motion.div
                key={vid.id || vid.mode}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-2xl border border-white/70 dark:border-white/10 overflow-hidden shadow-sm group"
              >
                {/* Video player */}
                <div className="relative aspect-video bg-gray-900 overflow-hidden">
                  <video
                    src={vid.url}
                    controls
                    loop
                    preload="metadata"
                    className="h-full w-full object-contain"
                  />
                  {/* Mode badge */}
                  <div className="absolute top-3 left-3 pointer-events-none">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold backdrop-blur-sm border shadow-sm",
                        theme?.badge || "bg-gray-100 text-gray-700",
                        "bg-opacity-90"
                      )}
                    >
                      {theme?.emoji} {theme?.label || vid.mode}
                    </span>
                  </div>
                  {/* Download link */}
                  <a
                    href={vid.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white/90 dark:bg-black/60 text-gray-700 dark:text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-white border border-white/50 z-10"
                    title="Download video"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                </div>

                {/* Info row */}
                <div className="p-4">
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">
                    {vid.topic}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 flex-wrap">
                    <span>{vid.width}×{vid.height}</span>
                    {vid.sizeKB   && <span>{vid.sizeKB} KB</span>}
                    {vid.duration && (
                      <span className="flex items-center gap-0.5">
                        <Clock className="h-3 w-3" />
                        {formatDuration(vid.duration)}
                      </span>
                    )}
                    {vid.generationTimeMs && (
                      <span className="flex items-center gap-0.5">
                        <RefreshCw className="h-3 w-3" />
                        {(vid.generationTimeMs / 1000).toFixed(0)}s gen
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
