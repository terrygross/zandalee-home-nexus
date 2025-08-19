
import React, { useState } from "react";
import { cn } from "@/lib/utils";
import LCARSPillButton from "./LCARSPillButton";
import LCARSSystemStatus from "./LCARSSystemStatus";
import { MessageCircle, Brain, Camera, Mic, Monitor, X, Activity } from "lucide-react";

interface LCARSSettingsSidebarProps {
  className?: string;
  isOpen: boolean;
  onClose: () => void;
}

const LCARSSettingsSidebar: React.FC<LCARSSettingsSidebarProps> = ({ 
  className, 
  isOpen, 
  onClose
}) => {
  const [currentView, setCurrentView] = useState<string | null>(null);

  const menuItems = [
    { 
      label: "CHAT", 
      icon: MessageCircle, 
      color: "orange" as const, 
      action: () => {
        console.log("Navigating to Chat interface");
        setCurrentView("chat");
      }
    },
    { 
      label: "MEMORY", 
      icon: Brain, 
      color: "blue" as const, 
      action: () => {
        console.log("Opening Memory Manager");
        setCurrentView("memory");
      }
    },
    { 
      label: "CAMERA", 
      icon: Camera, 
      color: "amber" as const, 
      action: () => {
        console.log("Opening Camera settings");
        setCurrentView("camera");
      }
    },
    { 
      label: "AUDIO", 
      icon: Mic, 
      color: "teal" as const, 
      action: () => {
        console.log("Opening Audio settings");
        setCurrentView("audio");
      }
    },
    { 
      label: "SCREEN", 
      icon: Monitor, 
      color: "red" as const, 
      action: () => {
        console.log("Opening Screen share");
        setCurrentView("screen");
      }
    },
    { 
      label: "SYSTEM STATUS", 
      icon: Activity, 
      color: "violet" as const, 
      action: () => {
        console.log("Opening System Status");
        setCurrentView("system-status");
      }
    },
  ];

  if (!isOpen) return null;

  const handleClose = () => {
    setCurrentView(null);
    onClose();
  };

  const handleBackToMenu = () => {
    setCurrentView(null);
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40"
        onClick={handleClose}
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
            {currentView ? (
              <button 
                onClick={handleBackToMenu}
                className="text-lcars-orange hover:text-lcars-peach transition-colors"
              >
                ← BACK
              </button>
            ) : (
              "NAVIGATION"
            )}
          </span>
          <button 
            onClick={handleClose}
            className="text-lcars-orange hover:text-lcars-peach transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {currentView === "system-status" ? (
            <div className="p-4 h-full">
              <LCARSSystemStatus />
            </div>
          ) : currentView ? (
            <div className="p-4 h-full flex items-center justify-center">
              <div className="text-lcars-light-gray font-lcars-sans text-sm uppercase tracking-wider">
                {currentView.replace("-", " ")} INTERFACE<br />
                <span className="text-xs text-lcars-orange/60">Coming Soon...</span>
              </div>
            </div>
          ) : (
            /* Menu Items */
            <div className="p-4 space-y-3">
              {menuItems.map((item) => (
                <LCARSPillButton
                  key={item.label}
                  color={item.color}
                  className="w-full justify-start text-contrast-dark hover:text-contrast-dark font-bold h-12 text-sm px-6"
                  onClick={item.action}
                >
                  <item.icon className="w-4 h-4 mr-3" />
                  {item.label}
                </LCARSPillButton>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default LCARSSettingsSidebar;
