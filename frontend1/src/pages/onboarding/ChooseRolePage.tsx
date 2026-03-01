import { useNavigate } from "react-router-dom";
import { useUser } from "../../context/UserContext";
import { GraduationCap, Users, ArrowRight, Sparkles } from "lucide-react";
import { toast } from "sonner";
import api from "../../lib/api";
import { useState } from "react";
import { motion } from "framer-motion";

export default function ChooseRolePage() {
  const navigate = useNavigate();
  const { refetchUser } = useUser();
  const [loading, setLoading] = useState<string | null>(null);

  const selectRole = async (role: "teacher" | "student") => {
    setLoading(role);
    try {
      await api.post("/api/auth/onboarding/role", { role });
      if (role === "teacher") {
        await refetchUser();
        toast.success("Welcome, Teacher! 🎓");
        navigate("/teacher", { replace: true });
      } else {
        await refetchUser();
        navigate("/onboarding/neuro", { replace: true });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(null);
    }
  };

  const roles = [
    {
      id: "teacher" as const,
      Icon: GraduationCap,
      label: "I'm a Teacher",
      tagline: "Educator",
      desc: "Upload lessons, create classrooms, and track student progress in real time.",
      perks: ["Upload any PDF lesson", "Create & manage classrooms", "Track student performance"],
      gradient: "from-violet-600 to-fuchsia-500",
      lightGradient: "from-violet-50 via-white to-fuchsia-50",
      hoverBorder: "hover:border-violet-400",
      btnColor: "bg-gradient-to-r from-violet-600 to-fuchsia-500",
      chip: "bg-violet-100 text-violet-700",
    },
    {
      id: "student" as const,
      Icon: Users,
      label: "I'm a Student",
      tagline: "Learner",
      desc: "Take a quick assessment and get lessons adapted to your unique learning style.",
      perks: ["AI-adapted lesson content", "5 neurodiversity modes", "Smart AI tutor chatbot"],
      gradient: "from-blue-500 to-cyan-400",
      lightGradient: "from-blue-50 via-white to-cyan-50",
      hoverBorder: "hover:border-blue-400",
      btnColor: "bg-gradient-to-r from-blue-500 to-cyan-400",
      chip: "bg-blue-100 text-blue-700",
    },
  ];

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-16 overflow-hidden">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 mesh-bg" />
      <div className="pointer-events-none absolute inset-0 dot-grid opacity-40" />
      <div className="pointer-events-none absolute top-1/4 left-1/3 h-64 w-64 rounded-full bg-violet-200/30 blur-3xl" />
      <div className="pointer-events-none absolute bottom-1/4 right-1/4 h-48 w-48 rounded-full bg-fuchsia-200/30 blur-3xl" />

      <div className="relative w-full max-w-3xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="mx-auto mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 shadow-xl shadow-violet-300/40">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <h1 className="font-display text-4xl font-bold text-gray-900 md:text-5xl">
            Welcome to{" "}
            <span className="bg-gradient-to-r from-violet-600 to-fuchsia-500 bg-clip-text text-transparent">
              LearnNova
            </span>
          </h1>
          <p className="mt-3 text-gray-500 text-lg">How will you be using the platform?</p>
        </motion.div>

        {/* Role Cards */}
        <div className="grid gap-5 sm:grid-cols-2">
          {roles.map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.12 }}
              onClick={() => !loading && selectRole(r.id)}
              className={`group relative cursor-pointer overflow-hidden rounded-3xl border-2 border-transparent bg-gradient-to-br ${r.lightGradient} p-7 shadow-sm transition-all duration-300 ${r.hoverBorder} hover:-translate-y-1.5 hover:shadow-xl ${loading && "pointer-events-none opacity-70"}`}
            >
              {/* Decorative orb */}
              <div className={`absolute -top-8 -right-8 h-32 w-32 rounded-full bg-gradient-to-br ${r.gradient} opacity-10 group-hover:opacity-20 transition-opacity`} />

              {/* Tagline chip */}
              <span className={`chip mb-4 ${r.chip}`}>{r.tagline}</span>

              {/* Icon */}
              <div className={`mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${r.gradient} shadow-lg`}>
                <r.Icon className="h-7 w-7 text-white" />
              </div>

              <h2 className="font-display text-xl font-bold text-gray-900 mb-2">{r.label}</h2>
              <p className="text-sm text-gray-500 leading-relaxed mb-5">{r.desc}</p>

              {/* Perks */}
              <ul className="space-y-2 mb-6">
                {r.perks.map((perk) => (
                  <li key={perk} className="flex items-center gap-2 text-xs font-medium text-gray-600">
                    <div className={`h-4 w-4 rounded-full bg-gradient-to-br ${r.gradient} flex items-center justify-center flex-shrink-0`}>
                      <svg className="h-2 w-2 text-white" viewBox="0 0 8 8" fill="none">
                        <path d="M1.5 4L3 5.5L6.5 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    {perk}
                  </li>
                ))}
              </ul>

              {/* Button */}
              <button
                onClick={(e) => { e.stopPropagation(); selectRole(r.id); }}
                className={`w-full flex items-center justify-center gap-2 rounded-2xl ${r.btnColor} py-3 text-sm font-bold text-white shadow-md transition-all group-hover:shadow-lg`}
              >
                {loading === r.id ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Setting up...
                  </span>
                ) : (
                  <>Continue as {r.tagline} <ArrowRight className="h-4 w-4" /></>
                )}
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
