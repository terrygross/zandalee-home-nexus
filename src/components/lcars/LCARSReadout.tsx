
import React from "react";
import { cn } from "@/lib/utils";

interface LCARSReadoutProps {
  label: string;
  value: string | number;
  status?: "normal" | "success" | "warning" | "error";
  className?: string;
}

const LCARSReadout: React.FC<LCARSReadoutProps> = ({ 
  label, 
  value, 
  status = "normal", 
  className 
}) => {
  const statusColors = {
    normal: "text-white",
    success: "text-lcars-teal",
    warning: "text-lcars-amber", 
    error: "text-lcars-red"
  };

  return (
    <div className={cn("space-y-1", className)}>
      <div className="text-xs font-lcars-sans uppercase tracking-wider text-lcars-light-gray">
        {label}
      </div>
      <div className={cn(
        "font-lcars-mono text-sm font-bold tracking-wider",
        statusColors[status]
      )}>
        {value}
      </div>
    </div>
  );
};

export default LCARSReadout;
