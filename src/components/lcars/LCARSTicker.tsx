
import React from "react";
import { cn } from "@/lib/utils";

const LCARSTicker: React.FC = () => {
  const now = new Date();
  const timeString = now.toLocaleTimeString();
  const dateString = now.toLocaleDateString();

  return (
    <div className="h-12 bg-lcars-orange flex items-center px-4 text-black font-bold">
      {/* Left Section - Status */}
      <div className="flex items-center space-x-4">
        <div className="w-8 h-8 bg-lcars-black rounded-full flex items-center justify-center">
          <div className="w-4 h-4 bg-lcars-orange rounded-full" />
        </div>
        <span className="font-lcars-mono text-sm tracking-wider">LCARS READY</span>
      </div>
      
      {/* Center Section - Marquee */}
      <div className="flex-1 mx-8 overflow-hidden">
        <div className="animate-marquee whitespace-nowrap font-lcars-mono text-sm">
          FAMILY DESKTOP AI SYSTEM • VOICE RECOGNITION ACTIVE • MEMORY BANKS ONLINE • CHAT INTERFACE READY • SCREEN SHARING AVAILABLE • AUDIO CONTROLS ACTIVE
        </div>
      </div>
      
      {/* Right Section - Time */}
      <div className="flex items-center space-x-4 font-lcars-mono text-sm">
        <span>{timeString}</span>
        <div className="w-px h-6 bg-black/30" />
        <span>{dateString}</span>
      </div>
    </div>
  );
};

export default LCARSTicker;
