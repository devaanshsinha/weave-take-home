import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

export function Select({
  className,
  ...props
}: ComponentPropsWithoutRef<"select">) {
  return (
    <select
      className={cn(
        "rounded-2xl border-2 border-black bg-white px-3 py-2 text-slate-900 outline-none",
        className,
      )}
      {...props}
    />
  );
}
