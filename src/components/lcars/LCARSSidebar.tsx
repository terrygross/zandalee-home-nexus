
import React from "react";
import { cn } from "@/lib/utils";
import LCARSPillButton from "./LCARSPillButton";
import { MessageCircle, Brain, Settings, Camera, Mic, Monitor } from "lucide-react";

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

  const railNumbers = ["26", "82", "22", "91", "47", "103"];

  return (
    <div className={cn("w-64 bg-lcars-black flex flex-col h-full", className)}>
      {/* Numeric Rail */}
      <div className="p-4 space-y-2 flex-shrink-0">
        {railNumbers.map((number, index) => (
          <div key={index} className="flex items-center justify-end">
            <span className="font-lcars-mono text-lcars-amber text-2xl font-bold tracking-wider">
              {number}
            </span>
          </div>
        ))}
      </div>
      
      {/* Menu Pills */}
      <div className="flex-1 p-4 space-y-3 overflow-auto">
        {menuItems.map((item) => (
          <LCARSPillButton
            key={item.label}
            color={item.color}
            className="w-full justify-start text-black hover:text-black"
            onClick={item.action}
          >
            <item.icon className="w-4 h-4 mr-3" />
            {item.label}
            <span className="ml-auto font-lcars-mono text-xs">{item.number}</span>
          </LCARSPillButton>
        ))}
      </div>
      
      {/* Bottom Elbow */}
      <div className="h-16 bg-lcars-orange rounded-tr-lcars-elbow flex-shrink-0" />
    </div>
  );
};

export default LCARSSidebar;
