import React from "react";
import { cn } from "../lib/utils";

const base =
  "inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";

const variants = {
  default:   "bg-rose-500 text-white hover:bg-rose-600 focus-visible:ring-rose-300",
  secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200 focus-visible:ring-gray-400",
  ghost:     "hover:bg-gray-800/10 focus-visible:ring-gray-400",
};

export const Button = React.forwardRef(
  ({ variant = "default", className, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(base, variants[variant], className)}
      {...props}
    />
  )
);
Button.displayName = "Button";
