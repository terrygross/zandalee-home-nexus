
import React from "react";
import { cn } from "@/lib/utils";
import LCARSTicker from "./LCARSTicker";
import LCARSSidebar from "./LCARSSidebar";
import LCARSRightRail from "./LCARSRightRail";
import LCARSFooterBar from "./LCARSFooterBar";

interface LCARSLayoutProps {
  children: React.ReactNode;
  className?: string;
  onSettingsClick?: () => void;
}

const LCARSLayout: React.FC<LCARSLayoutProps> = ({ children, className, onSettingsClick }) => {
  return (
    <div className={cn("min-h-screen bg-lcars-black font-lcars-sans text-white flex flex-col", className)}>
      {/* Top Ticker */}
      <div className="flex-shrink-0 z-20">
        <LCARSTicker />
      </div>
      
      {/* Main Content Grid */}
      <div className="flex-1 flex min-h-0">
        {/* Left Sidebar */}
        <div className="flex-shrink-0 z-10">
          <LCARSSidebar onSettingsClick={onSettingsClick} />
        </div>
        
        {/* Central Viewport */}
        <main className="flex-1 p-6 min-w-0 relative">
          <div className="h-full bg-lcars-dark-gray/30 rounded-lg border border-lcars-orange/40 p-6 overflow-hidden">
            <div className="h-full overflow-auto">
              {children}
            </div>
          </div>
        </main>
        
        {/* Right Rail */}
        <div className="flex-shrink-0 z-10">
          <LCARSRightRail />
        </div>
      </div>
      
      {/* Bottom Status Bar */}
      <div className="flex-shrink-0 z-20">
        <LCARSFooterBar />
      </div>
    </div>
  );
};

export default LCARSLayout;
