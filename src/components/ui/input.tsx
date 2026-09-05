import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(({ className, type, ...props }, ref) => {
  return (
    <input type={type} className={cn("flex h-11 w-full rounded-md border border-border bg-raised px-3 py-2 text-base text-fg shadow-none outline-none placeholder:text-subtle transition-[border-color,box-shadow] duration-quick ease-snappy focus-visible:border-accent/50 focus-visible:ring-2 focus-visible:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-40", className)} ref={ref} {...props} />
  );
});
Input.displayName = "Input";
