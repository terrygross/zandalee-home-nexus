
import React from "react";
import { cn } from "@/lib/utils";
import { Button, ButtonProps } from "@/components/ui/button";

interface LCARSPillButtonProps extends ButtonProps {
  color?: "orange" | "blue" | "red" | "amber" | "teal" | "violet";
  notch?: "left" | "right" | "none";
  tag?: string;
}

const LCARSPillButton: React.FC<LCARSPillButtonProps> = ({ 
  children, 
  className, 
  color = "orange", 
  notch = "none",
  tag,
  ...props 
}) => {
  const colorClasses = {
    orange: "bg-lcars-orange hover:bg-lcars-peach text-black",
    blue: "bg-lcars-blue hover:bg-lcars-sky text-black",
    red: "bg-lcars-red hover:bg-lcars-rose text-white",
    amber: "bg-lcars-amber hover:bg-lcars-golden text-black",
    teal: "bg-lcars-teal hover:bg-lcars-mint text-black",
    violet: "bg-lcars-violet hover:bg-lcars-purple text-white"
  };

  const getNotchClasses = () => {
    switch (notch) {
      case "left":
        return "rounded-l-none rounded-r-full";
      case "right":
        return "rounded-l-full rounded-r-none";
      default:
        return "rounded-full";
    }
  };

  return (
    <Button
      className={cn(
        "h-12 px-6 font-lcars-sans font-bold uppercase tracking-wider text-sm border-2 border-transparent transition-all duration-200 relative",
        colorClasses[color],
        getNotchClasses(),
        "hover:scale-105 active:scale-95",
        className
      )}
      {...props}
    >
      <span className="flex items-center w-full">
        {children}
        {tag && (
          <span className="ml-2 px-2 py-1 bg-black/20 rounded text-xs font-lcars-mono">
            {tag}
          </span>
        )}
      </span>
    </Button>
  );
};

export default LCARSPillButton;
