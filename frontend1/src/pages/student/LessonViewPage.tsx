import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useUser } from "../../context/UserContext";
import { PageSpinner } from "../../components/ui";
import AudioPlayer from "../../components/ui/AudioPlayer";
import api from "../../lib/api";
import type { Lesson } from "../../types";
import { MODE_THEMES, ALL_MODES, type ModeKey } from "../../lib/constants";
import { cn } from "../../lib/utils";
import { MessageCircle, ArrowLeft, CheckCircle, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Markdown from "react-markdown";

// ─── Mode-specific renderers ─────────────────────────────────

function DyslexiaView({ data }: { data: Lesson["dyslexia"] }) {
  if (!data) return <ModeNotReady mode="Dyslexia" />;
  return (
    <div
      className="rounded-2xl p-6 shadow-inner"
      style={{
        fontFamily: data.formatting?.font || "'OpenDyslexic', sans-serif",
        lineHeight: data.formatting?.lineHeight || 2,
        backgroundColor: data.formatting?.bgColor || "#fdf6e3",
        letterSpacing: "0.05em",
      }}
    >
      {data.difficultWords?.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider w-full mb-1">
            Key Words
          </span>
          {data.difficultWords.map((w) => (
            <span
              key={w}
              className="inline-flex items-center gap-1.5 rounded-full bg-amber-200/70 border border-amber-300 px-3 py-1 text-sm font-medium text-amber-800"
            >
              {w}
              <AudioPlayer word={w} variant="word" mode="dyslexia" />
            </span>
          ))}
        </div>
      )}
      <div className="prose max-w-none">
        <Markdown>{data.text}</Markdown>
      </div>
      {data.encouragement && (
        <div className="mt-6 rounded-xl bg-emerald-100 border border-emerald-200 p-4 text-center text-sm font-semibold text-emerald-800">
          {data.encouragement.allDone || "Great job reading! 🎉"}
        </div>
      )}
    </div>
  );
}

function ModeNotReady({ mode }: { mode: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 p-12 text-center">
      <span className="text-4xl mb-3">⏳</span>
      <p className="font-semibold text-gray-700">{mode} mode not ready yet</p>
      <p className="text-sm text-gray-400 mt-1">This lesson hasn't been processed for this mode. Try another mode or come back later.</p>
    </div>
  );
}

