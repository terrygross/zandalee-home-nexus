
import React from "react";
import { cn } from "@/lib/utils";
import LCARSPillButton from "./LCARSPillButton";
import { MessageCircle, Brain, Settings, Camera, Mic, Monitor, X } from "lucide-react";

interface LCARSSettingsSidebarProps {
  className?: string;
  isOpen: boolean;
  onClose: () => void;
  onSettingsClick?: () => void;
}

const LCARSSettingsSidebar: React.FC<LCARSSettingsSidebarProps> = ({ 
  className, 
  isOpen, 
  onClose, 
  onSettingsClick 
}) => {
  const menuItems = [
    { label: "CHAT", icon: MessageCircle, color: "orange" as const, action: () => console.log("Chat clicked") },
    { label: "MEMORY", icon: Brain, color: "blue" as const, action: () => console.log("Memory clicked") },
    { label: "CAMERA", icon: Camera, color: "amber" as const, action: () => console.log("Camera clicked") },
    { label: "AUDIO", icon: Mic, color: "teal" as const, action: () => console.log("Audio clicked") },
    { label: "SCREEN", icon: Monitor, color: "red" as const, action: () => console.log("Screen clicked") },
    { label: "SETTINGS", icon: Settings, color: "violet" as const, action: onSettingsClick },
  ];

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div className={cn(
        "fixed top-0 right-0 h-full w-80 bg-lcars-black border-l border-lcars-orange/20 z-50 transform transition-transform duration-300",
        isOpen ? "translate-x-0" : "translate-x-full",
        className
      )}>
        {/* Header */}
        <div className="p-4 border-b border-lcars-orange/20 flex items-center justify-between">
          <span className="font-lcars-sans font-bold text-lcars-orange uppercase tracking-wider">
            NAVIGATION
          </span>
          <button 
            onClick={onClose}
            className="text-lcars-orange hover:text-lcars-peach transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Menu Items */}
        <div className="p-4 space-y-3">
          {menuItems.map((item) => (
            <LCARSPillButton
              key={item.label}
              color={item.color}
              className="w-full justify-start text-contrast-dark hover:text-contrast-dark font-bold h-12 text-sm px-6"
              onClick={() => {
                item.action?.();
                onClose();
              }}
            >
              <item.icon className="w-4 h-4 mr-3" />
              {item.label}
            </LCARSPillButton>
          ))}
        </div>
      </div>
    </>
  );
};

export default LCARSSettingsSidebar;
