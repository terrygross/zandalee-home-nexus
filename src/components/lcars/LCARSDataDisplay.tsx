
import React from "react";
import { cn } from "@/lib/utils";

interface LCARSDataDisplayProps {
  label: string;
  value: string | number;
  unit?: string;
  status?: "normal" | "warning" | "error" | "success";
  className?: string;
}

const LCARSDataDisplay: React.FC<LCARSDataDisplayProps> = ({
  label,
  value,
  unit,
  status = "normal",
  className
}) => {
  const statusColors = {
    normal: "text-lcars-peach",
    warning: "text-lcars-amber",
    error: "text-lcars-red", 
    success: "text-lcars-teal"
  };

  return (
    <div className={cn("flex flex-col space-y-1", className)}>
      <div className="text-xs uppercase tracking-widest text-lcars-light-gray font-bold">
        {label}
      </div>
      <div className={cn(
        "lcars-data-display text-2xl font-mono font-bold",
        statusColors[status]
      )}>
        {value}
        {unit && <span className="text-sm ml-1 text-lcars-light-gray">{unit}</span>}
      </div>
    </div>
  );
};

export default LCARSDataDisplay;
