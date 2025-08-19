
import React from "react";
import { cn } from "@/lib/utils";
import { User } from "lucide-react";
import AvatarPanel from "@/components/AvatarPanel";

interface LCARSSidebarProps {
  className?: string;
}

const LCARSSidebar: React.FC<LCARSSidebarProps> = ({ className }) => {
  return (
    <div className={cn("h-full bg-lcars-black flex flex-col overflow-hidden", className)}>
      {/* ZANDALEE Avatar Display - LCARS Style */}
      <div className="flex-shrink-0 mb-4">
        <div 
          className="w-full h-60 bg-lcars-black rounded-lg border-2 border-lcars-orange flex items-center justify-center relative overflow-hidden"
          style={{
            background: `linear-gradient(145deg, 
              hsl(var(--lcars-dark-gray) / 0.4), 
              hsl(var(--lcars-medium-gray) / 0.2)
            )`,
            boxShadow: `
              inset 0 0 20px hsl(var(--lcars-orange) / 0.1),
              0 0 10px hsl(var(--lcars-orange) / 0.1)
            `
          }}
        >
          <User className="w-16 h-16 text-lcars-orange/60" />
          <div className="absolute top-2 right-2 w-2 h-2 bg-lcars-teal rounded-full animate-pulse" />
          <div 
            className="absolute top-0 left-0 right-0 px-4 py-2 border-b-2 border-lcars-orange font-bold uppercase tracking-wider text-sm text-white rounded-t-lg overflow-hidden"
            style={{
              background: `linear-gradient(90deg, 
                hsl(var(--lcars-orange)) 0%, 
                hsl(var(--lcars-orange) / 0.8) 30%, 
                transparent 30%
              )`
            }}
          >
            ZANDALEE
          </div>
        </div>
      </div>
      
      {/* Avatar Status Panel - Direct, no wrapper */}
      <div className="flex-1 overflow-hidden">
        <AvatarPanel />
      </div>
    </div>
  );
};

export default LCARSSidebar;
