import { useEffect, useState } from "react";
import { PageSpinner, EmptyState } from "../../components/ui";
import api from "../../lib/api";
import type { LessonSummary } from "../../types";
import { BookOpen, Search } from "lucide-react";
import LessonCard from "../../components/student/LessonCard";
import { motion } from "framer-motion";

export default function StudentLessonsPage() {
    const [lessons, setLessons] = useState<LessonSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        (async () => {
            try {
                const res = await api.get<LessonSummary[]>("/api/lessons");
                const data = Array.isArray(res.data)
                    ? res.data
                    : (res.data as any)?.lessons ?? [];
                setLessons(data);
            } catch {
                // Handle error silently => empty state
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    if (loading) return <PageSpinner text="Loading your lessons..." />;

    const filteredLessons = lessons.filter(l =>
        l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (l.subject && l.subject.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="space-y-6">
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
            >
                <div>
                    <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
                        <BookOpen className="h-6 w-6 text-violet-600" />
                        All Lessons
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Browse and search all your adaptive learning material.
                    </p>
                </div>

                {lessons.length > 0 && (
                    <div className="relative max-w-xs w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search lessons..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white/60 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all shadow-sm"
                        />
                    </div>
                )}
            </motion.div>

            {lessons.length === 0 ? (
                <EmptyState
                    icon={<BookOpen className="h-10 w-10" />}
                    title="No lessons found"
                    description="Your teacher hasn't uploaded any lessons yet. Check back soon!"
                />
            ) : filteredLessons.length === 0 ? (
                <div className="py-20 text-center">
                    <p className="text-gray-500">No lessons match your search.</p>
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredLessons.map((lesson, i) => (
                        <LessonCard key={lesson.id} lesson={lesson} index={i} />
                    ))}
                </div>
            )}
        </div>
    );
}
