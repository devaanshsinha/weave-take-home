import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

export function Table({
  className,
  ...props
}: ComponentPropsWithoutRef<"table">) {
  return <table className={cn("min-w-full text-left text-sm", className)} {...props} />;
}

export function TableHeader({
  className,
  ...props
}: ComponentPropsWithoutRef<"thead">) {
  return (
    <thead
      className={cn("border-b border-border bg-muted/50 text-muted-foreground", className)}
      {...props}
    />
  );
}

export function TableBody({
  className,
  ...props
}: ComponentPropsWithoutRef<"tbody">) {
  return <tbody className={cn(className)} {...props} />;
}

export function TableRow({
  className,
  ...props
}: ComponentPropsWithoutRef<"tr">) {
  return (
    <tr
      className={cn("border-b border-border/70 transition-colors hover:bg-muted/40", className)}
      {...props}
    />
  );
}

export function TableHead({
  className,
  ...props
}: ComponentPropsWithoutRef<"th">) {
  return (
    <th
      className={cn("px-3 py-3 text-xs font-semibold uppercase tracking-[0.12em]", className)}
      {...props}
    />
  );
}

export function TableCell({
  className,
  ...props
}: ComponentPropsWithoutRef<"td">) {
  return <td className={cn("px-3 py-3", className)} {...props} />;
}
