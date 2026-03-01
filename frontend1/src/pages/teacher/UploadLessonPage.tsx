import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Input } from "../../components/ui";
import api from "../../lib/api";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { cn } from "../../lib/utils";
import PdfDropzone from "../../components/upload/PdfDropzone";
import UploadProgress from "../../components/upload/UploadProgress";
import UploadSuccessCard from "../../components/upload/UploadSuccessCard";
import type { NeuroDivType } from "../../types";

type UploadState = "idle" | "uploading" | "transforming" | "done" | "error";

// ── Local sub-component: Student targeting dropdown ──────────────────────────
interface StudentOption {
  id: string;
  name: string;
  neurodiversity?: NeuroDivType[];
}

function StudentTargetSelect({
  students,
  value,
  onChange,
}: {
  students: StudentOption[];
  value: string;
  onChange: (id: string) => void;
}) {
  if (students.length === 0) return null;

  const label = (s: StudentOption) => {
    const mode = s.neurodiversity?.[0];
    const tag = !mode || mode === "none" ? "Reg" : mode;
    return `${s.name} (${tag})`;
  };

  return (
    <div className="sm:col-span-2">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Assign to specific student{" "}
        <span className="text-gray-400 font-normal">(optional)</span>
      </label>
      <select
        className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
        value={value}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}
      >
        <option value="">Do not assign (Library only)</option>
        {students.map((s) => (
          <option key={s.id} value={s.id}>{label(s)}</option>
        ))}
      </select>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function UploadLessonPage() {
  const navigate = useNavigate();

  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [state, setState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [students] = useState<StudentOption[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");

  const upload = async () => {
    if (!file) return;
    setState("uploading");
    setProgress(10);
    try {
      const formData = new FormData();
      formData.append("pdf", file);
      if (title) formData.append("title", title);
      if (subject) formData.append("subject", subject);
      if (selectedStudentId) formData.append("studentId", selectedStudentId);

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
      toast.success("Lesson created and transformed! 🎉");
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
    setSelectedStudentId("");
  };

  const isBusy = state === "uploading" || state === "transforming";

  return (
    <div className="mx-auto max-w-2xl py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Upload Lesson</h1>
        <p className="text-gray-500">
          Upload a PDF and AI will transform it into 5 adaptive learning modes.
        </p>
      </div>

      {/* Done */}
      {state === "done" && (
        <UploadSuccessCard
          lessonId={lessonId}
          onViewLesson={(id) => navigate(`/lesson/${id}`)}
          onDashboard={() => navigate("/teacher")}
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
              label="Lesson Title"
              placeholder="e.g. Photosynthesis"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Input
              label="Subject"
              placeholder="e.g. Biology"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
            <StudentTargetSelect
              students={students}
              value={selectedStudentId}
              onChange={setSelectedStudentId}
            />
          </div>

          <UploadProgress state={state} progress={progress} />

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
            {state === "transforming" ? "Transforming with AI..." : "Upload & Transform"}
          </Button>
        </div>
      )}
    </div>
  );
}
