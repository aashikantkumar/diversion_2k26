/**
 * LessonCard — clickable lesson tile shown in the student lesson grid.
 */

import { useNavigate } from "react-router-dom";
import { BookOpen, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import type { LessonSummary } from "../../types";

interface Props {
    lesson: LessonSummary;
    index: number;
}

export default function LessonCard({ lesson, index }: Props) {
    const navigate = useNavigate();

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
        >
            <div
                onClick={() => navigate(`/lesson/${lesson.id}`)}
                className="group relative rounded-2xl border border-white/70 bg-white/80 p-5 shadow-sm cursor-pointer overflow-hidden card-hover"
            >
                {/* Gradient blob */}
                <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br from-violet-200 to-fuchsia-200 opacity-0 blur-xl group-hover:opacity-60 transition-opacity duration-300" />

                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 flex-shrink-0 mr-3">
                        <BookOpen className="h-4 w-4 text-violet-600" />
                    </div>
                    <h3 className="flex-1 text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">
                        {lesson.title || "Untitled Lesson"}
                    </h3>
                </div>

                {lesson.subject && (
                    <span className="inline-block rounded-full bg-violet-50 border border-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700 mb-3">
                        {lesson.subject}
                    </span>
                )}

                <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-gray-400">
                        {new Date(lesson.created_at).toLocaleDateString()}
                    </p>
                    <button
                        onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            navigate(`/chat/${lesson.id}`);
                        }}
                        className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium text-violet-600 bg-violet-50 hover:bg-violet-100 transition-colors border border-violet-100"
                        title="Chat about this lesson"
                    >
                        <MessageCircle className="h-3.5 w-3.5" />
                        Chat
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
