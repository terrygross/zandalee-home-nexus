
import React from "react";
import { cn } from "@/lib/utils";

interface LCARSVBarProps {
  value: number;
  color?: "orange" | "blue" | "amber" | "teal" | "red" | "violet";
  height?: number;
  className?: string;
}

const LCARSVBar: React.FC<LCARSVBarProps> = ({
  value,
  color = "orange",
  height = 100,
  className
}) => {
  const colorClasses = {
    orange: "bg-lcars-orange",
    blue: "bg-lcars-blue",
    amber: "bg-lcars-amber",
    teal: "bg-lcars-teal",
    red: "bg-lcars-red",
    violet: "bg-lcars-violet"
  };

  const segments = 10;
  const filledSegments = Math.floor((value / 100) * segments);

  return (
    <div className={cn("flex flex-col-reverse space-y-reverse space-y-1", className)} style={{ height }}>
      {Array.from({ length: segments }).map((_, index) => (
        <div
          key={index}
          className={cn(
            "h-2 w-6 rounded-sm transition-all duration-300",
            index < filledSegments
              ? colorClasses[color]
              : "bg-lcars-dark-gray border border-lcars-medium-gray"
          )}
          style={{
            boxShadow: index < filledSegments ? `0 0 4px hsl(var(--lcars-${color}))` : 'none'
          }}
        />
      ))}
    </div>
  );
};

export default LCARSVBar;
