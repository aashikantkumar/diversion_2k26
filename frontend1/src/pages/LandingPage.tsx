import { Navigate, useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { DottedSurface } from "../components/ui/dotted-surface";
import {
  Brain,
  BookOpen,
  MessageCircle,
  Image as ImageIcon,
  Sparkles,
  ArrowRight,
  GraduationCap,
  Users,
  X,
  CheckCircle2,
  Zap,
  Shield,
  Star,
  Rocket,
  Layers,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

/* ─── Data ─────────────────────────────────────────────────── */
const MARQUEE_ITEMS = [
  { emoji: "🧠", text: "AI-Powered Learning" },
  { emoji: "📖", text: "Dyslexia Mode" },
  { emoji: "⚡", text: "ADHD Optimized" },
  { emoji: "🔢", text: "Dyscalculia Support" },
  { emoji: "🎯", text: "Adaptive Assessments" },
  { emoji: "💬", text: "Smart Tutor" },
  { emoji: "🖼️", text: "Visual Aids" },
  { emoji: "✨", text: "Personalized Paths" },
  { emoji: "🚀", text: "Instant Transform" },
  { emoji: "🌍", text: "Inclusive Education" },
];

const features = [
  {
    icon: Brain,
    title: "AI Assessment",
    desc: "10-question screener identifies learning differences automatically with clinical accuracy.",
    gradient: "from-violet-500 to-fuchsia-500",
    light: "bg-violet-50",
    border: "border-violet-100",
    accentBg: "bg-gradient-to-br from-violet-500 to-fuchsia-500",
    size: "col-span-1 row-span-1 md:col-span-2",
  },
  {
    icon: BookOpen,
    title: "5 Adaptive Modes",
    desc: "Every PDF transforms into Dyslexia, ADHD, Dyscalculia, Simplified, and Audio modes.",
    gradient: "from-blue-500 to-cyan-400",
    light: "bg-blue-50",
    border: "border-blue-100",
    accentBg: "bg-gradient-to-br from-blue-500 to-cyan-400",
    size: "col-span-1 row-span-1",
  },
  {
    icon: MessageCircle,
    title: "Smart AI Tutor",
    desc: "RAG-powered chatbot trained on your exact lesson content.",
    gradient: "from-emerald-500 to-teal-400",
    light: "bg-emerald-50",
    border: "border-emerald-100",
    accentBg: "bg-gradient-to-br from-emerald-500 to-teal-400",
    size: "col-span-1 row-span-1",
  },
  {
    icon: ImageIcon,
    title: "Visual AI Aids",
    desc: "Generated imagery per learning mode for deeper comprehension.",
    gradient: "from-rose-500 to-pink-400",
    light: "bg-rose-50",
    border: "border-rose-100",
    accentBg: "bg-gradient-to-br from-rose-500 to-pink-400",
    size: "col-span-1 row-span-1",
  },
  {
    icon: GraduationCap,
    title: "Teacher Dashboard",
    desc: "Create classrooms, track students, upload lessons — all in one place.",
    gradient: "from-amber-500 to-orange-400",
    light: "bg-amber-50",
    border: "border-amber-100",
    accentBg: "bg-gradient-to-br from-amber-500 to-orange-400",
    size: "col-span-1 row-span-1 md:col-span-2",
  },
];

const modes = [
  { emoji: "📖", mode: "Dyslexia Mode", desc: "Dyslexia-friendly fonts, spacing & word helpers", color: "from-amber-400 to-orange-400", bg: "bg-amber-50/60", border: "border-amber-200" },
  { emoji: "⚡", mode: "ADHD Mode", desc: "Bite-sized chunks with progress tracking", color: "from-violet-400 to-blue-400", bg: "bg-violet-50/60", border: "border-violet-200" },
  { emoji: "🔢", mode: "Dyscalculia Mode", desc: "Visual step-by-step math breakdowns", color: "from-emerald-400 to-teal-400", bg: "bg-emerald-50/60", border: "border-emerald-200" },
  { emoji: "📚", mode: "Simplified Mode", desc: "Plain language with reading level adapted", color: "from-blue-400 to-cyan-400", bg: "bg-blue-50/60", border: "border-blue-200" },
  { emoji: "🎧", mode: "Audio Mode", desc: "Text-to-speech ready with clean formatting", color: "from-rose-400 to-pink-400", bg: "bg-rose-50/60", border: "border-rose-200" },
];

const stats = [
  { value: "5×", label: "Learning modes per lesson", icon: Layers },
  { value: "10s", label: "To transform any PDF", icon: Zap },
  { value: "100%", label: "Neurodiversity inclusive", icon: Shield },
  { value: "∞", label: "Lessons for free", icon: Star },
];

export default function LandingPage() {
  const { user, loading, isAuthenticated } = useUser();
  const navigate = useNavigate();
  const [roleModal, setRoleModal] = useState(false);

  // Already logged in and onboarded → go to dashboard
  if (!loading && isAuthenticated && user?.onboarded) {
    return <Navigate to={user.role === "teacher" ? "/teacher" : "/dashboard"} replace />;
  }
  // Authenticated but not onboarded → go to onboarding
  if (!loading && isAuthenticated && user && !user.onboarded) {
    return <Navigate to="/onboarding/neuro" replace />;
  }

  const pickRole = (role: "teacher" | "student") => {
    setRoleModal(false);
    navigate(`/register?role=${role}`);
  };

  const doubledMarquee = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];

  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* ══════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════ */}
      <section className="relative flex min-h-[95vh] flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-violet-950 via-violet-900 to-fuchsia-900 px-4 text-center">
        {/* Animated dotted surface (Three.js) */}
        <DottedSurface />

        {/* Spotlight glow */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-5%,oklch(0.65_0.2_290/0.35),transparent_70%)]" />

        {/* Ambient orbs */}
        <div className="pointer-events-none absolute -top-20 left-1/4 h-80 w-80 rounded-full bg-violet-500/20 blur-3xl animate-breathe" />
        <div className="pointer-events-none absolute top-1/3 right-1/5 h-60 w-60 rounded-full bg-fuchsia-500/20 blur-3xl animate-breathe" style={{ animationDelay: "2s" }} />
        <div className="pointer-events-none absolute bottom-0 left-10 h-56 w-56 rounded-full bg-indigo-400/15 blur-3xl" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="relative z-10 max-w-4xl"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-semibold text-white backdrop-blur-sm"
          >
            <Sparkles className="h-3.5 w-3.5 text-fuchsia-300" />
            AI-Powered Inclusive Education Platform
            <span className="ml-1 rounded-full bg-fuchsia-500/80 px-2 py-0.5 text-xs font-bold text-white">NEW</span>
          </motion.div>

          {/* Headline */}
          <h1 className="font-display text-5xl font-bold leading-tight tracking-tight text-white sm:text-6xl md:text-7xl">
            Learning That{" "}
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-fuchsia-300 via-violet-300 to-cyan-300 bg-clip-text text-transparent">
                Adapts To You
              </span>
              {/* Underline decoration */}
              <motion.span
                className="absolute -bottom-1 left-0 h-1 rounded-full bg-gradient-to-r from-fuchsia-400 to-violet-400"
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ delay: 0.8, duration: 0.6, ease: "easeOut" }}
              />
            </span>
          </h1>

          <p className="mt-6 text-lg leading-relaxed text-white/70 sm:text-xl md:max-w-2xl md:mx-auto">
            LearnNova transforms any PDF into{" "}
            <strong className="text-white/90">5 adaptive learning modes</strong> for dyslexia, ADHD, and dyscalculia — powered by real AI, not templates.
          </p>

          {/* Perks */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {["No credit card", "All modes free", "Setup in 60 seconds"].map((perk) => (
              <div key={perk} className="flex items-center gap-1.5 text-sm text-white/60">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                {perk}
              </div>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setRoleModal(true)}
              className="relative overflow-hidden rounded-2xl bg-white px-8 py-4 text-base font-bold text-violet-800 shadow-2xl shadow-violet-900/40 transition-all hover:shadow-violet-900/60"
            >
              <span className="relative z-10 flex items-center gap-2">
                Get Started Free <ArrowRight className="h-4 w-4" />
              </span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/login')}
              className="rounded-2xl border border-white/25 bg-white/10 px-8 py-4 text-base font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20"
            >
              Sign In
            </motion.button>
          </div>
        </motion.div>

        {/* Floating decorative cards */}
        <motion.div
          initial={{ opacity: 0, x: 40, y: 20 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          transition={{ delay: 0.6, duration: 0.7 }}
          className="pointer-events-none absolute right-8 top-1/3 hidden lg:block animate-float"
        >
          <div className="glass-dark rounded-2xl border border-white/15 p-4 shadow-xl">
            <div className="flex items-center gap-2 text-white">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-semibold">PDF transformed!</span>
            </div>
            <p className="mt-1 text-xs text-white/50 pl-9">5 modes ready in 10 seconds</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -40, y: -20 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          transition={{ delay: 0.8, duration: 0.7 }}
          className="pointer-events-none absolute left-8 bottom-1/3 hidden lg:block animate-float-delay"
        >
          <div className="glass-dark rounded-2xl border border-white/15 p-4 shadow-xl">
            <div className="flex items-center gap-2 text-white">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-400 to-fuchsia-500 flex items-center justify-center">
                <Brain className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-semibold">ADHD Mode active</span>
            </div>
            <p className="mt-1 text-xs text-white/50 pl-9">Bite-sized chunks enabled</p>
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <div className="h-9 w-5 rounded-full border border-white/30 flex items-start justify-center pt-1.5">
            <div className="h-2 w-1 rounded-full bg-white/60" />
          </div>
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════════════
          MARQUEE STRIP
      ══════════════════════════════════════════════════ */}
      <div className="border-y border-violet-100 bg-gradient-to-r from-violet-50 to-fuchsia-50 py-4 overflow-hidden">
        <div className="marquee-container">
          <div className="flex gap-8 animate-marquee whitespace-nowrap">
            {doubledMarquee.map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm font-semibold text-violet-700 flex-shrink-0">
                <span className="text-base">{item.emoji}</span>
                <span>{item.text}</span>
                <span className="text-violet-300 ml-4">·</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          STATS BAR
      ══════════════════════════════════════════════════ */}
      <section className="px-4 py-16 max-w-6xl mx-auto">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bento-card text-center group"
            >
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-lg shadow-violet-200 group-hover:shadow-violet-300 transition-shadow">
                <s.icon className="h-5 w-5 text-white" />
              </div>
              <div className="text-3xl font-bold font-display text-gray-900 tracking-tight">{s.value}</div>
              <div className="mt-1 text-xs text-gray-500 font-medium">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          BENTO FEATURES GRID
      ══════════════════════════════════════════════════ */}
      <section className="px-4 pb-20 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-1.5 text-sm font-semibold text-violet-700 mb-4"
          >
            <Layers className="h-3.5 w-3.5" />
            Everything You Need
          </motion.div>
          <h2 className="font-display text-4xl font-bold text-gray-900 md:text-5xl">
            Built for{" "}
            <span className="bg-gradient-to-r from-violet-600 to-fuchsia-500 bg-clip-text text-transparent">
              every learner
            </span>
          </h2>
          <p className="mt-4 text-gray-500 max-w-2xl mx-auto text-lg">
            A complete platform where AI does the heavy lifting — you just learn.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className={`bento-card group ${f.size ?? ""}`}
            >
              <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl ${f.accentBg} shadow-lg`}>
                <f.icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-display text-xl font-bold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              {/* Subtle gradient bottom edge */}
              <div className={`absolute bottom-0 left-0 right-0 h-1 rounded-b-2xl bg-gradient-to-r ${f.gradient} opacity-60 group-hover:opacity-100 transition-opacity`} />
            </motion.div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          5 ADAPTIVE MODES
      ══════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-b from-gray-50 to-white py-24 px-4">
        <div className="spotlight absolute inset-0 pointer-events-none" />
        <div className="relative max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 rounded-full border border-fuchsia-200 bg-fuchsia-50 px-4 py-1.5 text-sm font-semibold text-fuchsia-700 mb-4"
            >
              <Sparkles className="h-3.5 w-3.5" />
              5 Learning Modes
            </motion.div>
            <h2 className="font-display text-4xl font-bold text-gray-900 md:text-5xl">
              One lesson,{" "}
              <span className="bg-gradient-to-r from-fuchsia-600 to-violet-600 bg-clip-text text-transparent">
                five experiences
              </span>
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {modes.map((m, i) => (
              <motion.div
                key={m.mode}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`relative overflow-hidden rounded-2xl border ${m.border} ${m.bg} p-5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg group`}
              >
                <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${m.color} shadow-md`}>
                  <span className="text-lg">{m.emoji}</span>
                </div>
                <h3 className="font-display font-bold text-gray-900 text-sm mb-1">{m.mode}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{m.desc}</p>
                {/* Corner decoration */}
                <div className={`absolute -bottom-4 -right-4 h-16 w-16 rounded-full bg-gradient-to-br ${m.color} opacity-10 group-hover:opacity-20 transition-opacity`} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          TRUST STRIP
      ══════════════════════════════════════════════════ */}
      <section className="py-12 px-4 max-w-5xl mx-auto">
        <div className="glass rounded-3xl border border-white/70 p-8 shadow-xl">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              { icon: Shield, title: "Privacy First", desc: "Your data is yours. No selling, no sharing, ever.", color: "from-emerald-500 to-teal-500" },
              { icon: Zap, title: "Instant Results", desc: "PDF to 5 learning modes in under 30 seconds.", color: "from-violet-500 to-fuchsia-500" },
              { icon: CheckCircle2, title: "Clinically Informed", desc: "Modes designed with neurodiversity best practices.", color: "from-blue-500 to-cyan-500" },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-4">
                <div className={`h-11 w-11 flex-shrink-0 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-md`}>
                  <item.icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 font-display">{item.title}</h4>
                  <p className="text-sm text-gray-500 mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          FINAL CTA
      ══════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden mx-4 mb-16 rounded-3xl bg-gradient-to-br from-violet-900 via-violet-800 to-fuchsia-800 p-12 text-center shadow-2xl">
        <div className="pointer-events-none absolute inset-0 dot-grid-bright opacity-30" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,oklch(0.7_0.2_290/0.3),transparent_70%)]" />
        <div className="relative z-10 max-w-2xl mx-auto">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 border border-white/20 backdrop-blur-sm">
            <Rocket className="h-8 w-8 text-white" />
          </div>
          <h2 className="font-display text-4xl font-bold text-white md:text-5xl">
            Start learning your way
          </h2>
          <p className="mt-4 text-lg text-white/70">
            Join students and teachers already using LearnNova to make education accessible for everyone.
          </p>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setRoleModal(true)}
            className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-white px-10 py-4 text-base font-bold text-violet-800 shadow-2xl shadow-violet-900/40 animate-pulse-glow transition-all"
          >
            Get Started Free <ArrowRight className="h-4 w-4" />
          </motion.button>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          ROLE PICKER MODAL
      ══════════════════════════════════════════════════ */}
      <AnimatePresence>
        {roleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRoleModal(false)}
            />
            <motion.div
              className="relative z-10 w-full max-w-lg"
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <div className="glass-strong rounded-3xl border border-white/70 p-8 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-display text-2xl font-bold text-gray-900">Join LearnNova</h3>
                    <p className="text-gray-500 text-sm mt-1">How will you use the platform?</p>
                  </div>
                  <button
                    onClick={() => setRoleModal(false)}
                    className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Teacher */}
                  <motion.button
                    whileHover={{ y: -3 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => pickRole("teacher")}
                    className="group relative overflow-hidden rounded-2xl border-2 border-transparent bg-gradient-to-br from-violet-50 to-fuchsia-50 p-6 text-left transition-all hover:border-violet-300 hover:shadow-lg hover:shadow-violet-100"
                  >
                    <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-500 shadow-lg">
                      <GraduationCap className="h-6 w-6 text-white" />
                    </div>
                    <h4 className="font-display font-bold text-gray-900 mb-1">Teacher</h4>
                    <p className="text-xs text-gray-500">Upload lessons, manage classrooms & students</p>
                    <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-violet-600">
                      Get started <ArrowRight className="h-3 w-3" />
                    </div>
                    <div className="absolute -bottom-6 -right-6 h-20 w-20 rounded-full bg-violet-200/40 group-hover:bg-violet-300/40 transition-colors" />
                  </motion.button>

                  {/* Student */}
                  <motion.button
                    whileHover={{ y: -3 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => pickRole("student")}
                    className="group relative overflow-hidden rounded-2xl border-2 border-transparent bg-gradient-to-br from-blue-50 to-cyan-50 p-6 text-left transition-all hover:border-blue-300 hover:shadow-lg hover:shadow-blue-100"
                  >
                    <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 shadow-lg">
                      <Users className="h-6 w-6 text-white" />
                    </div>
                    <h4 className="font-display font-bold text-gray-900 mb-1">Student</h4>
                    <p className="text-xs text-gray-500">Get personalized lessons for your learning style</p>
                    <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-blue-600">
                      Get started <ArrowRight className="h-3 w-3" />
                    </div>
                    <div className="absolute -bottom-6 -right-6 h-20 w-20 rounded-full bg-blue-200/40 group-hover:bg-blue-300/40 transition-colors" />
                  </motion.button>
                </div>

                <p className="mt-6 text-center text-xs text-gray-400">
                  Free forever · No credit card required · Setup in 60 seconds
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
