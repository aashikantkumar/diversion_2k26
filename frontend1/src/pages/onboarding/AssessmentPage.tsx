import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../context/UserContext";
import { PageSpinner, NeuroBadge } from "../../components/ui";
import { toast } from "sonner";
import api from "../../lib/api";
import { cn } from "../../lib/utils";
import type {
  AssessmentQuestion,
  AssessmentAnswer,
  AssessmentResult,
  AnswerScale,
  NeuroDivType,
} from "../../types";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  ThumbsUp,
  ThumbsDown,
  Brain,
  Lightbulb,
  AlertCircle,
} from "lucide-react";

// Condition metadata for the result screen
const CONDITION_INFO: Record<string, { emoji: string; label: string; color: string }> = {
  adhd: { emoji: "⚡", label: "ADHD", color: "bg-yellow-50 border-yellow-200 text-yellow-800" },
  dyslexia: { emoji: "📖", label: "Dyslexia", color: "bg-blue-50 border-blue-200 text-blue-800" },
  dyscalculia: { emoji: "🔢", label: "Dyscalculia", color: "bg-purple-50 border-purple-200 text-purple-800" },
  none: { emoji: "✅", label: "No specific condition", color: "bg-green-50 border-green-200 text-green-800" },
};

const CONFIDENCE_COLORS: Record<string, string> = {
  high: "text-green-600",
  moderate: "text-yellow-600",
  low: "text-gray-500",
};

