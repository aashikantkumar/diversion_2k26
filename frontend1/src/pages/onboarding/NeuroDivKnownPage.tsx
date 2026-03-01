import { useNavigate } from "react-router-dom";
import { useUser } from "../../context/UserContext";
import { toast } from "sonner";
import api from "../../lib/api";
import { useState } from "react";
import type { NeuroDivType } from "../../types";
import { cn } from "../../lib/utils";
import { ArrowRight, Brain, HelpCircle } from "lucide-react";
import { motion } from "framer-motion";

const CONDITIONS = [
  {
    id: "dyslexia" as NeuroDivType,
    emoji: "📖",
    label: "Dyslexia",
    desc: "Difficulty with reading, spelling, or decoding words",
    gradient: "from-amber-400 to-orange-500",
    light: "bg-amber-50",
    border: "border-amber-200",
    selectedBorder: "border-amber-400",
    selectedBg: "bg-amber-50",
    checkColor: "from-amber-400 to-orange-500",
  },
  {
    id: "adhd" as NeuroDivType,
    emoji: "⚡",
    label: "ADHD",
    desc: "Difficulty with focus, attention, or sitting still",
    gradient: "from-violet-500 to-fuchsia-500",
    light: "bg-violet-50",
    border: "border-violet-200",
    selectedBorder: "border-violet-400",
    selectedBg: "bg-violet-50",
    checkColor: "from-violet-500 to-fuchsia-500",
  },
  {
    id: "dyscalculia" as NeuroDivType,
    emoji: "🔢",
    label: "Dyscalculia",
    desc: "Difficulty with numbers, math, or calculations",
    gradient: "from-emerald-400 to-teal-500",
    light: "bg-emerald-50",
    border: "border-emerald-200",
    selectedBorder: "border-emerald-400",
    selectedBg: "bg-emerald-50",
    checkColor: "from-emerald-400 to-teal-500",
  },
];

export default function NeuroDivKnownPage() {
  const navigate = useNavigate();
  const { refetchUser } = useUser();
  const [selected, setSelected] = useState<NeuroDivType[]>([]);
  const [loading, setLoading] = useState(false);

  const toggle = (id: NeuroDivType) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const submit = async () => {
    setLoading(true);
    try {
      const neurodiversity = selected.length > 0 ? selected : ["none" as NeuroDivType];
      await api.post("/api/auth/onboarding/individual", { neurodiversity });
      await refetchUser();
      toast.success("Profile set up! 🎉");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-16 overflow-hidden">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 mesh-bg" />
      <div className="pointer-events-none absolute inset-0 dot-grid opacity-30" />
      <div className="pointer-events-none absolute top-1/3 left-1/4 h-72 w-72 rounded-full bg-violet-200/25 blur-3xl" />
      <div className="pointer-events-none absolute bottom-1/4 right-1/4 h-56 w-56 rounded-full bg-fuchsia-200/25 blur-3xl" />

      <div className="relative w-full max-w-lg">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="mx-auto mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 shadow-xl shadow-violet-300/40">
            <Brain className="h-7 w-7 text-white" />
          </div>
          <h1 className="font-display text-3xl font-bold text-gray-900 md:text-4xl">
            Know your learning style?
          </h1>
          <p className="mt-3 text-gray-500 leading-relaxed">
            Select any that apply — we'll adapt all your lessons accordingly.
            <br />
            <span className="text-sm text-gray-400">You can always change this later.</span>
          </p>
        </motion.div>

        {/* Selection Cards */}
        <div className="space-y-3 mb-6">
          {CONDITIONS.map((c, i) => {
            const isSelected = selected.includes(c.id);
            return (
              <motion.button
                key={c.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                onClick={() => toggle(c.id)}
                className={cn(
                  "w-full flex items-center gap-4 rounded-2xl border-2 p-5 text-left transition-all duration-200",
                  "hover:-translate-y-0.5 hover:shadow-md",
                  isSelected
                    ? `${c.selectedBorder} ${c.selectedBg} shadow-md`
                    : "border-gray-200 bg-white hover:border-gray-300"
                )}
              >
                {/* Emoji in gradient circle */}
                <div className={cn(
                  "flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-xl transition-all",
                  isSelected
                    ? `bg-gradient-to-br ${c.gradient} shadow-lg`
                    : "bg-gray-100"
                )}>
                  {c.emoji}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-display font-bold text-gray-900">{c.label}</div>
                  <div className="text-sm text-gray-500 mt-0.5">{c.desc}</div>
                </div>

                {/* Checkbox */}
                <div className={cn(
                  "h-6 w-6 rounded-lg flex items-center justify-center flex-shrink-0 border-2 transition-all",
                  isSelected
                    ? `border-transparent bg-gradient-to-br ${c.checkColor} shadow-md`
                    : "border-gray-300 bg-white"
                )}>
                  {isSelected && (
                    <motion.svg
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="h-3.5 w-3.5 text-white"
                      viewBox="0 0 12 12"
                      fill="none"
                    >
                      <path d="M2.5 6L4.5 8L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </motion.svg>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Selected count indicator */}
        {selected.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-4 flex items-center gap-2 rounded-xl bg-violet-50 border border-violet-200 px-4 py-2.5"
          >
            <div className="h-2 w-2 rounded-full bg-violet-500" />
            <span className="text-sm font-medium text-violet-700">
              {selected.length} condition{selected.length !== 1 ? "s" : ""} selected — we'll optimize all your content
            </span>
          </motion.div>
        )}

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="flex flex-col gap-3"
        >
          <button
            onClick={submit}
            disabled={loading}
            className="flex items-center justify-center gap-2 w-full rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-500 py-4 text-base font-bold text-white shadow-lg shadow-violet-400/30 transition-all hover:-translate-y-0.5 hover:shadow-violet-400/50 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Setting up your profile...
              </>
            ) : (
              <>
                {selected.length > 0 ? "Continue with my selections" : "Continue without selecting"}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>

          <button
            onClick={() => navigate("/onboarding/assessment")}
            className="flex items-center justify-center gap-2 w-full rounded-2xl border-2 border-dashed border-gray-300 bg-white py-3.5 text-sm font-semibold text-gray-600 transition-all hover:border-violet-300 hover:text-violet-700 hover:bg-violet-50/50"
          >
            <HelpCircle className="h-4 w-4" />
            Not sure — Take the AI Assessment
          </button>
        </motion.div>
      </div>
    </div>
  );
}
