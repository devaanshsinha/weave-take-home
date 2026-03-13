import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

const badgeVariants = {
  coral: "bg-[#ff7a59]",
  mint: "bg-[#74d3ae]",
  yellow: "bg-[#ffd84d]",
  blue: "bg-[#77aaff]",
  pink: "bg-[#f4a6ff]",
  black: "bg-black text-white",
} as const;

interface BadgeProps extends ComponentPropsWithoutRef<"span"> {
  variant?: keyof typeof badgeVariants;
}

export function Badge({
  className,
  variant = "mint",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border-2 border-black px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-black",
        badgeVariants[variant],
        className,
      )}
      {...props}
    />
  );
}