// ─── Agree/Disagree picker ──────────────────────────────────────
function ManualPicker({
  onPick,
  saving,
}: {
  onPick: (val: NeuroDivType) => void;
  saving: boolean;
}) {
  const options: NeuroDivType[] = ["adhd", "dyslexia", "dyscalculia", "none"];
  return (
    <div className="mt-4 space-y-2">
      <p className="text-sm font-medium text-gray-700 mb-3">
        Which best describes you?
      </p>
      {options.map((opt) => {
        const info = CONDITION_INFO[opt];
        return (
          <button
            key={opt}
            onClick={() => onPick(opt)}
            disabled={saving}
            className={cn(
              "w-full flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all hover:shadow-sm",
              "border-gray-200 hover:border-violet-300 bg-white hover:bg-violet-50"
            )}
          >
            <span className="text-2xl">{info.emoji}</span>
            <div>
              <p className="font-semibold text-gray-900">{info.label}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─── Result Screen ──────────────────────────────────────────────
function ResultScreen({
  result,
  onAgree,
  onDisagree,
  saving,
  disagreeing,
}: {
  result: AssessmentResult;
  onAgree: () => void;
  onDisagree: (val: NeuroDivType) => void;
  saving: boolean;
  disagreeing: boolean;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const condition = CONDITION_INFO[result.primaryCondition] ?? CONDITION_INFO.none;

  return (
    <div className="relative min-h-screen flex items-start justify-center px-4 py-10 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 mesh-bg" />
      <div className="pointer-events-none absolute inset-0 dot-grid opacity-30" />

      <div className="relative w-full max-w-lg space-y-4">
        {/* Main result card */}
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <div className="glass-strong rounded-3xl border border-white/70 p-7 text-center shadow-xl">
            {/* Icon */}
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 shadow-xl shadow-violet-300/40">
              <Brain className="h-8 w-8 text-white" />
            </div>
            <h2 className="font-display text-2xl font-bold text-gray-900">Assessment Complete!</h2>
            <p className="mt-1 text-sm text-gray-500">Based on your answers, the AI predicts:</p>

            {/* Prediction badge */}
            <div className={cn("mt-5 rounded-2xl border-2 p-5", condition.color)}>
              <span className="text-5xl block mb-2">{condition.emoji}</span>
              <p className="font-display text-xl font-bold capitalize">
                {result.primaryCondition === "none" ? "No specific condition detected" : result.primaryCondition}
              </p>
              <p className={cn("mt-1.5 text-xs font-semibold uppercase tracking-wide", CONFIDENCE_COLORS[result.confidence])}>
                {result.confidence} confidence
                {result.secondaryCondition && result.secondaryCondition !== "none" && (
                  <span className="ml-2 font-normal normal-case text-gray-500">
                    · Secondary: {result.secondaryCondition}
                  </span>
                )}
              </p>
            </div>

            {/* Score pills */}
            <div className="mt-5 flex gap-3 justify-center">
              {Object.entries(result.scores).map(([key, val]) => (
                <div key={key} className="flex flex-col items-center rounded-2xl bg-gray-50 border border-gray-100 px-4 py-3 min-w-[70px]">
                  <span className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">{key}</span>
                  <span className="font-display text-xl font-bold text-gray-800">{val}</span>
                  <NeuroBadge type={key as NeuroDivType} size="sm" />
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Signals */}
        {result.keySignals.length > 0 && (
          <div className="glass rounded-2xl border border-amber-100 p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-7 w-7 rounded-lg bg-amber-100 flex items-center justify-center">
                <AlertCircle className="h-4 w-4 text-amber-600" />
              </div>
              <p className="text-sm font-semibold text-gray-800">Key signals observed</p>
            </div>
            <ul className="space-y-2">
              {result.keySignals.map((signal, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-400" />
                  {signal}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* AI Explanation */}
        {result.explanation && (
          <div className="rounded-2xl bg-gradient-to-br from-violet-50 to-fuchsia-50 border border-violet-200 p-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400 mb-2">AI Explanation</p>
            <p className="text-sm text-violet-800 leading-relaxed">{result.explanation}</p>
          </div>
        )}

        {/* Support tips */}
        {result.supportTips.length > 0 && (
          <div className="glass rounded-2xl border border-emerald-100 p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-7 w-7 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Lightbulb className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="text-sm font-semibold text-gray-800">Support tips for you</p>
            </div>
            <ul className="space-y-2">
              {result.supportTips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Disclaimer */}
        <p className="text-center text-xs text-gray-400 px-4">
          ⚠️ This is not a medical diagnosis — it simply helps adapt your learning content.
        </p>

        {/* Agree / Disagree */}
        {!showPicker ? (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onAgree}
              disabled={saving}
              className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-500 py-4 text-sm font-bold text-white shadow-lg shadow-violet-400/30 hover:-translate-y-0.5 hover:shadow-violet-400/50 transition-all disabled:opacity-70"
            >
              {saving ? <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> : <ThumbsUp className="h-4 w-4" />}
              Sounds like me
            </button>
            <button
              onClick={() => setShowPicker(true)}
              disabled={saving}
              className="flex items-center justify-center gap-2 rounded-2xl border-2 border-gray-200 bg-white py-4 text-sm font-semibold text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-all disabled:opacity-70"
            >
              <ThumbsDown className="h-4 w-4" /> I disagree
            </button>
          </div>
        ) : (
          <ManualPicker onPick={onDisagree} saving={disagreeing} />
        )}
      </div>
    </div>
  );
}


// ─── Main component ─────────────────────────────────────────────
export default function AssessmentPage() {
  const navigate = useNavigate();
  const { refetchUser } = useUser();

  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [scale, setScale] = useState<AnswerScale[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [disagreeing, setDisagreeing] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<{
          questions: AssessmentQuestion[];
          answerScale: AnswerScale[];
        }>("/api/assess/questions");
        setQuestions(res.data.questions);
        setScale(res.data.answerScale);
      } catch {
        toast.error("Failed to load assessment questions");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const currentQ = questions[currentIdx];
  const answered = answers[currentQ?.id] !== undefined;
  const allAnswered = questions.every((q) => answers[q.id] !== undefined);

  const selectAnswer = (value: number) => {
    setAnswers((prev) => ({ ...prev, [currentQ.id]: value }));
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const payload: AssessmentAnswer[] = questions.map((q) => ({
        questionId: q.id,
        value: (answers[q.id] ?? 0) as 0 | 1 | 2 | 3,
      }));
      const res = await api.post<AssessmentResult>("/api/assess", { answers: payload });
      setResult(res.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Assessment failed");
    } finally {
      setSubmitting(false);
    }
  };

  /** Save chosen profile (from AI prediction or manual pick) and navigate to dashboard */
  const saveProfile = async (condition: NeuroDivType, isSaving: (v: boolean) => void) => {
    isSaving(true);
    try {
      const payload: AssessmentAnswer[] = questions.map((q) => ({
        questionId: q.id,
        value: (answers[q.id] ?? 0) as 0 | 1 | 2 | 3,
      }));
      await api.post("/api/auth/onboarding/assessment", {
        answers: payload,
        overrideCondition: condition,
      });
      await refetchUser();
      toast.success("Profile saved! Content will now adapt to your needs 🎉");
      navigate("/dashboard", { replace: true });
    } catch {
      toast.error("Failed to save profile");
    } finally {
      isSaving(false);
    }
  };

  if (loading) return <PageSpinner text="Loading assessment..." />;

  if (result) {
    return (
      <ResultScreen
        result={result}
        saving={saving}
        disagreeing={disagreeing}
        onAgree={() => saveProfile(result.primaryCondition, setSaving)}
        onDisagree={(manual) => saveProfile(manual, setDisagreeing)}
      />
    );
  }

  // ─── Question Screen ────────────────────────────────────────
  const completedCount = Object.keys(answers).length;
  const pct = Math.round((completedCount / questions.length) * 100);

  return (
    <div className="relative min-h-screen flex items-start justify-center px-4 py-10 overflow-hidden">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 mesh-bg" />
      <div className="pointer-events-none absolute top-1/4 right-1/4 h-64 w-64 rounded-full bg-violet-200/25 blur-3xl" />

      <div className="relative w-full max-w-xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 shadow-xl shadow-violet-300/40">
            <Brain className="h-7 w-7 text-white" />
          </div>
          <h1 className="font-display text-3xl font-bold text-gray-900">Learning Assessment</h1>
          <p className="text-gray-500 mt-1.5 text-sm">Answer honestly — there are no right or wrong answers.</p>

          {/* Progress */}
          <div className="mt-5 glass rounded-2xl p-4">
            <div className="flex items-center justify-between text-xs font-medium text-gray-500 mb-2">
              <span>{completedCount} of {questions.length} answered</span>
              <span className="font-bold text-violet-600">{pct}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentIdx}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.2 }}
          >
            <div className="glass-strong rounded-3xl border border-white/70 p-6 shadow-xl mb-5">
              {/* Question meta */}
              <div className="flex items-start gap-4 mb-6">
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-fuchsia-100 text-2xl shadow-sm">
                  {currentQ.emoji}
                </div>
                <div className="flex-1">
                  <div className="chip chip-violet mb-2">
                    Question {currentIdx + 1} / {questions.length}
                  </div>
                  <h2 className="font-display text-lg font-bold text-gray-900 leading-snug">
                    {currentQ.question}
                  </h2>
                  {currentQ.examples && (
                    <p className="mt-2 text-sm text-gray-400 italic leading-relaxed">
                      {currentQ.examples}
                    </p>
                  )}
                </div>
              </div>

              {/* Answer options */}
              <div className="grid grid-cols-2 gap-3">
                {scale.map((opt) => {
                  const isChosen = answers[currentQ.id] === opt.value;
                  return (
                    <motion.button
                      key={opt.value}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => selectAnswer(opt.value)}
                      className={cn(
                        "rounded-2xl border-2 p-4 text-center transition-all duration-200",
                        isChosen
                          ? "border-violet-500 bg-gradient-to-br from-violet-50 to-fuchsia-50 shadow-md shadow-violet-100"
                          : "border-gray-200 bg-white hover:border-violet-200 hover:bg-violet-50/40"
                      )}
                    >
                      {isChosen && (
                        <div className="mx-auto mb-1.5 h-2 w-2 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500" />
                      )}
                      <p className={cn("font-display font-bold text-sm", isChosen ? "text-violet-800" : "text-gray-800")}>{opt.label}</p>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => setCurrentIdx((p) => Math.max(0, p - 1))}
            disabled={currentIdx === 0}
            className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <ArrowLeft className="h-4 w-4" /> Previous
          </button>

          {currentIdx < questions.length - 1 ? (
            <button
              onClick={() => setCurrentIdx((p) => p + 1)}
              disabled={!answered}
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-violet-400/30 hover:shadow-violet-400/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Next <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={!allAnswered || submitting}
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-violet-400/30 hover:shadow-violet-400/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {submitting ? (
                <><svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Analyzing...</>
              ) : (
                <>Submit Assessment <ArrowRight className="h-4 w-4" /></>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
