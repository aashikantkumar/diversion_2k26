/**
 * PdfDropzone — reusable drag-and-drop PDF picker.
 * Used by both teacher UploadLessonPage and student StudentUploadPage.
 */

import { useCallback } from "react";
import { FileText, Upload, X } from "lucide-react";
import { cn } from "../../lib/utils";
import { toast } from "sonner";

interface Props {
    file: File | null;
    dragOver: boolean;
    onFile: (f: File) => void;
    onClear: () => void;
    onDragChange: (over: boolean) => void;
}

export default function PdfDropzone({ file, dragOver, onFile, onClear, onDragChange }: Props) {
    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            onDragChange(false);
            const f = e.dataTransfer.files[0];
            if (f?.type === "application/pdf") {
                onFile(f);
            } else {
                toast.error("Please upload a PDF file");
            }
        },
        [onFile, onDragChange]
    );

    const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f) onFile(f);
    };

    return (
        <div
            onDragOver={(e) => { e.preventDefault(); onDragChange(true); }}
            onDragLeave={() => onDragChange(false)}
            onDrop={handleDrop}
            className={cn(
                "relative rounded-xl border-2 border-dashed p-8 text-center transition-colors",
                dragOver
                    ? "border-violet-400 bg-violet-50"
                    : file
                        ? "border-green-300 bg-green-50"
                        : "border-gray-300 hover:border-gray-400"
            )}
        >
            {file ? (
                <div className="flex items-center justify-center gap-3">
                    <FileText className="h-8 w-8 text-green-600" />
                    <div className="text-left">
                        <p className="font-medium text-gray-900">{file.name}</p>
                        <p className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <button
                        onClick={onClear}
                        className="ml-4 rounded-full p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            ) : (
                <>
                    <Upload className="mx-auto h-10 w-10 text-gray-400 mb-3" />
                    <p className="text-gray-700 font-medium">
                        Drop your PDF here, or{" "}
                        <label className="cursor-pointer text-violet-600 underline hover:text-violet-700">
                            browse
                            <input type="file" accept=".pdf" onChange={handleSelect} className="hidden" />
                        </label>
                    </p>
                    <p className="text-sm text-gray-400 mt-1">PDF files only</p>
                </>
            )}
        </div>
    );
}
