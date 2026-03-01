import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../context/UserContext";
import { Button, NeuroBadge, EmptyState, PageSpinner } from "../../components/ui";
import api from "../../lib/api";
import type { LessonSummary } from "../../types";
import { BookOpen, Sparkles, MessageCircle, Clock, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import QuickStatCard from "../../components/student/QuickStatCard";
import LessonCard from "../../components/student/LessonCard";
import UploadCtaBanner from "../../components/student/UploadCtaBanner";

export default function StudentDashboard() {
  const { user, primaryNeuro } = useUser();
  const navigate = useNavigate();
  const [lessons, setLessons] = useState<LessonSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<LessonSummary[]>("/api/lessons");
        const data = Array.isArray(res.data) ? res.data : (res.data as { lessons?: LessonSummary[] })?.lessons ?? [];
        setLessons(data);
      } catch {
        // silent — empty state handles it
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <PageSpinner text="Loading your lessons..." />;

  return (
    <div className="space-y-8">

      {/* ── Welcome Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-violet-900 via-violet-800 to-fuchsia-800 px-7 py-8 shadow-xl shadow-violet-400/20"
      >
        {/* Orbs */}
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-fuchsia-400/20 blur-3xl pointer-events-none" />
        <div className="absolute -left-8 -bottom-10 h-40 w-40 rounded-full bg-violet-300/15 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-violet-300 mb-1">Welcome back 👋</p>
            <h1 className="text-2xl font-extrabold text-white">
              {user?.name || "Student"}
            </h1>
            <div className="mt-3 flex flex-wrap gap-2">
              {user?.neurodiversity
                ?.filter((n) => n !== "none")
                .map((n) => <NeuroBadge key={n} type={n} size="md" />)}
              {primaryNeuro && (
                <span className="text-sm text-violet-300">
                  — Adapted for your {primaryNeuro} profile
                </span>
              )}
            </div>
          </div>
          <Button
            className="bg-white/15 border border-white/25 text-white hover:bg-white/25 backdrop-blur-sm self-start sm:self-auto"
            icon={<Sparkles className="h-4 w-4" />}
            onClick={() => navigate("/onboarding/assessment")}
          >
            Retake Assessment
          </Button>
        </div>
      </motion.div>

      {/* ── Quick Stats ── */}
      <div className="grid gap-4 sm:grid-cols-3">
        <QuickStatCard
          icon={<BookOpen className="h-6 w-6 text-violet-600" />}
          iconBg="bg-violet-100"
          value={lessons.length}
          label="Lessons Available"
        />
        <QuickStatCard
          icon={<MessageCircle className="h-6 w-6 text-emerald-600" />}
          iconBg="bg-emerald-100"
          value={primaryNeuro ? "Active" : "—"}
          label="AI Tutor Mode"
        />
        <QuickStatCard
          icon={<Clock className="h-6 w-6 text-fuchsia-600" />}
          iconBg="bg-fuchsia-100"
          value={5}
          label="Adaptive Modes"
        />
      </div>

      {/* ── Upload CTA ── */}
      {primaryNeuro && primaryNeuro !== "none" && (
        <UploadCtaBanner profileLabel={primaryNeuro} />
      )}

      {/* ── Lessons Grid ── */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">My Lessons</h2>
          {lessons.length > 0 && (
            <button
              onClick={() => navigate("/lessons")}
              className="flex items-center gap-1 text-sm font-medium text-violet-600 hover:text-violet-700 transition-colors"
            >
              View all <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>

        {lessons.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="h-10 w-10" />}
            title="No lessons yet"
            description="Your teacher hasn't uploaded any lessons yet. Check back soon!"
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {lessons.map((lesson, i) => (
              <LessonCard key={lesson.id} lesson={lesson} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
