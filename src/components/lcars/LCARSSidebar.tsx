
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
    { label: "CHAT", icon: MessageCircle, color: "orange" as const, number: "01", action: () => console.log("Chat clicked") },
    { label: "MEMORY", icon: Brain, color: "blue" as const, number: "02", action: () => console.log("Memory clicked") },
    { label: "CAMERA", icon: Camera, color: "amber" as const, number: "03", action: () => console.log("Camera clicked") },
    { label: "AUDIO", icon: Mic, color: "teal" as const, number: "04", action: () => console.log("Audio clicked") },
    { label: "SCREEN", icon: Monitor, color: "red" as const, number: "05", action: () => console.log("Screen clicked") },
    { label: "SETTINGS", icon: Settings, color: "violet" as const, number: "06", action: onSettingsClick },
  ];

  return (
    <div className={cn("h-full bg-lcars-black flex flex-col border-r border-lcars-orange/20 overflow-hidden", className)}>
      {/* Avatar Display Area - Larger and more prominent */}
      <div className="p-6 flex-shrink-0">
        <div className="w-full aspect-square bg-lcars-dark-gray/50 rounded-lg border-2 border-lcars-orange/30 flex items-center justify-center relative overflow-hidden">
          <User className="w-20 h-20 text-lcars-orange/60" />
          <div className="absolute top-3 right-3 w-3 h-3 bg-lcars-teal rounded-full animate-pulse" />
          <div className="absolute bottom-3 left-3 text-sm text-white font-lcars-mono uppercase tracking-wider font-bold">
            ZANDALEE
          </div>
        </div>
      </div>
      
      {/* Menu Pills */}
      <div className="flex-1 px-4 pb-4 space-y-2 overflow-auto">
        {menuItems.map((item) => (
          <LCARSPillButton
            key={item.label}
            color={item.color}
            className="w-full justify-start text-contrast-dark hover:text-contrast-dark font-bold"
            onClick={item.action}
          >
            <item.icon className="w-4 h-4 mr-3" />
            {item.label}
            <span className="ml-auto font-lcars-mono text-xs">{item.number}</span>
          </LCARSPillButton>
        ))}
      </div>
    </div>
  );
};

export default LCARSSidebar;
