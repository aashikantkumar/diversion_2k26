/**
 * UploadProgress — shows animated progress bar + status label during upload/transform.
 */

import { ProgressBar } from "../ui";

type UploadState = "idle" | "uploading" | "transforming" | "done" | "error";

interface Props {
    state: UploadState;
    progress: number;
    profileLabel?: string;
}

export default function UploadProgress({ state, progress, profileLabel }: Props) {
    if (state !== "uploading" && state !== "transforming") return null;

    const label =
        state === "uploading"
            ? "Uploading PDF..."
            : profileLabel
                ? `Transforming for your ${profileLabel} profile... ✨`
                : "AI is transforming your lesson into 5 modes... ✨";

    return (
        <div className="space-y-2">
            <ProgressBar current={progress} total={100} />
            <p className="text-sm text-center text-gray-500">{label}</p>
        </div>
    );
}
