
import React from "react";
import { cn } from "@/lib/utils";

interface LCARSTickerProps {
  className?: string;
}

const LCARSTicker: React.FC<LCARSTickerProps> = ({ className }) => {
  const currentTime = new Date();
  const stardate = `${currentTime.getFullYear()}.${String(currentTime.getMonth() + 1).padStart(2, '0')}.${String(currentTime.getDate()).padStart(2, '0')}`;

  return (
    <div className={cn("h-14 bg-lcars-orange flex items-center px-6 border-b-2 border-lcars-orange/80", className)}>
      {/* Left - LCARS Status */}
      <div className="flex items-center space-x-4 flex-shrink-0">
        <div className="w-8 h-8 bg-lcars-black rounded-full flex items-center justify-center border-2 border-lcars-black">
          <div className="w-4 h-4 bg-lcars-orange rounded-full" />
        </div>
        <span className="font-lcars-sans font-bold text-contrast-dark text-sm uppercase tracking-wider">
          LCARS READY
        </span>
      </div>
      
      {/* Center - Spacer (removed scrolling ticker) */}
      <div className="flex-1" />
      
      {/* Right - Time and Date */}
      <div className="flex items-center space-x-6 text-contrast-dark font-lcars-mono text-sm font-bold flex-shrink-0">
        <span>STARDATE {stardate}</span>
        <span>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    </div>
  );
};

export default LCARSTicker;
