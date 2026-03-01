import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../context/UserContext";
import { Button, Input, NeuroBadge } from "../../components/ui";
import api from "../../lib/api";
import { toast } from "sonner";
import { Sparkles, Brain } from "lucide-react";
import { cn } from "../../lib/utils";
import type { NeuroDivType } from "../../types";
import PdfDropzone from "../../components/upload/PdfDropzone";
import UploadProgress from "../../components/upload/UploadProgress";
import UploadSuccessCard from "../../components/upload/UploadSuccessCard";

type UploadState = "idle" | "uploading" | "transforming" | "done" | "error";

export default function StudentUploadPage() {
    const navigate = useNavigate();
    const { user, primaryNeuro } = useUser();

    const [file, setFile] = useState<File | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const [title, setTitle] = useState("");
    const [subject, setSubject] = useState("");
    const [state, setState] = useState<UploadState>("idle");
    const [progress, setProgress] = useState(0);
    const [lessonId, setLessonId] = useState<string | null>(null);

    const upload = async () => {
        if (!file) return;
        setState("uploading");
        setProgress(10);
        try {
            const formData = new FormData();
            formData.append("pdf", file);
            if (title) formData.append("title", title);
            if (subject) formData.append("subject", subject);
            if (user?.id) formData.append("studentId", user.id);

            setProgress(30);
            setState("transforming");

            const res = await api.post("/api/upload", formData, {
                headers: { "Content-Type": "multipart/form-data" },
                timeout: 120_000,
                onUploadProgress: (e) => {
                    if (e.total) setProgress(10 + Math.round((e.loaded / e.total) * 30));
                },
            });

            setProgress(100);
            setState("done");
            const data = res.data as { id?: string; lesson?: { id?: string } };
            setLessonId(data?.id ?? data?.lesson?.id ?? null);
            toast.success("Lesson transformed for your profile! 🎉");
        } catch (err) {
            setState("error");
            toast.error(err instanceof Error ? err.message : "Upload failed");
        }
    };

    const resetForm = () => {
        setFile(null);
        setTitle("");
        setSubject("");
        setState("idle");
        setProgress(0);
        setLessonId(null);
    };

    const isBusy = state === "uploading" || state === "transforming";

    return (
        <div className="mx-auto max-w-2xl py-8 space-y-6">
            {/* Premium header */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-900 via-violet-800 to-fuchsia-800 p-6 text-white shadow-xl">
                <div className="pointer-events-none absolute -top-8 -right-8 h-40 w-40 rounded-full bg-fuchsia-500/20 blur-2xl" />
                <div className="pointer-events-none absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-violet-400/20 blur-2xl" />
                <div className="relative flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 border border-white/20">
                        <Sparkles className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="font-display text-xl font-bold">Upload Your PDF</h1>
                        <p className="text-sm text-white/60">AI transforms it into 5 personalized learning modes</p>
                    </div>
                </div>
            </div>

            {/* Profile badge */}
            {primaryNeuro && primaryNeuro !== "none" && (
                <div className="flex items-center gap-3 rounded-xl bg-violet-50 border border-violet-100 p-4">
                    <Brain className="h-5 w-5 text-violet-500 flex-shrink-0" />
                    <div className="flex-1">
                        <p className="text-sm font-medium text-violet-800">Your learning profile</p>
                        <p className="text-xs text-violet-500 mt-0.5">
                            Content will be adapted to your {primaryNeuro} profile automatically.
                        </p>
                    </div>
                    <NeuroBadge type={primaryNeuro as NeuroDivType} size="md" />
                </div>
            )}

            {/* Done */}
            {state === "done" && (
                <UploadSuccessCard
                    lessonId={lessonId}
                    profileLabel={primaryNeuro ?? undefined}
                    onViewLesson={(id) => navigate(`/lesson/${id}`)}
                    onDashboard={() => navigate("/dashboard")}
                    onReset={resetForm}
                />
            )}

            {/* Upload form */}
            {state !== "done" && (
                <div className="space-y-5">
                    <PdfDropzone
                        file={file}
                        dragOver={dragOver}
                        onFile={setFile}
                        onClear={() => setFile(null)}
                        onDragChange={setDragOver}
                    />

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                            label="Lesson Title (optional)"
                            placeholder="e.g. Chapter 3: Cell Biology"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                        <Input
                            label="Subject (optional)"
                            placeholder="e.g. Biology"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                        />
                    </div>

                    <UploadProgress state={state} progress={progress} profileLabel={primaryNeuro ?? undefined} />

                    {state === "error" && (
                        <div className={cn("rounded-lg bg-red-50 p-4 text-center text-sm text-red-600")}>
                            Upload failed. Please try again.
                        </div>
                    )}

                    <Button
                        onClick={upload}
                        disabled={!file || isBusy}
                        loading={isBusy}
                        className="w-full"
                        size="lg"
                        icon={<Sparkles className="h-5 w-5" />}
                    >
                        {state === "transforming" ? "Transforming with AI..." : "Upload & Transform for My Profile"}
                    </Button>
                </div>
            )}
        </div>
    );
}
