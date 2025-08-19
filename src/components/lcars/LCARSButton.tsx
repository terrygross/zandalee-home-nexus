
import React from "react";
import { cn } from "@/lib/utils";
import { Button, ButtonProps } from "@/components/ui/button";

interface LCARSButtonProps extends ButtonProps {
  color?: "orange" | "blue" | "red" | "amber" | "teal";
  corner?: "none" | "left" | "right" | "both";
}

const LCARSButton: React.FC<LCARSButtonProps> = ({ 
  children, 
  className, 
  color = "orange", 
  corner = "none",
  ...props 
}) => {
  const colorClasses = {
    orange: "bg-lcars-orange hover:bg-lcars-peach border-lcars-orange text-black",
    blue: "bg-lcars-blue hover:bg-lcars-sky border-lcars-blue text-black",
    red: "bg-lcars-red hover:bg-lcars-rose border-lcars-red text-white",
    amber: "bg-lcars-amber hover:bg-lcars-golden border-lcars-amber text-black",
    teal: "bg-lcars-teal hover:bg-lcars-mint border-lcars-teal text-black"
  };

  const cornerClasses = {
    none: "rounded-full",
    left: "rounded-l-full rounded-r-lg",
    right: "rounded-r-full rounded-l-lg", 
    both: "rounded-full"
  };

  return (
    <Button
      className={cn(
        "lcars-button",
        colorClasses[color],
        cornerClasses[corner],
        "relative overflow-hidden px-6 py-3 text-sm font-bold uppercase tracking-wider border-2 transition-all duration-200",
        "hover:shadow-lg hover:scale-105 active:scale-95",
        className
      )}
      {...props}
    >
      {children}
    </Button>
  );
};

export default LCARSButton;
