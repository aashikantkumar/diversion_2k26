/**
 * UploadSuccessCard — shown after a successful upload.
 * Provides "View Lesson", "Go to Dashboard", "Upload Another" actions.
 */

import { CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button, Card } from "../ui";

interface Props {
    lessonId: string | null;
    profileLabel?: string;
    onViewLesson: (id: string) => void;
    onDashboard: () => void;
    onReset: () => void;
}

export default function UploadSuccessCard({
    lessonId,
    profileLabel,
    onViewLesson,
    onDashboard,
    onReset,
}: Props) {
    return (
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <Card className="text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-green-500 mb-4" />
                <h2 className="text-xl font-bold text-gray-900">Lesson Created!</h2>
                <p className="text-gray-500 mt-2">
                    Your PDF has been transformed
                    {profileLabel ? (
                        <>
                            {" "}for your{" "}
                            <span className="font-medium capitalize">{profileLabel}</span> profile.
                        </>
                    ) : (
                        " into 5 adaptive learning modes."
                    )}
                </p>
                <div className="mt-6 flex flex-wrap gap-3 justify-center">
                    {lessonId && (
                        <Button onClick={() => onViewLesson(lessonId)}>View Lesson</Button>
                    )}
                    <Button variant="outline" onClick={onDashboard}>
                        Go to Dashboard
                    </Button>
                    <Button variant="outline" onClick={onReset}>
                        Upload Another
                    </Button>
                </div>
            </Card>
        </motion.div>
    );
}
