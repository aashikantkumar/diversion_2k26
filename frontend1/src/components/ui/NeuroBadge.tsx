import { cn } from "../../lib/utils";
import { MODE_THEMES } from "../../lib/constants";
import type { NeuroDivType } from "../../types";

interface BadgeProps {
  type: NeuroDivType;
  size?: "sm" | "md";
}

export default function NeuroBadge({ type, size = "sm" }: BadgeProps) {
  if (type === "none") return null;

  const theme = MODE_THEMES[type];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium",
        theme.badge,
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
      )}
    >
      {theme.emoji} {theme.label.split("-")[0]}
    </span>
  );
}
