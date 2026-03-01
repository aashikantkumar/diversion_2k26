/**
 * UploadCtaBanner — highlighted banner on the student dashboard
 * inviting the student to upload their own PDF.
 * Only shown when the student has a saved neurodiversity profile.
 */

import { useNavigate } from "react-router-dom";
import { Upload, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
    profileLabel: string;
}

export default function UploadCtaBanner({ profileLabel }: Props) {
    const navigate = useNavigate();

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
        >
            <div
                onClick={() => navigate("/upload")}
                className="cursor-pointer flex items-center gap-5 rounded-2xl border-2 border-violet-200/60 bg-gradient-to-r from-violet-600 to-fuchsia-500 p-5 shadow-lg shadow-violet-300/25 transition-all duration-200 hover:from-violet-500 hover:to-fuchsia-400 hover:shadow-violet-300/40 hover:-translate-y-0.5"
            >
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                    <Upload className="h-7 w-7 text-white" />
                </div>
                <div className="flex-1">
                    <p className="font-semibold text-white">Upload Your Own PDF</p>
                    <p className="text-sm text-white/75 mt-0.5">
                        AI will transform it for your{" "}
                        <span className="font-semibold text-white capitalize">{profileLabel}</span>{" "}
                        learning profile.
                    </p>
                </div>
                <Sparkles className="h-5 w-5 text-white/70 flex-shrink-0" />
            </div>
        </motion.div>
    );
}
