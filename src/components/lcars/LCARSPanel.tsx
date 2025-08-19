
import React from "react";
import { cn } from "@/lib/utils";

interface LCARSPanelProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  color?: "orange" | "blue" | "red" | "amber" | "teal";
  corner?: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "none";
}

const LCARSPanel: React.FC<LCARSPanelProps> = ({ 
  children, 
  className, 
  title,
  color = "orange",
  corner = "none" 
}) => {
  const colorClasses = {
    orange: "border-lcars-orange",
    blue: "border-lcars-blue", 
    red: "border-lcars-red",
    amber: "border-lcars-amber",
    teal: "border-lcars-teal"
  };

  return (
    <div 
      className={cn(
        "bg-lcars-dark-gray/30 border-2 rounded-lg backdrop-blur-none relative overflow-hidden",
        colorClasses[color],
        className
      )}
      style={{
        background: `linear-gradient(145deg, 
          hsl(var(--lcars-dark-gray) / 0.4), 
          hsl(var(--lcars-medium-gray) / 0.2)
        )`,
        boxShadow: `
          inset 0 0 20px hsl(var(--lcars-${color}) / 0.1),
          0 0 10px hsl(var(--lcars-${color}) / 0.1)
        `
      }}
    >
      {title && (
        <div 
          className={cn(
            "px-4 py-2 border-b-2 font-bold uppercase tracking-wider text-sm text-contrast-dark rounded-t-lg overflow-hidden",
            colorClasses[color]
          )}
          style={{
            background: `linear-gradient(90deg, 
              hsl(var(--lcars-${color})) 0%, 
              hsl(var(--lcars-${color}) / 0.8) 30%, 
              transparent 30%
            )`
          }}
        >
          {title}
        </div>
      )}
      <div className="p-4 h-full overflow-hidden">
        {children}
      </div>
    </div>
  );
};

export default LCARSPanel;
