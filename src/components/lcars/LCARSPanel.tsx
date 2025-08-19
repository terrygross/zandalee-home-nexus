
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

  const getCornerStyles = () => {
    switch (corner) {
      case "top-left":
        return "rounded-tl-3xl rounded-tr-lg rounded-bl-lg rounded-br-lg";
      case "top-right":
        return "rounded-tl-lg rounded-tr-3xl rounded-bl-lg rounded-br-lg";
      case "bottom-left":
        return "rounded-tl-lg rounded-tr-lg rounded-bl-3xl rounded-br-lg";
      case "bottom-right":
        return "rounded-tl-lg rounded-tr-lg rounded-bl-lg rounded-br-3xl";
      default:
        return "rounded-2xl";
    }
  };

  return (
    <div 
      className={cn(
        "bg-card border-2 backdrop-blur-none relative",
        colorClasses[color],
        getCornerStyles(),
        className
      )}
      style={{
        background: `linear-gradient(145deg, 
          hsl(var(--lcars-dark-gray)), 
          hsl(var(--lcars-medium-gray) / 0.8)
        )`,
        boxShadow: `
          inset 0 0 20px hsl(var(--lcars-${color}) / 0.1),
          0 0 20px hsl(var(--lcars-${color}) / 0.2)
        `
      }}
    >
      {title && (
        <div 
          className={cn(
            "px-6 py-3 border-b-2 font-bold uppercase tracking-wider text-sm",
            colorClasses[color],
            corner.includes("top") ? "rounded-t-2xl" : ""
          )}
          style={{
            background: `linear-gradient(90deg, 
              hsl(var(--lcars-${color})) 0%, 
              hsl(var(--lcars-${color}) / 0.8) 20%, 
              transparent 20%
            )`,
            color: "black"
          }}
        >
          {title}
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
};

export default LCARSPanel;
