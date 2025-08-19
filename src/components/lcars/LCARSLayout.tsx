
import React from "react";
import { cn } from "@/lib/utils";
import LCARSTicker from "./LCARSTicker";
import LCARSSidebar from "./LCARSSidebar";
import LCARSRightRail from "./LCARSRightRail";
import LCARSFooterBar from "./LCARSFooterBar";

interface LCARSLayoutProps {
  children: React.ReactNode;
  className?: string;
}

const LCARSLayout: React.FC<LCARSLayoutProps> = ({ children, className }) => {
  return (
    <div className={cn("min-h-screen bg-lcars-black font-lcars-sans text-lcars-peach flex flex-col", className)}>
      {/* Top Ticker */}
      <LCARSTicker />
      
      {/* Main Content Grid */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <LCARSSidebar />
        
        {/* Central Viewport */}
        <main className="flex-1 p-4 overflow-hidden">
          <div className="h-full bg-lcars-dark-gray/50 rounded-lcars border-2 border-lcars-orange/30 p-4">
            {children}
          </div>
        </main>
        
        {/* Right Rail */}
        <LCARSRightRail />
      </div>
      
      {/* Bottom Status Bar */}
      <LCARSFooterBar />
    </div>
  );
};

export default LCARSLayout;
