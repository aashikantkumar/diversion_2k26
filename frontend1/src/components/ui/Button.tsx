import { cn } from "../../lib/utils";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "gradient";
type Size = "sm" | "md" | "lg" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-violet-600 text-white hover:bg-violet-500 shadow-md shadow-violet-400/20 active:bg-violet-700",
  gradient:
    "bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white hover:from-violet-500 hover:to-fuchsia-400 shadow-md shadow-violet-400/25 active:from-violet-700",
  secondary:
    "bg-white dark:bg-white/8 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/12 border border-gray-200 dark:border-white/10 shadow-sm active:bg-gray-100",
  outline:
    "border border-violet-200 dark:border-violet-700/60 bg-white/70 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-900/30 hover:border-violet-300 active:bg-violet-100",
  ghost: "text-gray-600 dark:text-gray-400 hover:bg-gray-100/80 dark:hover:bg-white/8 hover:text-gray-900 dark:hover:text-gray-100 active:bg-gray-200",
  danger:
    "bg-red-500 text-white hover:bg-red-400 shadow-sm shadow-red-400/20 active:bg-red-600",
};

const sizeStyles: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm rounded-xl gap-1.5",
  md: "px-4 py-2 text-sm rounded-xl gap-2",
  lg: "px-6 py-3 text-base rounded-xl gap-2.5 font-semibold",
  icon: "p-2 rounded-xl",
};

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-medium transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 disabled:opacity-50 disabled:cursor-not-allowed",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}
