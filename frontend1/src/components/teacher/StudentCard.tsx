/**
 * StudentCard — displays a single student row in the classroom list.
 * - Managed students (no Auth0 account) get an inline disability dropdown.
 * - Real students (Auth0-linked) get read-only NeuroBadge tags.
 */

import { Card, NeuroBadge } from "../ui";
import NeuroDiversitySelect from "./NeuroDiversitySelect";
import type { User } from "../../types";
import type { NeuroDivType } from "../../types";

interface Props {
    student: User;
    onUpdateNeuro?: (studentId: string, value: NeuroDivType) => void;
}

/** A student is "managed" (teacher-created, no real Auth0 login) if the mock email starts with "managed_" */
const isManaged = (s: User) => s.email?.startsWith("managed_") ?? false;

export default function StudentCard({ student: s, onUpdateNeuro }: Props) {
    return (
        <Card className="flex items-center justify-between p-4">
            {/* Avatar + name */}
            <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">
                    {(s.name || s.email)?.[0]?.toUpperCase() ?? "?"}
                </div>
                <div>
                    <p className="flex items-center gap-2 font-medium text-gray-900">
                        {s.name ?? "Unnamed"}
                        {isManaged(s) && (
                            <span className="rounded border bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                                Managed
                            </span>
                        )}
                    </p>
                    {!isManaged(s) && (
                        <p className="text-sm text-gray-500">{s.email}</p>
                    )}
                </div>
            </div>

            {/* Disability badge / selector */}
            <div className="flex items-center gap-3">
                {isManaged(s) && onUpdateNeuro ? (
                    <NeuroDiversitySelect
                        value={(s.neurodiversity?.[0] as NeuroDivType) ?? "none"}
                        onChange={(val) => onUpdateNeuro(s.id, val)}
                        size="compact"
                    />
                ) : (
                    <div className="flex gap-1">
                        {s.neurodiversity
                            ?.filter((n) => n !== "none")
                            .map((n) => (
                                <NeuroBadge key={n} type={n as NeuroDivType} />
                            ))}
                        {(!s.neurodiversity?.length || s.neurodiversity[0] === "none") && (
                            <span className="text-xs text-gray-400">Regular</span>
                        )}
                    </div>
                )}
            </div>
        </Card>
    );
}
