import React, { createContext, useContext, useState } from "react";
import { cn } from "../lib/utils";

const SheetCtx = createContext();

export const Sheet = ({ children }) => {
  const [open, setOpen] = useState(false);
  return <SheetCtx.Provider value={{ open, setOpen }}>{children}</SheetCtx.Provider>;
};

export const SheetTrigger = ({ children }) => {
  const { setOpen } = useContext(SheetCtx);
  return React.cloneElement(children, { onClick: () => setOpen(true) });
};

export const SheetContent = ({ children, className }) => {
  const { open, setOpen } = useContext(SheetCtx);
  if (!open) return null;
  return (
    <div
      className={cn("fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm", className)}
      onClick={() => setOpen(false)}
    >
      <div
        className="h-full w-80 bg-white shadow-xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};