function ADHDView({ data }: { data: Lesson["adhd"] }) {
  if (!data) return <ModeNotReady mode="ADHD" />;
  const [completed, setCompleted] = useState<Set<number>>(new Set());

  const toggleComplete = (idx: number) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const progress = (completed.size / (data.chunks?.length || 1)) * 100;

  return (
    <div className="space-y-4">
      <div className="glass rounded-2xl p-4 flex items-center gap-4">
        <div className="flex-1">
          <div className="flex justify-between text-xs font-medium text-gray-600 mb-1.5">
            <span>Progress</span>
            <span>{completed.size}/{data.chunks?.length || 0} chunks</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>
        {completed.size === (data.chunks?.length || 0) && completed.size > 0 && (
          <span className="text-lg">🎉</span>
        )}
      </div>

      {data.chunks?.map((chunk, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <div
            className={cn(
              "rounded-2xl border bg-white p-5 shadow-sm transition-all duration-300 border-l-4",
              completed.has(i)
                ? "border-violet-400 bg-violet-50/60 opacity-80"
                : "border-violet-300 hover:shadow-md"
            )}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">{chunk.emoji}</span>
                <h3 className="font-semibold text-gray-900">{chunk.title}</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full font-medium">
                  ⏱ {chunk.timeEstimate}
                </span>
                <button
                  onClick={() => toggleComplete(i)}
                  className={cn(
                    "p-1 rounded-full transition-colors",
                    completed.has(i) ? "text-violet-500" : "text-gray-300 hover:text-gray-400"
                  )}
                >
                  <CheckCircle className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="prose prose-sm max-w-none text-gray-700">
              <Markdown>{chunk.content}</Markdown>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function DyscalculiaView({ data }: { data: Lesson["dyscalculia"] }) {
  if (!data) return <ModeNotReady mode="Dyscalculia" />;
  return (
    <div className="space-y-5">
      {data.summary && (
        <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 p-4 text-sm text-emerald-800">
          <strong className="block mb-1">📋 Summary</strong>
          {data.summary}
        </div>
      )}
      {data.sections?.map((sec, i) => (
        <div key={i} className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm border-l-4 border-l-emerald-400">
          <h3 className="font-semibold text-gray-900 mb-4">{sec.title}</h3>
          <ol className="space-y-3">
            {sec.steps?.map((step, j) => (
              <li key={j} className="flex items-start gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 flex-shrink-0 mt-0.5">
                  {j + 1}
                </span>
                <span className="text-sm text-gray-700 leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
          {sec.visualAid && (
            <div className="mt-4 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-700 italic">
              💡 {sec.visualAid}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function SimplifiedView({ data }: { data: Lesson["simplified"] }) {
  if (!data) return <ModeNotReady mode="Simplified" />;
  return (
    <div className="rounded-2xl bg-gradient-to-br from-violet-50 to-fuchsia-50 border border-violet-200 p-6">
      {data.readingLevel && (
        <div className="mb-4 inline-block rounded-full bg-violet-200 border border-violet-300 px-3 py-1 text-xs font-semibold text-violet-800">
          📚 Reading Level: {data.readingLevel}
        </div>
      )}
      {data.keyTerms?.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {data.keyTerms.map((t) => (
            <span
              key={t}
              className="rounded-lg bg-violet-200/70 px-2 py-0.5 text-xs font-medium text-violet-800"
            >
              {t}
            </span>
          ))}
        </div>
      )}
      <div className="prose prose-lg max-w-none text-gray-800" style={{ fontSize: "1.1rem" }}>
        <Markdown>{data.text}</Markdown>
      </div>
    </div>
  );
}

function AudioView({ data }: { data: Lesson["audioScript"] }) {
  if (!data) return <ModeNotReady mode="Audio" />;

  return (
    <div className="rounded-2xl bg-gradient-to-br from-rose-50 to-orange-50 border border-rose-200 p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-sm font-semibold text-rose-700 mb-0.5">🎧 Audio Mode</p>
          {data.estimatedDuration && (
            <span className="text-xs text-rose-600/80">Duration: ~{data.estimatedDuration}</span>
          )}
          <p className="text-xs text-rose-500/70 mt-0.5">Powered by ElevenLabs AI Voice</p>
        </div>
        {/* ElevenLabs AI narration — replaces browser speechSynthesis */}
        <AudioPlayer
          text={data.text}
          mode="audio"
          label="Play Narration"
        />
      </div>
      <div className="prose max-w-none text-gray-700">
        <Markdown>{data.text}</Markdown>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────

export default function LessonViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { primaryNeuro } = useUser();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeMode, setActiveMode] = useState<ModeKey>("simplified");

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`/api/lessons/${id}`);
        const data = (res.data as any)?.lesson ?? res.data;
        setLesson(data as Lesson);
        if (primaryNeuro && ALL_MODES.includes(primaryNeuro as ModeKey)) {
          setActiveMode(primaryNeuro as ModeKey);
        }
      } catch {
        navigate("/dashboard", { replace: true });
      } finally {
        setLoading(false);
      }
    })();
  }, [id, navigate, primaryNeuro]);

  if (loading || !lesson) return <PageSpinner text="Loading lesson..." />;

  const renderContent = () => {
    switch (activeMode) {
      case "dyslexia":    return <DyslexiaView data={lesson.dyslexia} />;
      case "adhd":        return <ADHDView data={lesson.adhd} />;
      case "dyscalculia": return <DyscalculiaView data={lesson.dyscalculia} />;
      case "simplified":  return <SimplifiedView data={lesson.simplified} />;
      case "audioScript": return <AudioView data={lesson.audioScript} />;
      default:            return <ModeNotReady mode={activeMode} />;
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Premium Header Banner ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-900 via-violet-800 to-fuchsia-800 p-6 text-white shadow-xl">
        <div className="pointer-events-none absolute -top-8 -right-8 h-40 w-40 rounded-full bg-fuchsia-500/20 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-violet-400/20 blur-2xl" />

        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <div className="w-px h-5 bg-white/20" />
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 border border-white/20">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold leading-tight">{lesson.title || "Lesson"}</h1>
                {lesson.subject && (
                  <p className="text-sm text-white/60">{lesson.subject}</p>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate(`/chat/${lesson.id}`)}
            className="flex items-center gap-2 rounded-xl bg-white/15 border border-white/25 px-4 py-2 text-sm font-semibold text-white hover:bg-white/25 transition-all"
          >
            <MessageCircle className="h-4 w-4" />
            Chat about this
          </button>
        </div>
      </div>

      {/* ── Mode Selector Pills ── */}
      <div className="glass rounded-2xl p-2 flex gap-1.5 flex-wrap">
        {ALL_MODES.map((mode) => {
          const theme = MODE_THEMES[mode];
          const isActive = activeMode === mode;
          return (
            <button
              key={mode}
              onClick={() => setActiveMode(mode)}
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200",
                isActive
                  ? "bg-white shadow-md text-violet-700 border border-violet-100"
                  : "text-gray-500 hover:text-gray-700 hover:bg-white/60"
              )}
            >
              <span>{theme.emoji}</span>
              <span>{theme.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Content ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeMode}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.2 }}
        >
          {renderContent()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
