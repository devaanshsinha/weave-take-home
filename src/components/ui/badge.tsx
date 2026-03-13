import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

const badgeVariants = {
  coral: "border-primary/20 bg-primary text-primary-foreground",
  mint: "bg-secondary text-secondary-foreground",
  yellow: "bg-accent text-accent-foreground",
  blue: "bg-secondary text-secondary-foreground",
  pink: "bg-muted text-muted-foreground",
  black: "border-primary/20 bg-primary text-primary-foreground",
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
        "inline-flex rounded-full border border-border px-3 py-1 text-xs font-black uppercase tracking-[0.16em]",
        badgeVariants[variant],
        className,
      )}
      {...props}
    />
  );
}
