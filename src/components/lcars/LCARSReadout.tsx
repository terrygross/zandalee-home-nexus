
import React from "react";
import { cn } from "@/lib/utils";

interface LCARSReadoutProps {
  label: string;
  value: string | number;
  status?: "normal" | "warning" | "error" | "success" | "orange" | "blue" | "amber" | "teal" | "violet";
  className?: string;
}

const LCARSReadout: React.FC<LCARSReadoutProps> = ({
  label,
  value,
  status = "normal",
  className
}) => {
  const statusColors = {
    normal: "text-lcars-peach",
    warning: "text-lcars-amber",
    error: "text-lcars-red", 
    success: "text-lcars-teal",
    orange: "text-lcars-orange",
    blue: "text-lcars-blue",
    amber: "text-lcars-amber",
    teal: "text-lcars-teal",
    violet: "text-lcars-violet"
  };

  return (
    <div className={cn("flex flex-col", className)}>
      {label && (
        <div className="text-xs uppercase tracking-widest text-lcars-light-gray font-bold font-lcars-sans mb-1">
          {label}
        </div>
      )}
      <div className={cn(
        "font-lcars-mono text-sm font-bold tracking-wider",
        statusColors[status]
      )}
      style={{ textShadow: `0 0 8px currentColor` }}
      >
        {value}
      </div>
    </div>
  );
};

export default LCARSReadout;
