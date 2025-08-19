
import React from "react";
import { cn } from "@/lib/utils";

interface LCARSSeparatorProps {
  color?: "orange" | "blue" | "red" | "amber" | "teal";
  className?: string;
}

const LCARSSeparator: React.FC<LCARSSeparatorProps> = ({ 
  color = "orange", 
  className 
}) => {
  return (
    <div 
      className={cn("lcars-separator h-px w-full my-4", className)}
      style={{
        background: `linear-gradient(90deg, 
          transparent 0%, 
          hsl(var(--lcars-${color})) 50%, 
          transparent 100%
        )`
      }}
    />
  );
};

export default LCARSSeparator;
