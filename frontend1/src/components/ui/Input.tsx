import { cn } from "../../lib/utils";
import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export default function Input({
  label,
  error,
  hint,
  className,
  id,
  ...props
}: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          "w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/6 text-gray-900 dark:text-gray-100 px-4 py-2.5 text-sm shadow-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all",
          "focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/25",
          "disabled:bg-gray-50 dark:disabled:bg-white/4 disabled:text-gray-400 disabled:cursor-not-allowed",
          error && "border-red-400 focus:border-red-400 focus:ring-red-400/25",
          className
        )}
        {...props}
      />
      {hint && !error && <p className="text-xs text-gray-400 dark:text-gray-500">{hint}</p>}
      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
    </div>
  );
}

