import { cn } from "../../lib/utils";
import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
  glass?: boolean;
  gradient?: "violet" | "blue" | "green" | "amber" | "rose";
}

export default function Card({
  children,
  className,
  onClick,
  hover = false,
  glass = false,
  gradient,
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/70 dark:border-white/8 bg-white/80 dark:bg-[oklch(0.16_0.018_265)] p-6 shadow-sm shadow-gray-200/60 dark:shadow-black/20",
        hover && "card-hover cursor-pointer",
        glass && "glass",
        gradient && `card-${gradient}`,
        className
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4", className)}>
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h3 className={cn("text-lg font-semibold text-gray-900 dark:text-gray-100 leading-snug", className)}>
      {children}
    </h3>
  );
}

export function CardDescription({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("text-sm text-gray-500 dark:text-gray-400 mt-1", className)}>
      {children}
    </p>
  );
}
