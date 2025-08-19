
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
    <div className={cn("min-h-screen bg-lcars-black font-lcars-sans text-lcars-peach flex flex-col overflow-hidden", className)}>
      {/* Top Ticker */}
      <div className="flex-shrink-0">
        <LCARSTicker />
      </div>
      
      {/* Main Content Grid */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Sidebar */}
        <div className="flex-shrink-0">
          <LCARSSidebar onSettingsClick={onSettingsClick} />
        </div>
        
        {/* Central Viewport */}
        <main className="flex-1 p-4 min-w-0 overflow-hidden">
          <div className="h-full bg-lcars-dark-gray/50 rounded-lcars border-2 border-lcars-orange/30 p-4 overflow-hidden">
            <div className="h-full overflow-auto">
              {children}
            </div>
          </div>
        </main>
        
        {/* Right Rail */}
        <div className="flex-shrink-0">
          <LCARSRightRail />
        </div>
      </div>
      
      {/* Bottom Status Bar */}
      <div className="flex-shrink-0">
        <LCARSFooterBar />
      </div>
    </div>
  );
};

export default LCARSLayout;
