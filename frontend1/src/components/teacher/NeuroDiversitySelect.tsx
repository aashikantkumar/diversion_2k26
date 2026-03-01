/**
 * NeuroDiversitySelect — reusable dropdown for selecting a single neurodiversity type.
 * Used in AddManagedStudentModal and the inline row editor in OrgDetailPage.
 */

import type { NeuroDivType } from "../../types";

const NEURO_OPTIONS: { value: NeuroDivType; label: string }[] = [
    { value: "none", label: "No specific disability (Simplified Mode)" },
    { value: "adhd", label: "ADHD (Chunked Mode)" },
    { value: "dyslexia", label: "Dyslexia (OpenDyslexic Mode)" },
    { value: "dyscalculia", label: "Dyscalculia" },
];

interface Props {
    value: NeuroDivType;
    onChange: (val: NeuroDivType) => void;
    /** If "compact", renders a smaller select (for inline row use). Defaults to "full". */
    size?: "full" | "compact";
    id?: string;
}

export default function NeuroDiversitySelect({ value, onChange, size = "full", id }: Props) {
    const baseClass =
        size === "compact"
            ? "text-sm rounded border border-gray-300 bg-white py-1 pl-2 pr-7 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            : "mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

    return (
        <select
            id={id}
            className={baseClass}
            value={value}
            onChange={(e) => onChange(e.target.value as NeuroDivType)}
        >
            {NEURO_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                    {opt.label}
                </option>
            ))}
        </select>
    );
}
