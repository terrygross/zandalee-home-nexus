
import React from "react";
import { cn } from "@/lib/utils";

interface LCARSTickerProps {
  className?: string;
}

const LCARSTicker: React.FC<LCARSTickerProps> = ({ className }) => {
  const currentTime = new Date();
  const stardate = `${currentTime.getFullYear()}.${String(currentTime.getMonth() + 1).padStart(2, '0')}.${String(currentTime.getDate()).padStart(2, '0')}`;

  return (
    <div className={cn("h-12 bg-lcars-orange flex items-center px-6", className)}>
      {/* Left - LCARS Status */}
      <div className="flex items-center space-x-4">
        <div className="w-8 h-8 bg-lcars-black rounded-full flex items-center justify-center">
          <div className="w-4 h-4 bg-lcars-orange rounded-full" />
        </div>
        <span className="font-lcars-sans font-bold text-black text-sm uppercase tracking-wider">
          LCARS READY
        </span>
      </div>
      
      {/* Center - Scrolling Ticker */}
      <div className="flex-1 mx-8 overflow-hidden">
        <div className="animate-marquee whitespace-nowrap font-lcars-mono text-black text-sm font-bold uppercase tracking-wider">
          LIBRARY COMPUTER ACCESS AND RETRIEVAL SYSTEM • STARFLEET COMMAND • ALL SYSTEMS NOMINAL • VOICE INTERFACE ACTIVE • MEMORY CORE ONLINE •
        </div>
      </div>
      
      {/* Right - Time and Date */}
      <div className="flex items-center space-x-6 text-black font-lcars-mono text-sm font-bold">
        <span>STARDATE {stardate}</span>
        <span>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    </div>
  );
};

export default LCARSTicker;
