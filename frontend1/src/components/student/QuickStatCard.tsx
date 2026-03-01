/**
 * QuickStatCard — a single metric tile used in the StudentDashboard stats row.
 */

import type { ReactNode } from "react";

interface Props {
    icon: ReactNode;
    iconBg: string;
    value: ReactNode;
    label: string;
    trend?: string;
}

export default function QuickStatCard({ icon, iconBg, value, label, trend }: Props) {
    return (
        <div className="group relative rounded-2xl border border-white/70 bg-white/80 p-5 shadow-sm shadow-gray-100/60 overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
            {/* Subtle gradient blob in corner */}
            <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-violet-100/60 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center gap-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${iconBg} shadow-sm flex-shrink-0`}>
                    {icon}
                </div>
                <div className="min-w-0">
                    <p className="text-2xl font-extrabold text-gray-900 leading-none">{value}</p>
                    <p className="mt-1 text-xs font-medium text-gray-500 truncate">{label}</p>
                    {trend && (
                        <span className="mt-1 inline-block text-xs font-medium text-emerald-600">{trend}</span>
                    )}
                </div>
            </div>
        </div>
    );
}
