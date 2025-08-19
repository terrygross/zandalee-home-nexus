
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
      {/* Avatar Display Area - Made bigger with proper height class */}
      <div className="p-4 flex-shrink-0">
        <div className="w-full h-60 bg-lcars-black rounded-lg border-2 border-lcars-orange flex items-center justify-center relative overflow-hidden">
          <User className="w-16 h-16 text-lcars-orange/60" />
          <div className="absolute top-2 right-2 w-2 h-2 bg-lcars-teal rounded-full animate-pulse" />
          <div className="absolute bottom-2 left-2 text-xs text-white font-lcars-mono uppercase tracking-wider font-bold">
            ZANDALEE
          </div>
        </div>
      </div>
      
      {/* Avatar Status - No redundant header */}
      <div className="flex-1 px-4 pb-4 overflow-hidden">
        <AvatarPanel />
      </div>
    </div>
  );
};

export default LCARSSidebar;
