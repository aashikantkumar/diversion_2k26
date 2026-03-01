import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../context/UserContext";
import {
  Button,
  EmptyState,
  PageSpinner,
} from "../../components/ui";
import api from "../../lib/api";
import type { Organization, LessonSummary } from "../../types";
import {
  Plus,
  Upload,
  Users,
  BookOpen,
  Building2,
  ChevronRight,
  GraduationCap,
} from "lucide-react";
import { motion, type Variants } from "framer-motion";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.07, duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

export default function TeacherDashboard() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [lessons, setLessons] = useState<LessonSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [orgRes, lessonRes] = await Promise.all([
          api.get("/api/auth/org/my"),
          api.get("/api/lessons"),
        ]);
        // Backend returns { orgs: [...] }
        const orgData = (orgRes.data as any)?.orgs ?? [];
        const lessonData = Array.isArray(lessonRes.data)
          ? lessonRes.data
          : (lessonRes.data as any)?.lessons ?? [];
        setOrgs(Array.isArray(orgData) ? orgData : []);
        setLessons(Array.isArray(lessonData) ? lessonData : []);
      } catch {
        // Silent fail
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <PageSpinner text="Loading dashboard..." />;

  const totalStudents = orgs.reduce((s, o) => s + (o.student_count || 0), 0);

  return (
    <div className="space-y-8">

      {/* ── Header Banner ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-900 via-indigo-800 to-violet-800 px-7 py-8 shadow-xl shadow-violet-400/20"
      >
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-violet-400/20 blur-3xl pointer-events-none" />
        <div className="absolute -left-8 -bottom-10 h-48 w-48 rounded-full bg-violet-300/15 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <p className="text-sm font-medium text-violet-300">Teacher Dashboard</p>
            </div>
            <h1 className="text-2xl font-extrabold text-white">
              Welcome, {user?.name || "Teacher"} 🎓
            </h1>
            <p className="text-sm text-violet-300 mt-1.5">
              Manage your classrooms and upload adaptive lessons.
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Button
              className="bg-white/15 border border-white/25 text-white hover:bg-white/25 backdrop-blur-sm"
              icon={<Plus className="h-4 w-4" />}
              onClick={() => navigate("/teacher/org/new")}
            >
              New Classroom
            </Button>
            <button
              onClick={() => navigate("/teacher/upload")}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-violet-700 shadow-md hover:bg-violet-50 transition-all"
            >
              <Upload className="h-4 w-4" />
              Upload Lesson
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── Stats ── */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { icon: Building2, iconBg: "bg-violet-100", iconColor: "text-violet-600", value: orgs.length, label: "Classrooms" },
          { icon: BookOpen,   iconBg: "bg-emerald-100", iconColor: "text-emerald-600", value: lessons.length, label: "Lessons"    },
          { icon: Users,      iconBg: "bg-fuchsia-100", iconColor: "text-fuchsia-600", value: totalStudents,  label: "Students"   },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            custom={i}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="group relative overflow-hidden rounded-2xl border border-white/70 bg-white/80 p-5 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-200"
          >
            <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-violet-50 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center gap-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${s.iconBg} flex-shrink-0 shadow-sm`}>
                <s.icon className={`h-6 w-6 ${s.iconColor}`} />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-gray-900 leading-none">{s.value}</p>
                <p className="mt-1 text-xs font-medium text-gray-500">{s.label}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Classrooms ── */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">My Classrooms</h2>
          <button
            onClick={() => navigate("/teacher/org/new")}
            className="flex items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-100 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            New
          </button>
        </div>

        {orgs.length === 0 ? (
          <EmptyState
            icon={<Building2 className="h-10 w-10" />}
            title="No classrooms yet"
            description="Create a classroom to start inviting students."
            action={
              <Button
                icon={<Plus className="h-4 w-4" />}
                onClick={() => navigate("/teacher/org/new")}
              >
                Create Classroom
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {orgs.map((org, i) => (
              <motion.div
                key={org.id}
                custom={i}
                initial="hidden"
                animate="visible"
                variants={fadeUp}
              >
                <div
                  onClick={() => navigate(`/teacher/org/${org.id}`)}
                  className="group relative cursor-pointer overflow-hidden rounded-2xl border border-white/70 bg-white/80 p-5 shadow-sm card-hover"
                >
                  <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-violet-100 to-violet-100 opacity-0 blur-xl group-hover:opacity-80 transition-opacity duration-300" />

                  <div className="relative flex items-start justify-between mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-violet-500 shadow-sm shadow-violet-300/30">
                      <Building2 className="h-5 w-5 text-white" />
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-violet-400 transition-colors" />
                  </div>

                  <h3 className="relative font-semibold text-gray-900 leading-snug line-clamp-1">{org.name}</h3>

                  <div className="relative mt-3 flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-violet-400" />
                      {org.student_count || 0} students
                    </span>
                    <span className="text-gray-300">·</span>
                    <span>{new Date(org.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* ── Recent Lessons ── */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">Recent Lessons</h2>
          {lessons.length > 0 && (
            <button
              onClick={() => navigate("/teacher/upload")}
              className="flex items-center gap-1 text-sm font-medium text-violet-600 hover:text-violet-700 transition-colors"
            >
              Upload new <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>

        {lessons.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="h-10 w-10" />}
            title="No lessons uploaded"
            description="Upload a PDF to create adaptive lessons for your students."
            action={
              <Button
                icon={<Upload className="h-4 w-4" />}
                onClick={() => navigate("/teacher/upload")}
              >
                Upload Lesson
              </Button>
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {lessons.slice(0, 8).map((l, i) => (
              <motion.div
                key={l.id}
                custom={i}
                initial="hidden"
                animate="visible"
                variants={fadeUp}
              >
                <div
                  onClick={() => navigate(`/lesson/${l.id}`)}
                  className="group cursor-pointer rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm card-hover"
                >
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-100 flex-shrink-0">
                      <BookOpen className="h-3.5 w-3.5 text-violet-600" />
                    </div>
                    <p className="text-sm font-semibold text-gray-900 line-clamp-1">
                      {l.title || "Untitled"}
                    </p>
                  </div>
                  {l.subject && (
                    <span className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                      {l.subject}
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
