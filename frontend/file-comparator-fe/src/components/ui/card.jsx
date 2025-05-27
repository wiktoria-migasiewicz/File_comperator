import React from "react";
import { cn } from "../lib/utils";

export const Card = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("rounded-2xl border bg-white shadow", className)} {...props} />
));
Card.displayName = "Card";

export const CardHeader  = ({ className, ...p }) => <div className={cn("border-b p-6", className)} {...p} />;
export const CardTitle   = ({ className, ...p }) => <h3  className={cn("text-lg font-semibold", className)} {...p} />;
export const CardContent = ({ className, ...p }) => <div className={cn("p-6", className)} {...p} />;
export const CardFooter  = ({ className, ...p }) => <div className={cn("border-t p-6", className)} {...p} />;
