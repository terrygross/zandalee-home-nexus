
import React from "react";
import { cn } from "@/lib/utils";
import LCARSPillButton from "./LCARSPillButton";
import { MessageCircle, Brain, Settings, Camera, Mic, Monitor, User } from "lucide-react";

interface LCARSSidebarProps {
  className?: string;
  onSettingsClick?: () => void;
}

const LCARSSidebar: React.FC<LCARSSidebarProps> = ({ className, onSettingsClick }) => {
  const menuItems = [
    { label: "CHAT", icon: MessageCircle, color: "orange" as const, action: () => console.log("Chat clicked") },
    { label: "MEMORY", icon: Brain, color: "blue" as const, action: () => console.log("Memory clicked") },
    { label: "CAMERA", icon: Camera, color: "amber" as const, action: () => console.log("Camera clicked") },
    { label: "AUDIO", icon: Mic, color: "teal" as const, action: () => console.log("Audio clicked") },
    { label: "SCREEN", icon: Monitor, color: "red" as const, action: () => console.log("Screen clicked") },
    { label: "SETTINGS", icon: Settings, color: "violet" as const, action: onSettingsClick },
  ];

  return (
    <div className={cn("h-full bg-lcars-black flex flex-col border-r border-lcars-orange/20 overflow-hidden", className)}>
      {/* Avatar Display Area - More compact */}
      <div className="p-4 flex-shrink-0">
        <div className="w-full aspect-square bg-lcars-dark-gray/50 rounded-lg border-2 border-lcars-orange/30 flex items-center justify-center relative overflow-hidden">
          <User className="w-16 h-16 text-lcars-orange/60" />
          <div className="absolute top-2 right-2 w-2 h-2 bg-lcars-teal rounded-full animate-pulse" />
          <div className="absolute bottom-2 left-2 text-xs text-white font-lcars-mono uppercase tracking-wider font-bold">
            ZANDALEE
          </div>
        </div>
      </div>
      
      {/* Menu Pills - Smaller and more compact */}
      <div className="flex-1 px-3 pb-3 space-y-1 overflow-hidden">
        {menuItems.map((item) => (
          <LCARSPillButton
            key={item.label}
            color={item.color}
            className="w-full justify-start text-contrast-dark hover:text-contrast-dark font-bold h-8 text-xs px-4"
            onClick={item.action}
          >
            <item.icon className="w-3 h-3 mr-2" />
            {item.label}
          </LCARSPillButton>
        ))}
      </div>
    </div>
  );
};

export default LCARSSidebar;
