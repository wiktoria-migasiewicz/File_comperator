import React from "react";
import { cn } from "../lib/utils";

export const Input = React.forwardRef(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";
